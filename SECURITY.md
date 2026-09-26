# Security

Scope: the public website backend. CRM is out of scope, and there is no authentication or admin surface yet. Everything below describes what is implemented; gaps are listed at the end.

## Endpoint classification

| Endpoint | Class | Notes |
|---|---|---|
| `GET /api/home`, `/services[/:slug]`, `/work[/:slug]`, `/insights[/:slug]`, `/testimonials`, `/clients`, `/site-settings` | PUBLIC READ | Published content only, explicit response fields |
| `GET /api/health` | PUBLIC READ | `{status:"ok"}` only; no environment or dependency detail |
| `GET /api/**` (unknown path) | PUBLIC READ | JSON 404 |
| `POST /api/contact` | PUBLIC WRITE | Stage 3, Phase 7 — the one public write endpoint. `enquiries` table only; no assignment/pipeline/notification. Own (tighter) rate-limit bucket; honeypot-based spam handling (see `API.md`). Read-back is admin-only (`GET /api/admin/enquiries`, Stage 6 Phase 3), never public |
| Any other non-GET/HEAD/OPTIONS method on `/api/**` | none | 405 from `src/proxy.ts` — `POST /api/contact` is the sole, explicitly reviewed exception (`WRITE_ROUTES` in `proxy.ts`) |
| Content create/update functions | INTERNAL | Server-side functions only; not reachable over HTTP |
| ADMIN | – | Not implemented |

## Request flow

```
request → proxy (405 for writes on /api, except POST /api/contact; URL normalisation for pages)
        → route → publicGet/publicPost: URL length → rate limit (read/write buckets are separate)
        → controller: parse params/query/body (zod) → service → database (parameterised)
        → serializer (explicit fields) / raw success ack → envelope
any throw → fail(): AppError → safe message + code; anything else → generic 500, details to the log
```

## Validation

- **Path/query** ([api/query.ts](src/server/api/query.ts)): slug must match the kebab-case pattern and ≤ 100 chars (400). `page` int 1–10000, `limit` int 1–50 (422, never clamped); `category` printable text ≤ 200 with no control characters (NUL would otherwise reach the database). A repeated parameter is rejected; unknown parameters are ignored and cannot alter results (e.g. `?status=draft` has no effect). URLs over 2048 characters are rejected (400).
- **Content writes** (`src/server/modules/*/*.schema.ts`, `validation/`): every input schema is `.strict()`, an explicit allow-list. Unknown or protected keys (`id`, `createdAt`, `updatedAt`, `publishedAt`, anything else) are rejected rather than silently kept. `status` is the only lifecycle field a writer may set, and `publishedAt` is stamped by the server. Types, enums, lengths, array sizes, URLs (http(s) or root-relative only, so no `javascript:`), required alt text and NUL-free text are enforced. Ordinary marketing copy (quotes, `&`, `<`, currency symbols, accents) is stored untouched; there is no HTML stripping. Rendering must escape it (React does by default), and JSON-LD is serialised with `<` escaped.
- **Public write** (`src/server/modules/enquiries/enquiries.schema.ts`): same `.strict()` allow-list discipline as content writes. `name`/`phone`/`serviceOfInterest` ≤200 chars, `message` ≤5000 chars, `email` must parse as a valid address, all server-validated regardless of what the frontend already checked. The request body itself is size-capped (20,000 bytes) before JSON parsing, and malformed JSON is a plain 400, never a raw parser exception.
- **Media** ([MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md)): URLs must be root-relative or https, with no credentials, traversal, signed/temporary query parameters or non-media extensions; production also requires an approved host and refuses localhost/private addresses. Social images cannot be SVG/AVIF, and non-public image hosts are dropped from OG output on indexable tiers. There is no upload endpoint.
- **Slugs**: format, reserved words, identifier-like values, per-type uniqueness (409), same-intent guard for services; published slugs never change unless a slug is explicitly supplied (then a 301 record is kept). See [SLUG_STRATEGY.md](SLUG_STRATEGY.md).
- **References**: every related id must exist (422 with the offending field), checked on every write (MongoDB has no foreign keys).
- **SEO fields**: an explicit `canonicalUrl` must be on the configured site origin (external, look-alike and other-port origins are refused at entry); robots flags are booleans; OG/Twitter images need a valid URL and alt text.
- **Publish gates** ([validation/publish.ts](src/server/validation/publish.ts)): service and career need `description`; case study needs at least one of challenge/strategy/execution and verified metrics; Home needs a hero heading. Re-checked on every edit of a published record. Errors name the field.
- **Database**: all queries use the MongoDB driver with typed filter objects built from validated input (zod); no query is assembled from raw strings and no operator can be injected through a field value. Constraint violations are translated (duplicate key 11000 → 409, validator failure 121 → 422); anything else is a generic 500. Public lists are limited (pagination, or a 100 cap).

## Errors

One function, `fail()` ([lib/response.ts](src/server/lib/response.ts)), produces every error body: `{ success:false, message, error:{ code, fields? } }`.

| Status | `error.code` | Source |
|---|---|---|
| 400 | `BAD_REQUEST` | malformed slug, oversized URL |
| 401 / 403 | `UNAUTHORIZED` / `FORBIDDEN` | Supported by the error model; **no endpoint returns them yet** |
| 404 | `RESOURCE_NOT_FOUND` | unknown, draft, renamed or id-style slug; unknown `/api` path |
| 405 | `METHOD_NOT_ALLOWED` | any write method on `/api`, except `POST /api/contact` |
| 409 | `CONFLICT` | duplicate slug (internal writes) |
| 422 | `VALIDATION_ERROR` | invalid query parameters (with `fields`), content rules |
| 429 | `RATE_LIMITED` | with `Retry-After` |
| 500 | `INTERNAL_SERVER_ERROR` | anything unexpected |

