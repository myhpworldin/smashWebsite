import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { col, findRows, insertRow, toRow, updateRow, type Db } from "@/server/db/helpers";
import { clientAccounts, type RowOf } from "@/server/db/schema";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/lib/errors";
import { hashPassword, verifyPassword } from "@/server/lib/password";
import { clientServiceKey, type ClientService } from "@/lib/client-options";
import { listPublishedServiceCatalogue } from "@/server/modules/services/services.service";
import { createClientAccountSchema, updateClientAccountSchema, type CreateClientAccountInput, type UpdateClientAccountInput } from "./client-accounts.schema";

export type ClientAccountRow = RowOf<"client_accounts">;
/** What anything outside this module may see: no password hash, no verification-code state. */
export type PublicClientAccount = Omit<ClientAccountRow, "passwordHash" | "verificationCodeHash" | "verificationExpiresAt" | "verificationAttempts" | "verificationSentAt" | "resetNonce" | "resetExpiresAt" | "resetAttempts" | "resetSentAt">;

/** Where a signed-in client is allowed to be: the portal itself only once the email is verified and the temporary password replaced. */
export type ClientStage = "verify" | "reset" | "ready";

export const VERIFICATION_CODE_MINUTES = 10;
export const VERIFICATION_MAX_ATTEMPTS = 5;
export const VERIFICATION_RESEND_SECONDS = 60;

export function toPublicClientAccount(row: ClientAccountRow): PublicClientAccount {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude them from `rest`
  const { passwordHash, verificationCodeHash, verificationExpiresAt, verificationAttempts, verificationSentAt, resetNonce, resetExpiresAt, resetAttempts, resetSentAt, ...rest } = row;
  return rest;
}

export const clientStage = (account: Pick<ClientAccountRow, "emailVerified" | "mustResetPassword">): ClientStage =>
  !account.emailVerified ? "verify" : account.mustResetPassword ? "reset" : "ready";

/** The page a client in `stage` belongs on. */
export const CLIENT_STAGE_PATH: Record<ClientStage, string> = { verify: "/client/verify", reset: "/client/reset-password", ready: "/client" };

export async function findClientAccountByEmail(db: Db, email: string): Promise<ClientAccountRow | null> {
  const doc = await col(db, clientAccounts).findOne({ email });
  return doc ? (toRow(clientAccounts, doc) as ClientAccountRow) : null;
}

export async function findClientAccountById(db: Db, id: string): Promise<ClientAccountRow | null> {
  const doc = await col(db, clientAccounts).findOne({ _id: id as never });
  return doc ? (toRow(clientAccounts, doc) as ClientAccountRow) : null;
}

export async function getClientAccount(db: Db, id: string): Promise<ClientAccountRow> {
  const row = await findClientAccountById(db, id);
  if (!row) throw AppError.notFound("Client account");
  return row;
}

export async function listClientAccounts(db: Db): Promise<PublicClientAccount[]> {
  const rows = await findRows(db, clientAccounts, {}, { sort: { createdAt: -1, _id: 1 } });
  return rows.map(toPublicClientAccount);
}

/**
 * The chosen services must be real offerings in the published Services catalogue (a group and an offering title that exist),
 * so a client can never be recorded with a service the agency does not provide. Selections the account already holds are
 * kept even if the catalogue has since dropped them, so editing someone's phone number cannot silently fail on old data.
 * The stored group name is taken from the catalogue, not from the request, so it cannot be spoofed.
 */
export type ServiceOptionGroup = { slug: string; name: string; titles: string[] };

/** The services the agency provides, as groups with their offering titles (a group with no offerings is offered as itself): what the admin form lets you tick. */
export async function listServiceOptions(db: Db): Promise<ServiceOptionGroup[]> {
  const catalogue = await listPublishedServiceCatalogue(db);
  return catalogue.map((g) => ({ slug: g.slug, name: g.name, titles: g.cards.length ? g.cards.map((c) => c.title) : [g.name] }));
}

async function resolveServices(db: Db, chosen: ClientService[], alreadyHeld: ClientService[] = []): Promise<ClientService[]> {
  const known = new Map<string, ClientService>();
  for (const group of await listServiceOptions(db)) {
    for (const title of group.titles) known.set(clientServiceKey({ categorySlug: group.slug, title }), { categorySlug: group.slug, categoryName: group.name, title });
  }
  const held = new Map(alreadyHeld.map((s) => [clientServiceKey(s), s]));
  const seen = new Set<string>();
  const result: ClientService[] = [];
  for (const s of chosen) {
    const key = clientServiceKey(s);
    if (seen.has(key)) continue;
    seen.add(key);
    const match = known.get(key) ?? held.get(key);
    if (!match) throw AppError.validation({ services: `"${s.title}" is not one of the services SMASH provides.` });
    result.push(match);
  }
  return result;
}

