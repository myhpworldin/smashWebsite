import { beforeEach, describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

import { createTestDb } from "./test-db";
import { col, insertRow, type Db } from "@/server/db/helpers";
import { clientAccounts, services } from "@/server/db/schema";
import { checkClientPassword, clientPasswordProblem } from "@/lib/client-password";
import { generateTemporaryPassword } from "@/lib/generate-password";
import { relativeTime } from "@/lib/client-time";
import { changePasswordSchema, clientLoginSchema, createClientAccountSchema, dashboardInputSchema, verifyEmailSchema } from "@/server/modules/client-accounts/client-accounts.schema";
import {
  VERIFICATION_MAX_ATTEMPTS,
  adminSetTemporaryPassword,
  changeClientPassword,
  clientStage,
  confirmVerificationCode,
  createClientAccount,
  findClientAccountById,
  issueVerificationCode,
  listClientAccounts,
  updateClientAccount,
  verifyClientCredentials,
} from "@/server/modules/client-accounts/client-accounts.service";
import { deriveInsights, findClientDashboard, saveClientDashboard } from "@/server/modules/client-accounts/client-dashboard.service";
import { clientInviteEmail, verificationCodeEmail } from "@/server/email/client-templates";

const TEMP = "Temporary-Pass-123";
const NEW_PASSWORD = "Brand-new-pass9";
const META = { categorySlug: "growth", categoryName: "Growth", title: "Meta Ads" };
const SEO = { categorySlug: "growth", categoryName: "Growth", title: "SEO" };
const NEW_ACCOUNT = { companyName: "Daily Bugle", contactName: "Peter Parker", email: "Peter@Dailybugle.com", phone: "+91 98765 43210", services: [META], temporaryPassword: TEMP, sendInvite: false };

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  // The Services catalogue the chosen services are checked against: one published group with two offerings.
  await insertRow(db, services, { name: "Growth", slug: "growth", shortDescription: "Growth", status: "published", publishedAt: new Date(), deliverables: [{ title: "Meta Ads" }, { title: "SEO" }] }, "Service");
});

const reload = async (id: string) => (await findClientAccountById(db, id))!;
/** Issues a code and confirms it, re-reading the account in between (as the real flow does across two requests). */
const verifyEmail = async (id: string) => {
  const code = await issueVerificationCode(db, await reload(id));
  await confirmVerificationCode(db, await reload(id), code);
};

describe("client password rule", () => {
  it("needs 8 characters and nothing else", () => {
    expect(clientPasswordProblem("short12")).toMatch(/at least 8/);
    expect(clientPasswordProblem("")).toMatch(/at least 8/);
    expect(clientPasswordProblem("abcdefgh")).toBeNull(); // no number required
    expect(clientPasswordProblem("12345678")).toBeNull(); // no letter required
    expect(clientPasswordProblem("        ")).toBeNull(); // no other rule
    expect(checkClientPassword("").every((c) => !c.ok)).toBe(true);
    expect(checkClientPassword("abcdefgh").every((c) => c.ok)).toBe(true);
  });

  it("generates temporary passwords that pass the admin rule and are not repeated", () => {
    const a = generateTemporaryPassword();
    expect(a).toHaveLength(14);
    expect(/[a-z]/i.test(a) && /\d/.test(a)).toBe(true);
    expect(generateTemporaryPassword()).not.toBe(a);
  });
});

