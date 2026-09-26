import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/lib/errors";

/**
 * Two roles, both bearer tokens compared the same way — still no sessions, no
 * password storage, no user table (Stage 5, Phase 1's "minimum role
 * separation", built on top of Stage 4 Phase 2's single-secret design).
 * "administrator" can do anything; "editor" is checked against a lower bar in
 * `admin.controller.ts` (cannot publish, cannot touch Site Settings) and
 * `CMS_EDITOR_API_TOKEN` is entirely optional — leaving it unset keeps the
 * exact Phase 2 behavior of one trusted admin and nothing else.
 */
export type AdminRole = "administrator" | "editor";

/**
 * The whole admin authentication mechanism: shared bearer tokens checked
 * against `ADMIN_API_TOKEN` (administrator) and, optionally,
 * `CMS_EDITOR_API_TOKEN` (editor). Deliberately minimal — trusted shared
 * secrets, not a multi-user/session system — chosen over building the site's
 * first full auth system (sessions, password storage, per-user accounts)
 * speculatively. `admin.controller.ts`'s functions all still run through the
 * same validated content-service layer as every other write, so upgrading to
 * real multi-user auth later only touches this file, not the CRUD logic.
 */
export function requireAdminAuth(request: Request): AdminRole {
  const env = getEnv();
  if (!env.ADMIN_API_TOKEN) throw new AppError("INTERNAL_ERROR", 500, "The admin API is not configured.");

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!provided) throw AppError.unauthorized();
  if (constantTimeEquals(provided, env.ADMIN_API_TOKEN)) return "administrator";
  if (env.CMS_EDITOR_API_TOKEN && constantTimeEquals(provided, env.CMS_EDITOR_API_TOKEN)) return "editor";
  throw AppError.unauthorized();
}

/** Same-length compare via `timingSafeEqual`; a length mismatch is checked first (that alone reveals nothing usable — token length isn't secret) so `timingSafeEqual` never throws on unequal-length buffers. Exported for `preview.ts`, which checks the same token from a query string instead of a header. */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
