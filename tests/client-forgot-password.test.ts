import { beforeEach, describe, expect, it, vi } from "vitest";

// Nothing in these tests may send real mail: the sender is replaced and every call is inspected.
const sent = vi.hoisted(() => [] as { to: string[]; subject: string; html: string; text: string }[]);
vi.mock("@/server/email/send", () => ({ sendEmail: async (m: { to: string[]; subject: string; html: string; text: string }) => { sent.push(m); return { sent: true }; } }));

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is not used here
process.env.ADMIN_SESSION_SECRET = "test-secret-".padEnd(40, "x"); // the reset code is derived from it

import { createTestDb } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { clientAccounts } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { checkResetCode, findClientAccountByEmail, issueResetCode, resetPasswordWithCode, toPublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import { forgotPasswordController, resetWithCodeController, verifyResetCodeController } from "@/server/api/client-auth.controller";

let db: Db;
const NOW = new Date("2026-10-20T06:00:00Z");
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);
const ctx = (body: unknown) => ({ get db() { return db; }, url: new URL("http://x/api"), params: {}, body });

async function sentCode(now: Date) {
  const issued = await issueResetCode(db, "pat@acme.com", now);
  if (issued.status !== "sent") throw new Error(`expected a code, got ${issued.status}`);
  return issued;
}

beforeEach(async () => {
  sent.length = 0;
  ({ db } = await createTestDb());
  await insertRow(db, clientAccounts, { email: "pat@acme.com", companyName: "Acme", contactName: "Pat Lee", passwordHash: await hashPassword("old-password-1"), services: [] }, "Account");
  await insertRow(db, clientAccounts, { email: "off@acme.com", companyName: "Off", contactName: "Off", passwordHash: await hashPassword("old-password-1"), services: [], isActive: false }, "Account");
});

describe("issueResetCode", () => {
  it("issues a 6-digit code for an active account, storing only a nonce (never the code)", async () => {
    const issued = await issueResetCode(db, "pat@acme.com", NOW);
    if (issued.status !== "sent") throw new Error("expected a code");
    expect(issued.code).toMatch(/^\d{6}$/);
    const row = await findClientAccountByEmail(db, "pat@acme.com");
    expect(issued).toMatchObject({ reused: false, minutesLeft: 10 });
    expect(row?.resetNonce).toBeTruthy();
    expect(JSON.stringify(row)).not.toContain(issued.code); // nothing stored contains the code
    expect(JSON.stringify(toPublicClientAccount(row!))).not.toContain("resetNonce");
  });
  it("reports unknown and disabled accounts, and asks to wait inside a minute", async () => {
    expect(await issueResetCode(db, "nobody@acme.com", NOW)).toEqual({ status: "unknown" });
    expect(await issueResetCode(db, "off@acme.com", NOW)).toEqual({ status: "disabled" });
    expect((await issueResetCode(db, "pat@acme.com", NOW)).status).toBe("sent");
    expect(await issueResetCode(db, "pat@acme.com", later(30))).toEqual({ status: "wait", seconds: 30 });
    expect((await issueResetCode(db, "pat@acme.com", later(61))).status).toBe("sent");
  });
});

