import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { getEnv } from "@/server/config/env";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/lib/errors";
import type { Db } from "@/server/db/helpers";
import { findAdminUserById, toPublicAdminUser, type PublicAdminUser } from "@/server/modules/admin-users/admin-users.service";

export const ADMIN_SESSION_COOKIE = "smash_admin_session";
/** A business day, not a "remember me" duration — there is no refresh/rotation in this phase; re-authenticating daily is the accepted tradeoff for keeping the session mechanism stateless and simple. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = { id: string; exp: number };

function sessionSecret(): string {
  const { ADMIN_SESSION_SECRET } = getEnv();
  if (!ADMIN_SESSION_SECRET) throw new AppError("INTERNAL_ERROR", 500, "CRM admin authentication is not configured.");
  return ADMIN_SESSION_SECRET;
}

const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

/**
 * A signed, stateless session token: `base64url(payload).signature`. Carries only the admin's id and
 * an expiry — never the email, role or password hash. Those are re-read from the database on every
 * verification (`requireAdminSession`), so a deactivated or deleted admin loses access immediately,
 * not only once their token happens to expire.
 */
function createSessionToken(adminId: string): string {
  const payload: SessionPayload = { id: adminId, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, sessionSecret())}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body, sessionSecret());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.id !== "string" || typeof payload.exp !== "number") return null;
    return payload.exp >= Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** Sets the session cookie after a successful login. Must be called from a Route Handler or Server Function (Next.js forbids writing cookies during rendering). */
export async function setAdminSessionCookie(adminId: string) {
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, createSessionToken(adminId), {
    httpOnly: true,
    secure: getEnv().APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clears the session cookie on logout. Same calling-context restriction as `setAdminSessionCookie`. */
export async function clearAdminSessionCookie() {
  const jar = await cookies();
  jar.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Verifies the cookie's signature and expiry, then re-checks the database so "the account still
 * exists" and "the account is still active" hold on *every* call, not only at login — the same
 * database re-check backs both `requireAdminSession` (API routes) and `getAuthenticatedAdmin` (page
 * layouts) below. Returns `null` for every failure reason (no cookie, bad signature, expired, unknown
 * id, inactive) — undifferentiated, same reasoning as `verifyAdminCredentials`.
 */
async function readAdminSession(db: Db): Promise<PublicAdminUser | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = parseSessionToken(token);
  if (!payload) return null;
  const admin = await findAdminUserById(db, payload.id);
  if (!admin || !admin.isActive) return null;
  return toPublicAdminUser(admin);
}

/** The admin authorization middleware (CRM Phase 2 brief, Step 11) for API routes: throws `AppError.unauthorized()` instead of returning `null`. Used by `adminSessionApi` (`handler.ts`). */
export async function requireAdminSession(db: Db): Promise<PublicAdminUser> {
  const admin = await readAdminSession(db);
  if (!admin) throw AppError.unauthorized();
  return admin;
}

/** For Server Components (the `/admin` route-group layout, the login page): `null` means "not signed in", to redirect — never a thrown error, since a protected page's own job is to decide what happens next, not to render a generic error screen. */
export async function getAuthenticatedAdmin(db: Db): Promise<PublicAdminUser | null> {
  return readAdminSession(db);
}

/** Per-request memoisation (same pattern as `seo/request-cache.ts`): the login page, the protected layout and the protected entry page all ask "who is signed in", so it is read and verified against the database only once per request. */
export const getCurrentAdmin = cache(() => getAuthenticatedAdmin(getDb()));