/** Creates a client's login. The temporary password is hashed here and never stored or logged; the caller keeps the plain text only to show/email it once. */
export async function createClientAccount(db: Db, input: CreateClientAccountInput, createdBy: string | null): Promise<PublicClientAccount> {
  const { email, companyName, contactName, phone, temporaryPassword, services } = createClientAccountSchema.parse(input);
  if (await findClientAccountByEmail(db, email)) throw AppError.conflict("A client account with this email already exists.");
  const chosenServices = await resolveServices(db, services);
  const passwordHash = await hashPassword(temporaryPassword);
  try {
    const row = await insertRow(db, clientAccounts, { email, companyName, contactName, phone, services: chosenServices, passwordHash, createdBy }, "Client account");
    return toPublicClientAccount(row);
  } catch (err) {
    // The unique email index is the backstop for two admins creating the same account at once.
    if (err instanceof AppError && err.code === "CONFLICT") throw AppError.conflict("A client account with this email already exists.");
    throw err;
  }
}

export async function updateClientAccount(db: Db, id: string, input: UpdateClientAccountInput): Promise<PublicClientAccount> {
  // Disabling also ends any open session: every request re-reads `isActive`, so no version bump is needed.
  const { services: chosen, ...rest } = updateClientAccountSchema.parse(input);
  const services = chosen ? await resolveServices(db, chosen, (await getClientAccount(db, id)).services) : undefined;
  return toPublicClientAccount(await updateRow(db, clientAccounts, id, { ...rest, ...(services ? { services } : {}) }, "Client account"));
}

/** An unknown email still pays the same hashing cost as a real one, so a login's timing does not reveal which emails have accounts. */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-used-only-for-constant-time-client-login"));

/** The account on a correct email + password, or `null` for every failure (unknown email, wrong password, disabled) — undifferentiated on purpose. */
export async function verifyClientCredentials(db: Db, email: string, password: string): Promise<ClientAccountRow | null> {
  const account = await findClientAccountByEmail(db, email);
  const valid = await verifyPassword(password, account?.passwordHash ?? (await getDummyHash()));
  return account && account.isActive && valid ? account : null;
}

export async function recordClientLogin(db: Db, id: string): Promise<void> {
  await col(db, clientAccounts).updateOne({ _id: id as never }, { $set: { lastLoginAt: new Date() } });
}

export async function markClientViewed(db: Db, id: string): Promise<void> {
  await col(db, clientAccounts).updateOne({ _id: id as never }, { $set: { lastViewedAt: new Date() } });
}

/* ---------- email verification ---------- */

const codeHash = (accountId: string, code: string) => createHash("sha256").update(`${accountId}:${code}`).digest("hex");

/**
 * Starts a new verification: a fresh 6-digit code that is valid for ten minutes and replaces any earlier one. Only the
 * code's hash is stored. Returns the code for the caller to email, or throws a 429 if one was sent under a minute ago.
 */
