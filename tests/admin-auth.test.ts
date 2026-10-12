import { beforeEach, describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

import { createTestDb } from "./test-db";
import { col, type Db } from "@/server/db/helpers";
import { adminUsers } from "@/server/db/schema";
import { envSchema } from "@/server/config/env";
import { hashPassword, MIN_ADMIN_PASSWORD_LENGTH, passwordStrengthProblem, verifyPassword } from "@/server/lib/password";
import { adminLoginSchema, adminUserInputSchema } from "@/server/modules/admin-users/admin-users.schema";
import { createAdminUser, findAdminUserByEmail, findAdminUserById, verifyAdminCredentials } from "@/server/modules/admin-users/admin-users.service";

const VALID_PASSWORD = "correct-horse-battery";

describe("password hashing", () => {
  it("round-trips a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword(VALID_PASSWORD);
    expect(hash).not.toContain(VALID_PASSWORD); // never stores the plaintext
    expect(await verifyPassword(VALID_PASSWORD, hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    expect(await hashPassword(VALID_PASSWORD)).not.toBe(await hashPassword(VALID_PASSWORD));
  });

  it("fails closed on a malformed stored value instead of throwing", async () => {
    expect(await verifyPassword(VALID_PASSWORD, "not-a-real-hash")).toBe(false);
    expect(await verifyPassword(VALID_PASSWORD, "")).toBe(false);
  });

  it("enforces the minimum password length", () => {
    expect(passwordStrengthProblem("short")).toBeTruthy();
    expect(passwordStrengthProblem("x".repeat(MIN_ADMIN_PASSWORD_LENGTH))).toBeNull();
  });
});

describe("admin auth schemas", () => {
  it("accepts a valid login and lowercases the email", () => {
    const parsed = adminLoginSchema.parse({ email: "Admin@SMASH.international", password: "anything" });
    expect(parsed.email).toBe("admin@smash.international");
  });

  it("rejects a login with an invalid email or empty password", () => {
    expect(adminLoginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(adminLoginSchema.safeParse({ email: "admin@smash.international", password: "" }).success).toBe(false);
  });

  it("login places no length/strength rule on the password (that belongs to account creation)", () => {
    expect(adminLoginSchema.safeParse({ email: "admin@smash.international", password: "x" }).success).toBe(true);
  });

  it("account creation enforces the password-strength rule", () => {
    expect(adminUserInputSchema.safeParse({ email: "admin@smash.international", password: "short" }).success).toBe(false);
    expect(adminUserInputSchema.safeParse({ email: "admin@smash.international", password: VALID_PASSWORD }).success).toBe(true);
  });
});

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

describe("admin_users collection (database)", () => {
  it("is created with its unique email index", async () => {
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    expect(names).toContain("admin_users");
    expect((await col(db, adminUsers).indexes()).map((i) => i.name)).toContain("admin_users_email_uidx");
  });

  it("enforces the role enum at the database level, even bypassing Zod", async () => {
    await expect(col(db, adminUsers).insertOne({ email: "x@smash.international", passwordHash: "a:b", role: "superadmin", isActive: true })).rejects.toThrow();
    await expect(col(db, adminUsers).insertOne({ email: "y@smash.international", passwordHash: "a:b", role: "administrator", isActive: true })).resolves.toBeTruthy();
  });
});

describe("admin-users service", () => {
  it("creates an admin with sensible defaults and never returns the password hash", async () => {
    const admin = await createAdminUser(db, { email: "Admin@SMASH.international", password: VALID_PASSWORD });
    expect(admin.email).toBe("admin@smash.international"); // normalized by the schema
    expect(admin.role).toBe("administrator");
    expect(admin.isActive).toBe(true);
    expect(admin.createdAt).toBeInstanceOf(Date);
    expect("passwordHash" in admin).toBe(false);
    expect(JSON.stringify(admin)).not.toContain(VALID_PASSWORD);
  });

  it("rejects a second account at the same email (unique index), confirming seed-idempotency has a backstop", async () => {
    await createAdminUser(db, { email: "admin@smash.international", password: VALID_PASSWORD });
    await expect(createAdminUser(db, { email: "admin@smash.international", password: "a-different-password" })).rejects.toThrow();
  });

  it("finds an admin by email (case-insensitively, via normalization) and by id", async () => {
    const created = await createAdminUser(db, { email: "admin@smash.international", password: VALID_PASSWORD });
    expect(await findAdminUserByEmail(db, "admin@smash.international")).toMatchObject({ id: created.id });
    expect(await findAdminUserById(db, created.id)).toMatchObject({ email: "admin@smash.international" });
    expect(await findAdminUserByEmail(db, "nobody@smash.international")).toBeNull();
  });

  it("verifies correct credentials and rejects a wrong password, unknown email, or inactive account — all as one undifferentiated null", async () => {
    const created = await createAdminUser(db, { email: "admin@smash.international", password: VALID_PASSWORD });
    const ok = await verifyAdminCredentials(db, "admin@smash.international", VALID_PASSWORD);
    expect(ok).toMatchObject({ id: created.id });

    expect(await verifyAdminCredentials(db, "admin@smash.international", "wrong-password")).toBeNull();
    expect(await verifyAdminCredentials(db, "nobody@smash.international", VALID_PASSWORD)).toBeNull();

    await col(db, adminUsers).updateOne({ _id: created.id as never }, { $set: { isActive: false } });
    expect(await verifyAdminCredentials(db, "admin@smash.international", VALID_PASSWORD)).toBeNull();
  });

  it("idempotent seeding: creating only when absent never duplicates an existing admin", async () => {
    const seedOnce = async () => {
      const existing = await findAdminUserByEmail(db, "admin@smash.international");
      if (existing) return { created: false, admin: existing };
      return { created: true, admin: await createAdminUser(db, { email: "admin@smash.international", password: VALID_PASSWORD }) };
    };
    const first = await seedOnce();
    const second = await seedOnce();
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.admin.id).toBe(first.admin.id);
    expect(await col(db, adminUsers).countDocuments({ email: "admin@smash.international" })).toBe(1);
  });
});

describe("env validation", () => {
  const base = { MONGODB_URI: "mongodb://127.0.0.1:1/none" };
  it("requires ADMIN_SESSION_SECRET to be at least 32 characters when set", () => {
    expect(envSchema.safeParse({ ...base, ADMIN_SESSION_SECRET: "too-short" }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, ADMIN_SESSION_SECRET: "x".repeat(32) }).success).toBe(true);
  });
  it("requires ADMIN_EMAIL and ADMIN_PASSWORD together, never just one", () => {
    expect(envSchema.safeParse({ ...base, ADMIN_EMAIL: "admin@smash.international" }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, ADMIN_PASSWORD: VALID_PASSWORD }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, ADMIN_EMAIL: "admin@smash.international", ADMIN_PASSWORD: VALID_PASSWORD }).success).toBe(true);
  });
  it("rejects an invalid ADMIN_EMAIL or a too-short ADMIN_PASSWORD", () => {
    expect(envSchema.safeParse({ ...base, ADMIN_EMAIL: "not-an-email", ADMIN_PASSWORD: VALID_PASSWORD }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, ADMIN_EMAIL: "admin@smash.international", ADMIN_PASSWORD: "short" }).success).toBe(false);
  });
});