describe("client schemas", () => {
  it("lowercases the login email and places no strength rule on a login attempt", () => {
    expect(clientLoginSchema.parse({ email: "Peter@DailyBugle.com", password: "x" }).email).toBe("peter@dailybugle.com");
  });

  it("requires an 8+ character temporary password and a valid email to create an account", () => {
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, temporaryPassword: "short" }).success).toBe(false);
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, temporaryPassword: "eightchr" }).success).toBe(true);
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, email: "nope" }).success).toBe(false);
    expect(createClientAccountSchema.safeParse(NEW_ACCOUNT).success).toBe(true);
  });

  it("requires a valid mobile number (stored without spaces) and at least one service", () => {
    expect(createClientAccountSchema.parse(NEW_ACCOUNT).phone).toBe("+919876543210");
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, phone: "12345" }).success).toBe(false);
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, phone: "" }).success).toBe(false);
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, services: [] }).success).toBe(false);
    expect(createClientAccountSchema.safeParse({ ...NEW_ACCOUNT, services: undefined }).success).toBe(false);
  });

  it("accepts only a 6-digit code", () => {
    expect(verifyEmailSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(verifyEmailSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(verifyEmailSchema.safeParse({ code: "12345a" }).success).toBe(false);
  });

  it("holds the new password to the client rule", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "weak" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "eightchr" }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: NEW_PASSWORD }).success).toBe(true);
  });

  it("rejects negative or fractional figures and unknown platforms in a dashboard", () => {
    const ok = { currency: "INR", leads: 1, calls: 1, adsRunning: 1, totalBudget: 100, amountSpent: 50, impressions: 0, clicks: 0, campaigns: [], monthly: [] };
    expect(dashboardInputSchema.safeParse(ok).success).toBe(true);
    expect(dashboardInputSchema.safeParse({ ...ok, leads: -1 }).success).toBe(false);
    expect(dashboardInputSchema.safeParse({ ...ok, leads: 1.5 }).success).toBe(false);
    expect(dashboardInputSchema.safeParse({ ...ok, campaigns: [{ id: "a", name: "x", platform: "MySpace", status: "ACTIVE", budget: 1, spent: 1, leads: 1, calls: 1 }] }).success).toBe(false);
    expect(dashboardInputSchema.safeParse({ ...ok, extra: 1 }).success).toBe(false);
  });
});

