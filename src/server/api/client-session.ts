import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/server/config/env";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/lib/errors";
import type { Db } from "@/server/db/helpers";
import {
  CLIENT_STAGE_PATH,
  clientStage,
  findClientAccountById,
  toPublicClientAccount,
  type ClientAccountRow,
  type ClientStage,
  type PublicClientAccount,
} from "@/server/modules/client-accounts/client-accounts.service";

export const CLIENT_SESSION_COOKIE = "smash_client_session";
/** Half a day: a client checks a dashboard, they do not stay in it. No refresh or rotation, same stateless design as the admin session. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

/** `sv` is the account's `sessionVersion` when the cookie was issued: a password change bumps it and so ends every older session. */
type SessionPayload = { id: string; sv: number; exp: number; aud: "client" };

/**
 * The client session is signed with a key derived from `ADMIN_SESSION_SECRET` (no second secret to configure) but with its own
 * prefix and an `aud` claim, so a client cookie can never verify as an admin session or the other way round.
 */
function sessionSecret(): string {
  const { ADMIN_SESSION_SECRET } = getEnv();
  if (!ADMIN_SESSION_SECRET) throw new AppError("INTERNAL_ERROR", 500, "Client portal authentication is not configured.");
  return `client-portal:${ADMIN_SESSION_SECRET}`;
}

const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

function createSessionToken(account: Pick<ClientAccountRow, "id" | "sessionVersion">): string {
  const payload: SessionPayload = { id: account.id, sv: account.sessionVersion, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000, aud: "client" };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, sessionSecret())}`;
}

function parseSessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(body, sessionSecret()));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (payload.aud !== "client" || typeof payload.id !== "string" || typeof payload.sv !== "number" || typeof payload.exp !== "number") return null;
    return payload.exp >= Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** Sets the session cookie after a login or a password change. Route Handlers and Server Functions only. */
export async function setClientSessionCookie(account: Pick<ClientAccountRow, "id" | "sessionVersion">) {
  const jar = await cookies();
  jar.set(CLIENT_SESSION_COOKIE, createSessionToken(account), {
    httpOnly: true,
    secure: getEnv().APP_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearClientSessionCookie() {
  const jar = await cookies();
  jar.delete(CLIENT_SESSION_COOKIE);
}

/**
 * Verifies the cookie, then re-reads the account on every call: a disabled account, or one whose password changed since the cookie
 * was issued, loses access immediately. `null` for every failure, undifferentiated.
 */
async function readClientSession(db: Db): Promise<ClientAccountRow | null> {
  const token = (await cookies()).get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = parseSessionToken(token);
  if (!payload) return null;
  const account = await findClientAccountById(db, payload.id);
  if (!account || !account.isActive || account.sessionVersion !== payload.sv) return null;
  return account;
}

/** The signed-in client's full row, for the auth controllers that need the password hash or verification state. Throws `UNAUTHORIZED` when there is no valid session. */
export async function requireClientSessionRow(db: Db): Promise<ClientAccountRow> {
  const account = await readClientSession(db);
  if (!account) throw AppError.unauthorized();
  return account;
}

/** Per-request memoised, like `getCurrentAdmin`: the layout and the page both ask who is signed in, and the database is read once. */
const getCurrentClientRow = cache(() => readClientSession(getDb()));

export async function getCurrentClient(): Promise<PublicClientAccount | null> {
  const row = await getCurrentClientRow();
  return row ? toPublicClientAccount(row) : null;
}

/**
 * For client pages. `stage` is the step the page belongs to: a client who is signed out goes to the login, and one who is
 * signed in but not yet where this page needs them (email unverified, password still temporary) goes to the step they are
 * on, so nothing past the two first-login steps can be reached early. Every page calls this itself; a layout does not
 * gate the segments below it.
 */
export async function requireClientStage(stage: ClientStage): Promise<PublicClientAccount> {
  const row = await getCurrentClientRow();
  if (!row) redirect("/client/login");
  const actual = clientStage(row);
  if (actual !== stage) redirect(CLIENT_STAGE_PATH[actual]);
  return toPublicClientAccount(row);
}