export async function issueVerificationCode(db: Db, account: ClientAccountRow, now = new Date()): Promise<string> {
  const sent = account.verificationSentAt;
  if (sent) {
    const wait = Math.ceil((sent.getTime() + VERIFICATION_RESEND_SECONDS * 1000 - now.getTime()) / 1000);
    if (wait > 0) throw new AppError("RATE_LIMITED", 429, `Please wait ${wait} seconds before asking for another code.`);
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await col(db, clientAccounts).updateOne(
    { _id: account.id as never },
    { $set: { verificationCodeHash: codeHash(account.id, code), verificationExpiresAt: new Date(now.getTime() + VERIFICATION_CODE_MINUTES * 60_000), verificationAttempts: 0, verificationSentAt: now, updatedAt: now } },
  );
  return code;
}

/**
 * Checks the code the client typed. Wrong codes are counted and the code dies after five of them (the client must ask
 * for a new one), so a 6-digit code cannot be brute-forced. A correct code verifies the email and is cleared at once.
 */
export async function confirmVerificationCode(db: Db, account: ClientAccountRow, code: string, now = new Date()): Promise<void> {
  if (account.emailVerified) return;
  const stored = account.verificationCodeHash;
  if (!stored || !account.verificationExpiresAt || account.verificationExpiresAt.getTime() < now.getTime()) {
    throw AppError.badRequest("This code has expired. Please request a new one.");
  }
  if (account.verificationAttempts >= VERIFICATION_MAX_ATTEMPTS) throw AppError.badRequest("Too many incorrect attempts. Please request a new code.");

  const a = Buffer.from(codeHash(account.id, code));
  const b = Buffer.from(stored);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await col(db, clientAccounts).updateOne({ _id: account.id as never }, { $inc: { verificationAttempts: 1 } });
    const left = VERIFICATION_MAX_ATTEMPTS - account.verificationAttempts - 1;
    throw AppError.badRequest(left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many incorrect attempts. Please request a new code.");
  }
  await col(db, clientAccounts).updateOne(
    { _id: account.id as never },
    { $set: { emailVerified: true, emailVerifiedAt: now, verificationCodeHash: null, verificationExpiresAt: null, verificationAttempts: 0, updatedAt: now } },
  );
}

/* ---------- forgot password ---------- */

/**
 * The 6-digit "forgot password" code for one request: an HMAC of the account and the request's random nonce, keyed from
 * `ADMIN_SESSION_SECRET` (own prefix, like the client session key, so there is no second secret to configure). Nothing but the
 * nonce is stored, so a database leak alone does not reveal a usable code, yet the same code can be worked out again to resend it.
 */
function resetCodeFor(accountId: string, nonce: string): string {
  const { ADMIN_SESSION_SECRET } = getEnv();
  if (!ADMIN_SESSION_SECRET) throw new AppError("INTERNAL_ERROR", 500, "Client portal authentication is not configured.");
  const digest = createHmac("sha256", `client-reset:${ADMIN_SESSION_SECRET}`).update(`${accountId}:${nonce}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export type ResetCodeResult =
  /** `reused`: this is the code already sent, sent again; `minutesLeft` is how long it still works. */
  | { status: "sent"; account: ClientAccountRow; code: string; reused: boolean; minutesLeft: number }
  | { status: "unknown" }
  | { status: "disabled" }
  /** A code went out under a minute ago; it is still good, so the client can use it. `seconds` is how long until it can be sent again. */
  | { status: "wait"; seconds: number };

/**
 * Starts a "forgot password": checks the email belongs to an active client account and has a code mailed. The code lasts ten minutes
 * from when it was first sent: asking again inside that time (after the one-minute pause) sends the same code again and leaves the
 * expiry and the wrong-guess count alone, so five wrong tries cover the whole ten minutes. A fresh code is made only when there is
 * none, it has expired, or its five tries are used up. An unregistered or disabled address is reported so the form can say so.
 */
export async function issueResetCode(db: Db, email: string, now = new Date()): Promise<ResetCodeResult> {
  const account = await findClientAccountByEmail(db, email);
  if (!account) return { status: "unknown" };
  if (!account.isActive) return { status: "disabled" };
  const sent = account.resetSentAt;
  if (sent && sent.getTime() + VERIFICATION_RESEND_SECONDS * 1000 > now.getTime()) return { status: "wait", seconds: Math.ceil((sent.getTime() + VERIFICATION_RESEND_SECONDS * 1000 - now.getTime()) / 1000) };

  const stillGood = !!account.resetNonce && !!account.resetExpiresAt && account.resetExpiresAt.getTime() > now.getTime() && (account.resetAttempts ?? 0) < VERIFICATION_MAX_ATTEMPTS;
  if (stillGood) {
    await col(db, clientAccounts).updateOne({ _id: account.id as never }, { $set: { resetSentAt: now, updatedAt: now } });
    return { status: "sent", account, code: resetCodeFor(account.id, account.resetNonce!), reused: true, minutesLeft: Math.max(1, Math.ceil((account.resetExpiresAt!.getTime() - now.getTime()) / 60_000)) };
  }
  const nonce = randomBytes(16).toString("hex");
  await col(db, clientAccounts).updateOne(
    { _id: account.id as never },
    { $set: { resetNonce: nonce, resetExpiresAt: new Date(now.getTime() + VERIFICATION_CODE_MINUTES * 60_000), resetAttempts: 0, resetSentAt: now, updatedAt: now } },
  );
  return { status: "sent", account, code: resetCodeFor(account.id, nonce), reused: false, minutesLeft: VERIFICATION_CODE_MINUTES };
}

const BAD_RESET_CODE = "That code is not right or has expired. Please check it, or request a new one.";

/**
 * Checks the emailed code without using it up, so the form can confirm it before asking for a new password. Every failure (no
 * code asked for, expired, wrong) says the same thing, and wrong codes are counted across the ten minutes (resends included) and the
 * code dies after five, so the 6-digit code cannot be brute-forced. Returns the account the code belongs to.
 */
export async function checkResetCode(db: Db, email: string, code: string, now = new Date()): Promise<ClientAccountRow> {
  const account = await findClientAccountByEmail(db, email);
  const nonce = account?.resetNonce;
  if (!account || !account.isActive || !nonce || !account.resetExpiresAt || account.resetExpiresAt.getTime() < now.getTime()) throw AppError.badRequest(BAD_RESET_CODE);
  const attempts = account.resetAttempts ?? 0;
  if (attempts >= VERIFICATION_MAX_ATTEMPTS) throw AppError.badRequest("Too many incorrect attempts. Please request a new code.");

  const a = Buffer.from(code);
  const b = Buffer.from(resetCodeFor(account.id, nonce));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await col(db, clientAccounts).updateOne({ _id: account.id as never }, { $inc: { resetAttempts: 1 } });
    const left = VERIFICATION_MAX_ATTEMPTS - attempts - 1;
    throw AppError.badRequest(left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many incorrect attempts. Please request a new code.");
  }
  return account;
}

/**
 * Sets a new password from the emailed code. The code is checked again here (`checkResetCode`), so a password cannot be set by
 * skipping the form's earlier check. Success proves the client owns the mailbox, so it also marks the email verified and clears
 * "must reset"; it ends every open session (`sessionVersion`) and the code is single-use.
 */
export async function resetPasswordWithCode(db: Db, email: string, code: string, newPassword: string, now = new Date()): Promise<void> {
  const account = await checkResetCode(db, email, code, now);
  if (await verifyPassword(newPassword, account.passwordHash)) throw AppError.validation({ newPassword: "Choose a password different from your current one." });
  await col(db, clientAccounts).updateOne(
    { _id: account.id as never },
    {
      $set: { passwordHash: await hashPassword(newPassword), mustResetPassword: false, emailVerified: true, passwordChangedAt: now, resetNonce: null, resetExpiresAt: null, resetAttempts: 0, verificationCodeHash: null, verificationExpiresAt: null, updatedAt: now },
      $inc: { sessionVersion: 1 },
    },
  );
}

/* ---------- passwords ---------- */

/**
 * The client replaces their password. Requires the current one (the temporary one, on first login) and refuses to keep
 * it. Bumps `sessionVersion`, so every other open session for the account signs out; the caller re-issues this one's cookie.
 */
export async function changeClientPassword(db: Db, account: ClientAccountRow, currentPassword: string, newPassword: string): Promise<ClientAccountRow> {
  if (!(await verifyPassword(currentPassword, account.passwordHash))) throw AppError.validation({ currentPassword: "Your current password is not right." });
  if (currentPassword === newPassword) throw AppError.validation({ newPassword: "Choose a password different from your current one." });
  const now = new Date();
  const doc = await col(db, clientAccounts).findOneAndUpdate(
    { _id: account.id as never },
    { $set: { passwordHash: await hashPassword(newPassword), mustResetPassword: false, passwordChangedAt: now, updatedAt: now }, $inc: { sessionVersion: 1 } },
    { returnDocument: "after" },
  );
  if (!doc) throw AppError.notFound("Client account");
  return toRow(clientAccounts, doc) as ClientAccountRow;
}

/** An administrator sets a new temporary password: the client must reset it again on next login, and any open session ends. */
export async function adminSetTemporaryPassword(db: Db, id: string, temporaryPassword: string): Promise<PublicClientAccount> {
  await getClientAccount(db, id);
  const now = new Date();
  const doc = await col(db, clientAccounts).findOneAndUpdate(
    { _id: id as never },
    { $set: { passwordHash: await hashPassword(temporaryPassword), mustResetPassword: true, updatedAt: now }, $inc: { sessionVersion: 1 } },
    { returnDocument: "after" },
  );
  if (!doc) throw AppError.notFound("Client account");
  return toPublicClientAccount(toRow(clientAccounts, doc) as ClientAccountRow);
}