describe("client accounts", () => {
  it("creates an account that starts unverified with a temporary password, and never exposes the hash", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, "admin@smash.international");
    expect(account.email).toBe("peter@dailybugle.com");
    expect(account).toMatchObject({ emailVerified: false, mustResetPassword: true, isActive: true, createdBy: "admin@smash.international" });
    expect(clientStage(account)).toBe("verify");
    expect("passwordHash" in account).toBe(false);
    expect(JSON.stringify(account)).not.toContain(TEMP);
    expect((await col(db, clientAccounts).indexes()).map((i) => i.name)).toContain("client_accounts_email_uidx");
  });

  it("stores the mobile number and the chosen services, using the catalogue's own group name", async () => {
    const account = await createClientAccount(db, { ...NEW_ACCOUNT, services: [META, { ...SEO, categoryName: "Spoofed name" }, META] }, null);
    expect(account.phone).toBe("+919876543210");
    expect(account.services).toEqual([META, SEO]); // de-duplicated, group name from the catalogue
  });

  it("refuses a service the agency does not provide", async () => {
    await expect(createClientAccount(db, { ...NEW_ACCOUNT, services: [{ ...META, title: "Time Travel" }] }, null)).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { services: expect.stringContaining("Time Travel") } });
    await expect(createClientAccount(db, { ...NEW_ACCOUNT, services: [{ ...META, categorySlug: "nope" }] }, null)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("updates the phone and services, keeping a held service the catalogue has since dropped", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const updated = await updateClientAccount(db, account.id, { phone: "98765 11111", services: [META, SEO] });
    expect(updated).toMatchObject({ phone: "9876511111", services: [META, SEO] });
    await col(db, services).updateOne({ slug: "growth" }, { $set: { deliverables: [{ title: "Meta Ads" }] } }); // "SEO" is retired
    const kept = await updateClientAccount(db, account.id, { phone: "+91 90000 00000", services: [META, SEO] });
    expect(kept.services).toEqual([META, SEO]);
    await expect(updateClientAccount(db, account.id, { services: [{ ...SEO, title: "Brand New" }] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses a second account for the same email", async () => {
    await createClientAccount(db, NEW_ACCOUNT, null);
    await expect(createClientAccount(db, { ...NEW_ACCOUNT, email: "peter@dailybugle.com" }, null)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("verifies credentials, and fails the same way for a wrong password, unknown email or disabled account", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", TEMP)).toMatchObject({ id: account.id });
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", "wrong")).toBeNull();
    expect(await verifyClientCredentials(db, "nobody@dailybugle.com", TEMP)).toBeNull();
    await updateClientAccount(db, account.id, { isActive: false });
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", TEMP)).toBeNull();
  });

  it("lists accounts newest first without secrets", async () => {
    await createClientAccount(db, NEW_ACCOUNT, null);
    await createClientAccount(db, { ...NEW_ACCOUNT, email: "b@dailybugle.com", companyName: "Second" }, null);
    const list = await listClientAccounts(db);
    expect(list.map((a) => a.companyName)).toEqual(["Second", "Daily Bugle"]);
    expect(JSON.stringify(list)).not.toMatch(/passwordHash|verificationCodeHash/);
  });
});

describe("email verification", () => {
  it("accepts the right code, verifies the account and clears the code", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const code = await issueVerificationCode(db, await reload(account.id));
    expect(code).toMatch(/^\d{6}$/);
    const stored = await reload(account.id);
    expect(stored.verificationCodeHash).not.toContain(code); // only a hash is kept
    await confirmVerificationCode(db, stored, code);
    const after = await reload(account.id);
    expect(after).toMatchObject({ emailVerified: true, verificationCodeHash: null });
    expect(clientStage(after)).toBe("reset");
  });

  it("counts wrong codes and kills the code after the limit, even for the right code", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const code = await issueVerificationCode(db, await reload(account.id));
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < VERIFICATION_MAX_ATTEMPTS; i++) {
      await expect(confirmVerificationCode(db, await reload(account.id), wrong)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    await expect(confirmVerificationCode(db, await reload(account.id), code)).rejects.toThrow(/too many/i);
    expect((await reload(account.id)).emailVerified).toBe(false);
  });

  it("rejects an expired code", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const code = await issueVerificationCode(db, await reload(account.id), new Date(Date.now() - 11 * 60_000));
    await expect(confirmVerificationCode(db, await reload(account.id), code)).rejects.toThrow(/expired/i);
  });

  it("limits resending to once a minute, and a new code replaces the old one", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const first = await issueVerificationCode(db, await reload(account.id));
    await expect(issueVerificationCode(db, await reload(account.id))).rejects.toMatchObject({ code: "RATE_LIMITED" });
    const later = new Date(Date.now() + 61_000);
    const second = await issueVerificationCode(db, await reload(account.id), later);
    if (second !== first) await expect(confirmVerificationCode(db, await reload(account.id), first, later)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await confirmVerificationCode(db, await reload(account.id), second, later);
    expect((await reload(account.id)).emailVerified).toBe(true);
  });
});

describe("passwords", () => {
  it("lets the client reach the dashboard only after verifying and replacing the temporary password", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    expect(clientStage(await reload(account.id))).toBe("verify");
    await verifyEmail(account.id);
    expect(clientStage(await reload(account.id))).toBe("reset");
    const updated = await changeClientPassword(db, await reload(account.id), TEMP, NEW_PASSWORD);
    expect(clientStage(updated)).toBe("ready");
    expect(updated.passwordChangedAt).toBeInstanceOf(Date);
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", NEW_PASSWORD)).toMatchObject({ id: account.id });
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", TEMP)).toBeNull();
  });

  it("needs the current password, refuses to keep it, and ends older sessions by bumping the version", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const row = await reload(account.id);
    await expect(changeClientPassword(db, row, "not-it", NEW_PASSWORD)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(changeClientPassword(db, row, TEMP, TEMP)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const updated = await changeClientPassword(db, row, TEMP, NEW_PASSWORD);
    expect(updated.sessionVersion).toBe(row.sessionVersion + 1);
  });

  it("an admin reset forces a new password again, keeps the verified email, and ends sessions", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    await verifyEmail(account.id);
    const done = await changeClientPassword(db, await reload(account.id), TEMP, NEW_PASSWORD);
    const reset = await adminSetTemporaryPassword(db, account.id, "Another-Temp-Pass-77");
    expect(reset).toMatchObject({ mustResetPassword: true, emailVerified: true });
    expect(reset.sessionVersion).toBe(done.sessionVersion + 1);
    expect(clientStage(reset)).toBe("reset");
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", NEW_PASSWORD)).toBeNull();
    expect(await verifyClientCredentials(db, "peter@dailybugle.com", "Another-Temp-Pass-77")).toMatchObject({ id: account.id });
  });
});