The response is identical in development and production: no stack, driver or driver text, file path, or configuration ever reaches a client. Diagnostics (message and stack) go to the server log only, redacted.

## Rate limiting

[api/rate-limit.ts](src/server/api/rate-limit.ts): fixed window, in memory, keyed by the first `x-forwarded-for` hop (≤ 64 chars), with the write/read scopes kept in separate buckets (`clientKey(headers, scope)`) so exhausting one never blocks the other for the same visitor. **Public reads: 120 requests/minute per client** (about 2/s sustained, above normal browsing and crawler behaviour; the largest page makes a handful of API calls). **Public writes (`POST /api/contact`): 5 requests/minute per client** — well above normal form-filling speed, tight enough to blunt a scripted flood. Requests that carry no client address (no `x-forwarded-for`) are **not** limited: pooling all of them into one shared bucket would let the limit lock every visitor out (found and fixed during sign-off, for reads; the same reasoning applies to writes). Bucket count is capped (10 000, oldest evicted) so spoofed keys cannot exhaust memory. The first rejection per window is logged at `warn` (path only). Limitations: state is per instance and resets on restart; `x-forwarded-for` is only reliable behind a proxy that sets it. Use CDN/edge limits for real abuse protection.

**Contact form spam handling:** an invisible honeypot field (`enquiries.schema.ts`/`ContactForm.tsx`) — a real bot filling every input triggers it, a human never does. A filled honeypot returns the same success response but writes nothing to the database, so the sender gets no signal about what was detected. No CAPTCHA was added: the developer requirements call for an invisible method where one is sufficient, and rate limiting plus the honeypot cover the realistic threat for a low-volume contact form.

## Security headers ([next.config.ts](next.config.ts))

On every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera, microphone, geolocation, payment, usb, topics disabled), `Cross-Origin-Opener-Policy: same-origin`, and `Strict-Transport-Security` (2 years, includeSubDomains, no preload) **only when `APP_ENV=production`**. `X-Powered-By` is removed. Outside production every response also carries `X-Robots-Tag: noindex, nofollow`, and `/api/**` always does.

**Deliberate exception:** the Content-Security-Policy is limited to `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. There is no `script-src`/`style-src`/`img-src`/`font-src` yet, because Next.js inline scripts need per-request nonces and the frontend's fonts, analytics and media hosts are undecided; a generic CSP would break the site. Add those directives (with nonces) when the frontend integrations are known.

## CORS

None. The site and its API share one origin, so no `Access-Control-*` header is sent and cross-origin browser reads are blocked by default. If a separate frontend origin is ever introduced, add an explicit allow-list per environment; never `*`.

## Environment and secrets

Classification and rules are in [ENVIRONMENT.md](ENVIRONMENT.md). Summary: the only browser-visible variable is `NEXT_PUBLIC_SITE_URL`; `MONGODB_URI` is SECRET and server-only (required outside development); all variables are validated in `server/config/env.ts` (which imports `server-only`), and production refuses a non-https or localhost site URL. `.env*` (except `.env.example`) is git-ignored and `.env.example` holds names only.

Verified in this phase: a scan of every project file for credential patterns found none; after a build with dummy secret values set, none appeared in the browser bundle (`.next/static`); an automated test fails if `process.env` is read outside the approved configuration files, if a second `NEXT_PUBLIC_` variable appears, or if a credential-like string is committed. No git history exists in this workspace, so history could not be scanned; do that once the repository is under version control. No real secret was found, so no rotation is required.

## Logging ([lib/logger.ts](src/server/lib/logger.ts))

JSON lines with levels `debug/info/warn/error` (`LOG_LEVEL`, default `info`). Logged: rejected requests (400/409/422, at `info`), rate-limit onset (`warn`), unhandled errors (`error`, with stack, server-side only). Requests are identified by method and **path only** (never the query string, headers, or body). Metadata is redacted before output: values under keys such as `password`, `token`, `secret`, `authorization`, `api key`, `cookie`, `database url`, and credentials embedded in URLs. 404s are not logged (routine crawler noise).

## Known limitations

- No authentication/authorization or admin surface (by design for now). `POST /api/contact` is the one write endpoint that exists, and it is intentionally minimal — see `API.md`.
- Rate limiting is per instance.
- No CAPTCHA on the contact form (an invisible honeypot plus rate limiting is used instead — see "Rate limiting" above); this is a deliberate choice per the developer requirements, not a gap.
- CSP is partial (see above). HSTS preload is not enabled.
- Content may contain HTML-like text by design; consumers must escape on render (never `dangerouslySetInnerHTML` with content fields). The single exception is `components/JsonLd.tsx`, which injects `serializeJsonLd()` output (escaped so it cannot close the script tag; tested).
- Cached responses can serve an unpublished item for up to 60 s (no on-demand purge).
- `npm audit`: production dependencies report 0 vulnerabilities. The earlier dev-only advisories came from `drizzle-kit`, which was removed with the MongoDB migration; re-run `npm audit`. Automate updates (Dependabot/Renovate) once the repository is hosted.
- Database outages return a generic 500 (no 503 is defined in the error model).
- The build and tests ran against a local throwaway `mongod`; no hosted MongoDB was available.
