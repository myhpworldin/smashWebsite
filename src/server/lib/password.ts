import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * The project's minimum admin password length. Nothing like this existed before (Phase 0 audit: the
 * only prior auth is two shared bearer tokens, `admin-auth.ts` — not per-user passwords), so this is a
 * new, deliberately conservative floor, not a reuse of an existing rule.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

export function passwordStrengthProblem(password: string): string | null {
  return password.length < MIN_ADMIN_PASSWORD_LENGTH ? `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.` : null;
}

/** `scrypt` — Node's built-in password-hashing primitive, no new dependency — with a random salt per password. Stored as `<salt-hex>:<hash-hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Constant-time compare. A malformed stored value (should never happen) fails closed rather than throwing. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
