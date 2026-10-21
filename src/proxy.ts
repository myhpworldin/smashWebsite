import { NextResponse, type NextRequest } from "next/server";
import { normalizePathname } from "@/lib/routes";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
/**
 * The public write routes. Every other `/api/**` path stays strictly read-only; these are explicit,
 * reviewed exceptions, not a general write allowance. `/api/contact` (Stage 3, Phase 7) is the
 * legacy contact-enquiry log, kept intact but no longer called by the live Contact page.
 * `/api/leads` (CRM Phase 3) is what the Contact page now submits to.
 */
const WRITE_ROUTES: Record<string, Set<string>> = { "/api/contact": new Set(["POST"]), "/api/leads": new Set(["POST"]) };
/**
 * Admin content-management API (Stage 4, Phase 2): every method is let
 * through unchecked here — real authorization is the bearer-token check
 * inside `adminApi` (`admin-auth.ts`), not this coarse method allowlist. A
 * prefix, not `WRITE_ROUTES`, because admin routes have dynamic `[id]`
 * segments this exact-pathname map can't express.
 */
const ADMIN_PREFIX = "/api/admin/";
/**
 * Client portal API: every method is let through here too, for the same reason as the admin prefix. Each route authenticates itself
 * (`clientSessionApi`, or the rate-limited login), so this coarse allowlist has nothing left to add.
 */
const CLIENT_PREFIX = "/api/client/";

/**
 * 1. /api is read-only by default: any method outside READ_METHODS (or, for a
 *    route in WRITE_ROUTES, outside its own allowed set too) gets a JSON 405
 *    before reaching a handler — except `/api/admin/**`, which authenticates
 *    itself. (No CORS headers are sent anywhere: the site and its API share
 *    one origin.)
 * 2. Pages: enforce the URL policy, one lowercase, slash-free form per page (308).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    if (pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(CLIENT_PREFIX)) return NextResponse.next();
    const extraAllowed = WRITE_ROUTES[pathname];
    if (READ_METHODS.has(request.method) || extraAllowed?.has(request.method)) return NextResponse.next();
    const allow = [...READ_METHODS, ...(extraAllowed ?? [])].join(", ");
    return NextResponse.json(
      { success: false, message: `Method not allowed. Allowed: ${allow}.`, error: { code: "METHOD_NOT_ALLOWED" } },
      { status: 405, headers: { Allow: allow, "Cache-Control": "no-store" } },
    );
  }

  const normalized = normalizePathname(pathname);
  if (normalized === pathname) return NextResponse.next();
  return NextResponse.redirect(new URL(`${normalized}${request.nextUrl.search}`, request.url), 308);
}

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