describe("client dashboard", () => {
  const input = {
    currency: "INR" as const, periodLabel: "October 2026", note: "Nice month.", leads: 120, calls: 45, adsRunning: 6, totalBudget: 100000, amountSpent: 62500, impressions: 200000, clicks: 6000,
    campaigns: [
      { id: "c1", name: "Brand search", platform: "Google Ads", status: "ACTIVE" as const, budget: 50000, spent: 31000, leads: 70, calls: 30 },
      { id: "c2", name: "Retargeting", platform: "Meta Ads", status: "PAUSED" as const, budget: 50000, spent: 31500, leads: 50, calls: 15 },
    ],
    monthly: [{ label: "Sep 2026", leads: 90, calls: 30, spend: 55000 }, { label: "Oct 2026", leads: 120, calls: 45, spend: 62500 }],
  };

  it("has nothing until an admin publishes, then stamps when it was published", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    expect(await findClientDashboard(db, account.id)).toBeNull();
    const before = Date.now();
    const saved = await saveClientDashboard(db, account.id, input, "admin@smash.international");
    expect(saved.dataUpdatedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(saved).toMatchObject({ leads: 120, updatedBy: "admin@smash.international", periodLabel: "October 2026" });
    expect(saved.campaigns).toHaveLength(2);
  });

  it("replaces the whole dashboard on each save and moves the last-updated time forward, but editing the account does not", async () => {
    const account = await createClientAccount(db, NEW_ACCOUNT, null);
    const first = await saveClientDashboard(db, account.id, input, null);
    await new Promise((r) => setTimeout(r, 15));
    await updateClientAccount(db, account.id, { companyName: "Daily Bugle Ltd" });
    expect((await findClientDashboard(db, account.id))!.dataUpdatedAt).toEqual(first.dataUpdatedAt);
    const second = await saveClientDashboard(db, account.id, { ...input, leads: 130, campaigns: [] }, null);
    expect(second.dataUpdatedAt!.getTime()).toBeGreaterThan(first.dataUpdatedAt!.getTime());
    expect(second.leads).toBe(130);
    expect(second.campaigns).toEqual([]);
    expect(second.createdAt).toEqual(first.createdAt);
  });

  it("derives the ratios so an admin never types them", () => {
    const i = deriveInsights({ ...input, campaigns: input.campaigns });
    expect(i.budgetUsedPercent).toBe(63);
    expect(i.remainingBudget).toBe(37500);
    expect(i.costPerLead).toBeCloseTo(520.83, 1);
    expect(i.clickThroughRate).toBeCloseTo(3, 5);
    expect(i.activeCampaigns).toBe(1);
    expect(deriveInsights({ ...input, leads: 0, calls: 0, impressions: 0, totalBudget: 0, campaigns: [] })).toMatchObject({ budgetUsedPercent: 0, costPerLead: null, costPerCall: null, clickThroughRate: null });
  });
});

describe("relative time", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  it("reads naturally at each scale", () => {
    expect(relativeTime(new Date(now.getTime() - 10_000), now)).toBe("just now");
    expect(relativeTime(new Date(now.getTime() - 5 * 60_000), now)).toBe("5 min ago");
    expect(relativeTime(new Date(now.getTime() - 3 * 3600_000), now)).toBe("3 hours ago");
    expect(relativeTime(new Date(now.getTime() - 3600_000), now)).toBe("1 hour ago");
    expect(relativeTime(new Date(now.getTime() - 2 * 86400_000), now)).toBe("2 days ago");
    expect(relativeTime(new Date(now.getTime() - 30 * 86400_000), now)).toMatch(/2026/);
  });
});

describe("client emails", () => {
  const company = { name: "SMASH", siteUrl: "https://smash.international", email: null, phone: null, whatsapp: null, address: null, socials: [] };

  it("puts the code in the subject, body and plain text", () => {
    const mail = verificationCodeEmail(company, { name: "Peter Parker", code: "042517", minutes: 10 });
    expect(mail.subject).toContain("042517");
    expect(mail.html).toContain(">4<");
    expect(mail.text).toContain("042517");
  });

  it("carries the login details in the invite and escapes everything the admin typed", () => {
    const mail = clientInviteEmail(company, { name: "<b>Eve</b>", companyName: "A & B <script>", email: "eve@x.com", temporaryPassword: "Pa55word<>", loginUrl: "https://smash.international/client/login" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<b>Eve</b>");
    expect(mail.html).toContain("Pa55word&lt;&gt;");
    expect(mail.text).toContain("Temporary password: Pa55word<>");
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
