# Security

What's actually implemented today, with file references. See [ENVIRONMENT.md](ENVIRONMENT.md) for variable-level detail and [API.md](API.md) for the endpoint-level contract these mechanisms protect.

## Secrets

- No server secret is ever exposed to the browser — only `NEXT_PUBLIC_SITE_URL` and 6 non-secret analytics IDs use the `NEXT_PUBLIC_` prefix; enforced by an automated repo-wide test (`tests/security.test.ts`), not just convention.
- `.env`/`.env.*` are git-ignored (`.gitignore`), with `.env.example` explicitly allow-listed back in and containing names/placeholders only.
- A repo-wide secret scan (`tests/security.test.ts`, "secrets and environment") walks every tracked file (excluding `node_modules`/`.next`/`.git`/images) checking for Mongo-credential URLs, AWS keys, generic API-key patterns, PEM private keys, and JWT-shaped strings. It currently finds none.
- `src/server/lib/password.ts` stores admin passwords as `<salt-hex>:<hash-hex>`, never plaintext; `passwordHash` never appears in any public or admin-facing DTO (verified during Phase 2's API audit).

## HTTP security headers

Set globally in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera/mic/geo/payment/usb/browsing-topics denied), `Cross-Origin-Opener-Policy: same-origin`, `Strict-Transport-Security` (production only — correctly absent elsewhere, since HSTS on a non-HTTPS tier can lock out local development). `X-Robots-Tag: noindex, nofollow` is additionally set on every `/api/**`, `/preview/**`, `/admin/**` request.

**Content-Security-Policy** is set but intentionally narrow today — only `frame-ancestors`/`base-uri`/`form-action`/`object-src`, no `script-src`/`img-src`/`style-src` yet. This is a documented, deliberate gap (`next.config.ts`'s own comment): tightening it requires per-request nonce infrastructure for Next's inline scripts, which hasn't been built. Tightening the CSP without that infrastructure would break the site, not secure it — it's listed as pending work, not an oversight.

## CORS

**No CORS headers are sent anywhere in the codebase** (verified: zero matches for `Access-Control-Allow-*` across `src/`). The site and its API share one origin, so the browser's default same-origin policy is the actual enforcement mechanism — there is nothing to misconfigure into an overly permissive `*`, because no CORS allowance exists at all. `src/proxy.ts` separately enforces an HTTP-method allowlist (GET/HEAD/OPTIONS everywhere on `/api/**`, POST only for `/api/contact` and `/api/leads`), returning a JSON 405 before any route handler runs — this is independent of and in addition to the CORS posture.

## Rate limiting

Fixed-window, per-IP (via `x-forwarded-for`), in-memory (`src/server/api/rate-limit.ts`), scoped so a burst against one endpoint class can't exhaust another's budget:

| Scope | Limit | Applies to |
|---|---|---|
| `publicRead` | 120/min | Every public GET endpoint |
| `publicWrite` | 5/min | `/api/contact` (and `/api/leads`, CRM) |
| `admin` | 30/min | `/api/admin/**` (CMS) |
| `adminAuth` | 10/min | Admin login |

Memory-bounded (max 10,000 tracked keys, with eviction) so a flood of spoofed keys can't exhaust server memory. No crawler/user-agent allowlist exists — the 120/min ceiling is deliberately generous enough to not interfere with normal crawling, rather than maintaining an allowlist that itself becomes an attack surface.

## Input validation

Every public write and every list/detail query parameter is validated server-side with Zod — the frontend's own validation is never trusted. Slugs are format- and length-checked (`src/server/seo/slug.ts`) before they ever reach a database query. Pagination (`page`/`limit`) is clamped with a hard max (`limit` ≤ 50) and rejects out-of-range values with `422` rather than silently clamping them. No public endpoint reads an unreviewed query parameter that could expose draft content (`?status=draft` is explicitly tested to have no effect).

## Payload limits

`/api/contact` (and `/api/leads`): request body capped at 20,000 bytes (`MAX_BODY_LENGTH`, `src/server/api/handler.ts`), checked before JSON parsing. Admin writes: capped at 300,000 bytes (`MAX_ADMIN_BODY_LENGTH`) — large enough for a full article body, small enough to bound memory use. Every request URL is capped at 2,048 characters (`MAX_URL_LENGTH`) regardless of route. There is no file-upload API on the public website today, so there is nothing to validate there — one has not been invented for this phase.

## Error handling

A single function (`src/server/lib/response.ts`'s `fail()`) turns every thrown error into a response. Known application errors (`AppError`) return their own safe message/code/status. Anything else — a database driver error, an unexpected exception — is logged in full server-side (redacted, see below) and returns the client a generic `{"success":false,"message":"Something went wrong.","error":{"code":"INTERNAL_SERVER_ERROR"}}` with status 500. No stack trace, connection string, or internal exception message ever reaches a client. Verified by a test that throws an `ECONNREFUSED` error containing a fake embedded credential and asserts it never appears in the response or in an unredacted log line.

## Logging

Structured JSON logs (`src/server/lib/logger.ts`) with automatic redaction: any value under a key matching `password`/`secret`/`token`/`authorization`/`api-key`/`cookie`/`credential`/`database-url`/`mongodb-uri`/`connection` is masked, recursively, to a depth of 4 — and credentials embedded inside a URL string are masked by pattern, not just by key name. Rejected-request logs carry only `method`, `path`, `status`, `code` — never the query string or request body.

## Request correlation

Every request handled by `publicGet`/`publicPost`/`adminApi`/`adminSessionApi` (`src/server/api/handler.ts`) is assigned a fresh `crypto.randomUUID()` request ID, included in every log line for that request and echoed back to the client as an `X-Request-Id` response header (on both success and error paths) — so a user-reported failure can be found in server logs by that ID alone, without needing to log anything sensitive.

## Database connection

`MONGODB_URI` is read only from environment configuration (`src/server/db/client.ts`) — never hardcoded. The connection pool is capped (`maxPoolSize: 10`) rather than left unbounded, and `serverSelectionTimeoutMS: 5000` makes a request fail within 5 seconds when the database is unreachable instead of hanging on the driver's 30-second default. A connection failure is caught by the same centralized error handler as any other error — it never reaches the client as a raw driver exception.

## Dependency security

`npm audit` findings and remediation are tracked in the Phase 5 report (this document doesn't duplicate that); current policy: patch non-breaking fixes promptly (`npm audit fix`), and never force a major-version bump across a dependency chain without checking compatibility first.

## CMS / admin API

The pre-existing CMS admin API (`/api/admin/**`) uses a shared bearer token (`ADMIN_API_TOKEN`/`CMS_EDITOR_API_TOKEN`), checked on every request (`src/server/api/admin-auth.ts`); it is not reachable without one. Public content endpoints only ever read through `isPublished()`/`publishedAnd()` filters (`src/server/db/helpers.ts`) — draft content is excluded at the query layer, not by a response-time filter that could be bypassed. The CRM's separate session-based admin auth (`admin-session.ts`) re-validates against the database on every call, not just a signature check.

## What's intentionally not here

- No CAPTCHA — the contact form's rate limit (5/min) and the project's low-volume nature don't justify the UX cost.
- No WAF/CDN-level configuration — out of this codebase's scope; see [OPERATIONS.md](OPERATIONS.md) for what belongs at the hosting layer instead.
- No application-level authentication for public content reads — there is none to protect; everything public is meant to be public.
