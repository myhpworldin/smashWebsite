import "server-only";
import { col, insertRow, toRow, type Db } from "@/server/db/helpers";
import { adminUsers, type RowOf } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { adminUserInputSchema, type AdminUserInput } from "./admin-users.schema";

export type AdminUserRow = RowOf<"admin_users">;
/** What any caller outside this module is ever allowed to see — `passwordHash` never leaves this file attached to a real admin. */
export type PublicAdminUser = Omit<AdminUserRow, "passwordHash">;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude it from `rest`
export const toPublicAdminUser = ({ passwordHash, ...rest }: AdminUserRow): PublicAdminUser => rest;

export async function findAdminUserByEmail(db: Db, email: string): Promise<AdminUserRow | null> {
  const doc = await col(db, adminUsers).findOne({ email });
  return doc ? (toRow(adminUsers, doc) as AdminUserRow) : null;
}

export async function findAdminUserById(db: Db, id: string): Promise<AdminUserRow | null> {
  const doc = await col(db, adminUsers).findOne({ _id: id as never });
  return doc ? (toRow(adminUsers, doc) as AdminUserRow) : null;
}

/**
 * Creates a new admin account. The caller (`scripts/seed-admin.ts`) is expected to have already
 * checked `findAdminUserByEmail` itself and skipped this call if an account exists — seeding must be
 * idempotent and must never silently overwrite an existing administrator's password (CRM Phase 2
 * brief). The collection's unique `email` index is the last-resort safety net against a write race,
 * not the primary "don't duplicate" mechanism.
 */
export async function createAdminUser(db: Db, input: AdminUserInput): Promise<PublicAdminUser> {
  const { email, password } = adminUserInputSchema.parse(input);
  const passwordHash = await hashPassword(password);
  const row = await insertRow(db, adminUsers, { email, passwordHash }, "Admin user");
  return toPublicAdminUser(row);
}

/** A hash of a password nobody will ever type, computed once and reused — so a login attempt against an
 * email that does not exist still pays the same `scrypt` cost as one that does, and the two cases are not
 * distinguishable by response time (on top of the generic error message already doing this at the message level). */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-used-only-for-constant-time-login"));

/** Returns the authenticated admin, or `null` for any failure reason (unknown email, wrong password, inactive account) — deliberately undifferentiated, so the login controller cannot leak which one it was. */
export async function verifyAdminCredentials(db: Db, email: string, password: string): Promise<PublicAdminUser | null> {
  const admin = await findAdminUserByEmail(db, email);
  const valid = await verifyPassword(password, admin?.passwordHash ?? (await getDummyHash()));
  if (!admin || !admin.isActive || !valid) return null;
  return toPublicAdminUser(admin);
}