describe("resending", () => {
  it("re-sends the same code inside the ten minutes, keeping the expiry and the wrong-guess count", async () => {
    const first = await sentCode(NOW);
    const wrong = first.code === "000000" ? "111111" : "000000";
    await expect(checkResetCode(db, "pat@acme.com", wrong, later(10))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const before = (await findClientAccountByEmail(db, "pat@acme.com"))!;

    const again = await issueResetCode(db, "pat@acme.com", later(5 * 60));
    if (again.status !== "sent") throw new Error("expected a resend");
    expect(again).toMatchObject({ code: first.code, reused: true, minutesLeft: 5 });
    const after = (await findClientAccountByEmail(db, "pat@acme.com"))!;
    expect(after.resetExpiresAt).toEqual(before.resetExpiresAt);
    expect(after.resetAttempts).toBe(1);
    expect(after.resetNonce).toBe(before.resetNonce);
    await checkResetCode(db, "pat@acme.com", first.code, later(5 * 60 + 5)); // the first email's code still works
  });
  it("counts wrong guesses across resends: five in all, then a fresh code", async () => {
    const first = await sentCode(NOW);
    const wrong = first.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++) await expect(checkResetCode(db, "pat@acme.com", wrong, later(5))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await issueResetCode(db, "pat@acme.com", later(70)); // a resend does not give three fresh guesses back
    for (let i = 0; i < 2; i++) await expect(checkResetCode(db, "pat@acme.com", wrong, later(75))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(checkResetCode(db, "pat@acme.com", first.code, later(80))).rejects.toThrow(/Too many incorrect attempts/);

    const fresh = await issueResetCode(db, "pat@acme.com", later(140));
    if (fresh.status !== "sent") throw new Error("expected a fresh code");
    expect(fresh).toMatchObject({ reused: false, minutesLeft: 10 });
    await checkResetCode(db, "pat@acme.com", fresh.code, later(145));
  });
  it("makes a new code once the old one has expired, and the old one stops working", async () => {
    const first = await sentCode(NOW);
    const fresh = await issueResetCode(db, "pat@acme.com", later(11 * 60));
    if (fresh.status !== "sent") throw new Error("expected a fresh code");
    expect(fresh.reused).toBe(false);
    if (fresh.code !== first.code) await expect(checkResetCode(db, "pat@acme.com", first.code, later(11 * 60 + 5))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await checkResetCode(db, "pat@acme.com", fresh.code, later(11 * 60 + 5));
  });
  it("a used code cannot be used again, and the next request starts a new one", async () => {
    const first = await sentCode(NOW);
    await resetPasswordWithCode(db, "pat@acme.com", first.code, "brand-new-pass", later(10));
    await expect(checkResetCode(db, "pat@acme.com", first.code, later(11))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const next = await issueResetCode(db, "pat@acme.com", later(70));
    expect(next).toMatchObject({ status: "sent", reused: false });
  });
});

describe("resetPasswordWithCode", () => {
  it("sets the password, verifies the email, ends old sessions and works only once", async () => {
    const before = await findClientAccountByEmail(db, "pat@acme.com");
    const { code } = await sentCode(NOW);
    await resetPasswordWithCode(db, "pat@acme.com", code, "brand-new-pass", later(120));
    const after = (await findClientAccountByEmail(db, "pat@acme.com"))!;
    expect(await verifyPassword("brand-new-pass", after.passwordHash)).toBe(true);
    expect(await verifyPassword("old-password-1", after.passwordHash)).toBe(false);
    expect(after).toMatchObject({ emailVerified: true, mustResetPassword: false, resetNonce: null });
    expect(after.sessionVersion).toBe(before!.sessionVersion + 1);
    await expect(resetPasswordWithCode(db, "pat@acme.com", code, "another-pass-2", later(130))).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("rejects an expired code, an unknown email and a disabled account with the same message", async () => {
    const { code } = await sentCode(NOW);
    const messages = await Promise.all([
      resetPasswordWithCode(db, "pat@acme.com", code, "brand-new-pass", later(11 * 60)).catch((e) => e.message),
      resetPasswordWithCode(db, "nobody@acme.com", code, "brand-new-pass", later(5)).catch((e) => e.message),
      resetPasswordWithCode(db, "off@acme.com", code, "brand-new-pass", later(5)).catch((e) => e.message),
    ]);
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/not right or has expired/);
  });
  it("counts wrong codes and kills the code after five, even for the right one", async () => {
    const { code } = await sentCode(NOW);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expect(resetPasswordWithCode(db, "pat@acme.com", wrong, "brand-new-pass", later(5))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(resetPasswordWithCode(db, "pat@acme.com", code, "brand-new-pass", later(6))).rejects.toThrow(/Too many incorrect attempts/);
    expect(await verifyPassword("old-password-1", (await findClientAccountByEmail(db, "pat@acme.com"))!.passwordHash)).toBe(true);
  });
  it("will not keep the same password", async () => {
    const { code } = await sentCode(NOW);
    await expect(resetPasswordWithCode(db, "pat@acme.com", code, "old-password-1", later(5))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("checkResetCode", () => {
  it("accepts the right code without using it up, so the password can still be set", async () => {
    const { code } = await sentCode(NOW);
    await checkResetCode(db, "pat@acme.com", code, later(5));
    await checkResetCode(db, "pat@acme.com", code, later(6)); // checking twice is fine
    await resetPasswordWithCode(db, "pat@acme.com", code, "brand-new-pass", later(10));
    expect(await verifyPassword("brand-new-pass", (await findClientAccountByEmail(db, "pat@acme.com"))!.passwordHash)).toBe(true);
  });
  it("counts wrong codes towards the same five-try limit", async () => {
    const { code } = await sentCode(NOW);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expect(checkResetCode(db, "pat@acme.com", wrong, later(5))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(checkResetCode(db, "pat@acme.com", code, later(6))).rejects.toThrow(/Too many incorrect attempts/);
  });
  it("does not change the password: setting one still needs the code", async () => {
    const { code } = await sentCode(NOW);
    const wrong = code === "000000" ? "111111" : "000000";
    await expect(resetPasswordWithCode(db, "pat@acme.com", wrong, "brand-new-pass", later(5))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await verifyPassword("old-password-1", (await findClientAccountByEmail(db, "pat@acme.com"))!.passwordHash)).toBe(true);
  });
});

describe("controllers", () => {
  it("verify answers valid for the emailed code and rejects a wrong one", async () => {
    await forgotPasswordController(ctx({ email: "pat@acme.com" }));
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    const code = /\b(\d{6})\b/.exec(sent[0].text)![1];
    const wrong = code === "000000" ? "111111" : "000000";
    await expect(verifyResetCodeController(ctx({ email: "pat@acme.com", code: wrong }))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await verifyResetCodeController(ctx({ email: "pat@acme.com", code }))).toEqual({ data: { valid: true } });
    await expect(verifyResetCodeController(ctx({ email: "pat@acme.com", code: "12" }))).rejects.toThrow(/6 digits/);
  });
  it("emails a code to a registered client and tells them how long until another", async () => {
    expect(await forgotPasswordController(ctx({ email: "Pat@Acme.com" }))).toEqual({ data: { requested: true, resent: false, waitSeconds: 60 } });
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].to).toEqual(["pat@acme.com"]);
    expect(sent[0].text).toMatch(/\b\d{6}\b/);
    const again = await forgotPasswordController(ctx({ email: "pat@acme.com" }));
    expect(again.data).toMatchObject({ requested: true, resent: false, waitSeconds: expect.any(Number) });
    expect((again.data as { waitSeconds: number }).waitSeconds).toBeLessThanOrEqual(60);
    expect(sent).toHaveLength(1); // a second request inside the minute sends nothing new
  });
  it("says so, and sends no email, for an unregistered or disabled address", async () => {
    await expect(forgotPasswordController(ctx({ email: "nobody@acme.com" }))).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { email: expect.stringMatching(/couldn't find a client account/) } });
    await expect(forgotPasswordController(ctx({ email: "off@acme.com" }))).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { email: expect.stringMatching(/disabled/) } });
    expect(sent).toHaveLength(0);
  });
  it("completes end to end: code from the email + new password", async () => {
    await forgotPasswordController(ctx({ email: "pat@acme.com" }));
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    const code = /\b(\d{6})\b/.exec(sent[0].text)![1];
    await expect(resetWithCodeController(ctx({ email: "pat@acme.com", code, newPassword: "short" }))).rejects.toThrow(/at least 8 characters/);
    expect(await resetWithCodeController(ctx({ email: "pat@acme.com", code, newPassword: "brand-new-pass" }))).toEqual({ data: { changed: true } });
  });
});
