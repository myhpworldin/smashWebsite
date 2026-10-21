import "server-only";
import { getDb } from "@/server/db/client";
import type { Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { fail, ok } from "@/server/lib/response";
import { RATE_LIMITS, checkRateLimit, clientKey, type RateLimitConfig } from "@/server/api/rate-limit";
import { MAX_BODY_LENGTH, MAX_URL_LENGTH, type ControllerContext, type ControllerResult } from "@/server/api/handler";
import { requireClientSessionRow } from "@/server/api/client-session";
import { clientStage, type ClientAccountRow, type ClientStage } from "@/server/modules/client-accounts/client-accounts.service";

export type ClientControllerContext = ControllerContext & { body: unknown; account: ClientAccountRow };
export type ClientController = (ctx: ClientControllerContext) => Promise<ControllerResult>;

const BODY_METHODS = new Set(["POST", "PATCH", "PUT"]);

/**
 * Route glue for the client portal API behind the client session cookie: size check → rate limit → session (the account is
 * re-read from the database) → stage check → body → controller → envelope. `stages` is where in the first-login flow this
 * endpoint is usable: verifying the email only while unverified, resetting the password only once verified, and the portal's
 * own endpoints only when `ready`. Never cached.
 */
export function clientSessionApi(controller: ClientController, opts: { stages: readonly ClientStage[]; rateLimit?: RateLimitConfig; scope?: string }) {
  const config = opts.rateLimit ?? RATE_LIMITS.clientSession;
  return async (request: Request, context: { params?: Promise<Record<string, string | undefined>> } = {}): Promise<Response> => {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const req = { method: request.method, path: url.pathname, requestId };
    try {
      if (request.url.length > MAX_URL_LENGTH) throw AppError.badRequest("Request URL is too long.");

      const key = clientKey(request.headers, opts.scope ?? "client");
      const limit = key ? checkRateLimit(key, Date.now(), config) : null;
      if (limit && !limit.allowed) {
        if (limit.firstRejection) logger.warn("Client API rate limit exceeded", req);
        return fail(new AppError("RATE_LIMITED", 429, "Too many requests. Please retry shortly."), { headers: { "Retry-After": String(limit.retryAfterSeconds) }, request: req });
      }

      const db: Db = getDb();
      const account = await requireClientSessionRow(db);
      if (!opts.stages.includes(clientStage(account))) throw AppError.forbidden("This step is not available right now.");

      let body: unknown;
      if (BODY_METHODS.has(request.method)) {
        const raw = await request.text();
        if (raw.length > MAX_BODY_LENGTH) throw AppError.badRequest("Request body is too large.");
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          throw AppError.badRequest("Request body must be valid JSON.");
        }
      }

      const { data, meta } = await controller({ db, url, params: (await context.params) ?? {}, body, account });
      return ok(data, { meta, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
    } catch (err) {
      return fail(err, { request: req });
    }
  };
}
