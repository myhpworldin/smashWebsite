import "server-only";
import { getDb } from "@/server/db/client";
import type { Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { fail, ok } from "@/server/lib/response";
import { publicizeMedia } from "@/server/media/public";
import { RATE_LIMITS, checkRateLimit, clientKey, type RateLimitConfig } from "@/server/api/rate-limit";
import { requireAdminAuth, type AdminRole } from "@/server/api/admin-auth";
import { requireAdminSession } from "@/server/api/admin-session";
import type { PublicAdminUser } from "@/server/modules/admin-users/admin-users.service";

export type ControllerContext = { db: Db; url: URL; params: Record<string, string | undefined> };
/** `eagerMedia`: top-level keys of `data` that hold above-the-fold media (hint: load eagerly). */
export type ControllerResult = { data: unknown; meta?: Record<string, unknown>; eagerMedia?: string[] };
export type Controller = (ctx: ControllerContext) => Promise<ControllerResult>;

/** `role` is only ever set by `adminApi` (Stage 5, Phase 1); a public write controller never receives one. */
export type WriteControllerContext = ControllerContext & { body: unknown; role?: AdminRole };
export type WriteController = (ctx: WriteControllerContext) => Promise<ControllerResult>;

/**
 * Published content changes rarely, so successful responses may be cached by a
 * CDN/browser for this long. This is the maximum time an unpublished item can
 * still be served; errors are never cached. There is no on-demand purge yet.
 */
export const CACHE_SECONDS = 60;
const CACHE_HEADERS = { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, max-age=${CACHE_SECONDS}` };

/** Longest request URL accepted. Legitimate requests here are a few dozen characters. */
export const MAX_URL_LENGTH = 2048;

/** Route glue for PUBLIC READ endpoints: size check → rate limit → controller → envelope. */
export function publicGet(controller: Controller, opts: { rateLimit?: RateLimitConfig } = {}) {
  const config = opts.rateLimit ?? RATE_LIMITS.publicRead;
  return async (request: Request, context: { params?: Promise<Record<string, string | undefined>> } = {}): Promise<Response> => {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const req = { method: request.method, path: url.pathname, requestId }; // never the query string
    try {
      if (request.url.length > MAX_URL_LENGTH) throw AppError.badRequest("Request URL is too long.");

      const key = clientKey(request.headers);
      const limit = key ? checkRateLimit(key, Date.now(), config) : null;
      if (limit && !limit.allowed) {
        if (limit.firstRejection) logger.warn("Rate limit exceeded", req);
        return fail(new AppError("RATE_LIMITED", 429, "Too many requests. Please retry shortly."), {
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
          request: req,
        });
      }
      // `db` is a lazy getter so request validation runs (and fails fast) before any connection is opened.
      const { data, meta, eagerMedia } = await controller({
        get db() {
          return getDb();
        },
        url,
        params: (await context.params) ?? {},
      });
      return ok(publicizeMedia(data, eagerMedia), { meta, headers: { ...CACHE_HEADERS, "X-Request-Id": requestId } });
    } catch (err) {
      return fail(err, { request: req });
    }
  };
}

/** Longest JSON body accepted for a public write (a contact message is a few hundred characters). */
export const MAX_BODY_LENGTH = 20_000;

/**
 * Route glue for PUBLIC WRITE endpoints (currently just the contact form —
 * RATE_LIMITS.publicWrite, `rate-limit.ts`): size check → rate limit → parse
 * JSON → controller → envelope. Never cached (a write response is never stale
 * data to serve again). Malformed JSON becomes the same 400 shape as any other
 * bad request, not a raw parser exception.
 */
export function publicPost(controller: WriteController, opts: { rateLimit?: RateLimitConfig; scope?: string } = {}) {
  const config = opts.rateLimit ?? RATE_LIMITS.publicWrite;
  return async (request: Request, context: { params?: Promise<Record<string, string | undefined>> } = {}): Promise<Response> => {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const req = { method: request.method, path: url.pathname, requestId };
    try {
      if (request.url.length > MAX_URL_LENGTH) throw AppError.badRequest("Request URL is too long.");

      // `scope` (CRM Phase 2): a distinct rate-limit bucket per public write endpoint, so a burst against
      // one (e.g. admin login) can't also exhaust another's budget (e.g. the contact form) for the same visitor.
      const key = clientKey(request.headers, opts.scope ?? "write");
      const limit = key ? checkRateLimit(key, Date.now(), config) : null;
      if (limit && !limit.allowed) {
        if (limit.firstRejection) logger.warn("Rate limit exceeded", req);
        return fail(new AppError("RATE_LIMITED", 429, "Too many requests. Please retry shortly."), {
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
          request: req,
        });
      }

      const raw = await request.text();
      if (raw.length > MAX_BODY_LENGTH) throw AppError.badRequest("Request body is too large.");
      let body: unknown;
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw AppError.badRequest("Request body must be valid JSON.");
      }

      const { data, meta } = await controller({
        get db() {
          return getDb();
        },
        url,
        params: (await context.params) ?? {},
        body,
      });
      return ok(data, { meta, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
    } catch (err) {
      return fail(err, { request: req });
    }
  };
}

/** Longest JSON body accepted for an admin write. Real body content (e.g. an Insight article) can run up to `boundedText(200000)`. */
export const MAX_ADMIN_BODY_LENGTH = 300_000;
const BODY_METHODS = new Set(["POST", "PATCH", "PUT"]);

/**
 * Route glue for the admin content-management API (Stage 4, Phase 2):
 * size check → rate limit (its own bucket, `RATE_LIMITS.admin`) → bearer-token
 * auth (`admin-auth.ts`) → parse JSON body if the method carries one →
 * controller → envelope, raw (never `publicizeMedia`-projected — an editor
 * needs the real stored shape, not the public wire projection) and never
 * cached. `src/proxy.ts` lets every method through for `/api/admin/**`
 * unchecked; this function is where the actual authorization happens.
 *
 * `requireRole` (Stage 5, Phase 1): when set, only that exact role may call
 * this route at all — used for Site Settings, which has no draft/publish
 * concept to gate per-request, so it's Administrator-only wholesale. Every
 * other admin route accepts both roles here and leaves the finer-grained
 * "editor cannot publish" check to `admin.controller.ts`, which has the
 * request body this function does not parse for GET/DELETE-shaped routes.
 */
export function adminApi(controller: WriteController, opts: { requireRole?: AdminRole } = {}) {
  return async (request: Request, context: { params?: Promise<Record<string, string | undefined>> } = {}): Promise<Response> => {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const req = { method: request.method, path: url.pathname, requestId };
    try {
      if (request.url.length > MAX_URL_LENGTH) throw AppError.badRequest("Request URL is too long.");

      const key = clientKey(request.headers, "admin");
      const limit = key ? checkRateLimit(key, Date.now(), RATE_LIMITS.admin) : null;
      if (limit && !limit.allowed) {
        if (limit.firstRejection) logger.warn("Admin API rate limit exceeded", req);
        return fail(new AppError("RATE_LIMITED", 429, "Too many requests. Please retry shortly."), {
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
          request: req,
        });
      }

      let role: AdminRole;
      try {
        role = requireAdminAuth(request);
        if (opts.requireRole && role !== opts.requireRole) throw AppError.forbidden(`This action requires the ${opts.requireRole} role.`);
      } catch (err) {
        if (err instanceof AppError && err.code === "UNAUTHORIZED") logger.warn("Admin API auth failed", req);
        throw err;
      }

      let body: unknown;
      if (BODY_METHODS.has(request.method)) {
        const raw = await request.text();
        if (raw.length > MAX_ADMIN_BODY_LENGTH) throw AppError.badRequest("Request body is too large.");
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          throw AppError.badRequest("Request body must be valid JSON.");
        }
      }

      const { data, meta } = await controller({
        get db() {
          return getDb();
        },
        url,
        params: (await context.params) ?? {},
        body,
        role,
      });
      return ok(data, { meta, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
    } catch (err) {
      return fail(err, { request: req });
    }
  };
}

/** `admin` is only ever set by `adminSessionApi` (CRM Phase 2), parallel to `WriteControllerContext.role` on the pre-existing CMS admin API. */
export type SessionControllerContext = ControllerContext & { body: unknown; admin: PublicAdminUser };
export type SessionController = (ctx: SessionControllerContext) => Promise<ControllerResult>;

/**
 * Route glue for the CRM admin API, protected by the session cookie (CRM Phase 2) — distinct from
 * `adminApi` above, which protects the pre-existing CMS content API via a shared bearer token, a
 * fundamentally different mechanism (no per-user identity, no session). This is the "admin
 * authorization middleware" later CRM endpoints (`/admin/leads`, etc.) will also use: size check →
 * rate limit → session verification (`requireAdminSession`, which re-checks the database on every
 * call, not just the signature) → parse body if the method carries one → controller → envelope.
 */
export function adminSessionApi(controller: SessionController) {
  return async (request: Request, context: { params?: Promise<Record<string, string | undefined>> } = {}): Promise<Response> => {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const req = { method: request.method, path: url.pathname, requestId };
    try {
      if (request.url.length > MAX_URL_LENGTH) throw AppError.badRequest("Request URL is too long.");

      const key = clientKey(request.headers, "admin");
      const limit = key ? checkRateLimit(key, Date.now(), RATE_LIMITS.admin) : null;
      if (limit && !limit.allowed) {
        if (limit.firstRejection) logger.warn("Admin session rate limit exceeded", req);
        return fail(new AppError("RATE_LIMITED", 429, "Too many requests. Please retry shortly."), {
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
          request: req,
        });
      }

      const db = getDb();
      let admin: PublicAdminUser;
      try {
        admin = await requireAdminSession(db);
      } catch (err) {
        if (err instanceof AppError && err.code === "UNAUTHORIZED") logger.warn("Admin session auth failed", req);
        throw err;
      }

      let body: unknown;
      if (BODY_METHODS.has(request.method)) {
        const raw = await request.text();
        if (raw.length > MAX_ADMIN_BODY_LENGTH) throw AppError.badRequest("Request body is too large.");
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          throw AppError.badRequest("Request body must be valid JSON.");
        }
      }

      const { data, meta } = await controller({ db, url, params: (await context.params) ?? {}, body, admin });
      return ok(data, { meta, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
    } catch (err) {
      return fail(err, { request: req });
    }
  };
}
