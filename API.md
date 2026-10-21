# Public API Reference

All public endpoints live under `/api/**` (no version prefix — see "Versioning" below). Admin/CMS endpoints (`/api/admin/**`) and the CRM (`/api/leads`) are bearer-token/session protected and out of scope for this document.

## Response contract

Every route goes through `publicGet`/`publicPost` (`src/server/api/handler.ts`), which always return one of two shapes.

**Success:**

```json
{ "success": true, "data": { /* or [] for a list */ }, "meta": { "pagination": { "page": 1, "limit": 12, "total": 42, "totalPages": 4 } } }
```

`meta.pagination` is present only on paginated list endpoints.

**Error:**

```json
{ "success": false, "message": "Readable error message", "error": { "code": "ERROR_CODE", "fields": { "...": "..." } } }
```

`error.fields` is present only for `VALIDATION_ERROR` (422). No route ever returns a stack trace, database error text, or internal field names — see `src/server/lib/response.ts` and `src/server/lib/errors.ts`.

## HTTP status codes

| Status | Meaning | Example |
|---|---|---|
| 200 | Success | Any valid read |
| 400 | Malformed request | Invalid/oversized slug, repeated query params |
| 404 | Not found | Unknown or unpublished slug |
| 409 | Conflict | Duplicate slug/canonical on write (admin only) |
| 422 | Validation failure | `limit=999999`, `page=0`, bad body field |
| 429 | Rate limited | Too many requests from one client in the current window |
| 500 | Unexpected server error | Logged server-side; response body never reveals internals |

## Endpoints

| Endpoint | Method | Purpose | Pagination | Notes |
|---|---|---|---|---|
| `/api/health` | GET | Liveness/env check | — | No DB access |
| `/api/home` | GET | Full Home page payload (all 12 sections) | — | Fixed ~6 DB round-trips regardless of how many items each section references |
| `/api/services` | GET | Published services, card-level fields only | `?page&limit` (max 50) | |
| `/api/services/[slug]` | GET | Full service detail incl. related case studies/insights | — | 404 if unpublished/unknown; 400 if slug malformed |
| `/api/work` | GET | Published case studies, card-level fields only | `?page&limit` (max 50) | |
| `/api/work/[slug]` | GET | Full case study detail incl. client/testimonial/related services/insights | — | Same slug rules as services |
| `/api/insights` | GET | Published articles, card-level fields only (never the article body) | `?page&limit&category` (max 50) | |
| `/api/insights/[slug]` | GET | Full article incl. author/related services/case studies | — | Same slug rules |
| `/api/careers` | GET | Published job listings | — (unbounded; careers volume is small by nature) | |
| `/api/careers/[slug]` | GET | Full job listing | — | Same slug rules |
| `/api/clients` | GET | Published clients | — (hard cap of 100 items) | |
| `/api/testimonials` | GET | Published testimonials | — (hard cap of 100 items) | |
| `/api/site-settings` | GET | Singleton site settings | — | |
| `/api/contact` | POST | Contact form submission | — | Zod-validated, honeypot, body size cap |
| `/api/[...path]` | GET/* | Catch-all for unknown `/api/*` paths | — | Returns a JSON 404, never falls through to the page router |

`/api/careers`, `/api/clients`, `/api/testimonials` are intentionally unpaginated — their content is curated and small by design. If any of these collections is expected to grow materially, add `?page&limit` using the same `pageQuerySchema` the other list endpoints already share (`src/server/api/query.ts`).

## Client workspace endpoints (CRM admin and client portal)

Session-protected JSON APIs, never cached (`Cache-Control: no-store`), separate from the public endpoints above. The admin ones need the CRM
session cookie (`adminSessionApi`); the portal ones need a signed-in client at the `ready` stage (`clientSessionApi`) and always act on
the account in the session, never on an id from the URL. Every per-client record carries `accountId` and every read and write filters on it.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/client-accounts/[id]/records/[kind]` | GET, POST | List / add records. `kind` is `projects`, `creatives`, `leads`, `invoices` or `tickets`; anything else is a 404 |
| `/api/admin/client-accounts/[id]/records/[kind]/[recordId]` | PUT, DELETE | Replace the editable fields (the editor sends the whole record) / delete |
| `/api/admin/client-accounts/[id]/records/[kind]/[recordId]/messages` | POST | A SMASH reply on a content item or ticket (a ticket reply can also set its status) |
| `/api/admin/client-accounts/[id]/workspace` | GET, PUT | One section of the client's workspace: `{ section, value }` for `accountManager`, `profile`, `connectedPlatforms`, `teamMembers`, `billingPlan`, `meetings`, `notifications`, `terms`, `enabledSections` |
| `/api/admin/client-accounts/[id]/dashboard` | GET, PUT | Campaign figures (campaigns with reach, impressions, clicks, engagement, conversions, revenue; monthly series). With campaigns, the headline totals are their sum. **`totalBudget` is required and must be above 0**, it is never replaced by the campaigns' budgets, and a typed `amountSpent` is ignored (spend comes from the daily updates). A 422 on `totalBudget` when it is lower than what is already spent, or lower than the campaigns' budgets added up. Every change to the total is logged in `budgetLog` (who, when, from, to; the last 20) |
| `/api/admin/client-accounts/[id]/daily` | PUT | The daily performance report: `{ date: "YYYY-MM-DD", entries: [{ campaignId, spend, leads, calls, reach, impressions, clicks, engagement, conversions, revenue }] }`. Replaces that day for each campaign listed (an all-zero entry clears it; `campaignId: ""` is activity not tied to a campaign). No future days, none older than two years. A campaign with daily entries shows the sum of its days (totals, headline numbers and the monthly chart follow); the client's "last updated" moves to now. **Spend is drawn from the total budget:** the save is refused with a 409 when the client has no total budget (nothing is created), and with a 409 saying how far over (and how much is left) when it would take total spend past the budget. A save that lowers spend is always allowed, so older over-budget data can be corrected |
| `/api/admin/uploads/sign` | POST | `{ accountId, kind: "invoice" \| "creative" }` → a Cloudinary signature for a direct browser upload into `clients/<id>/<kind>s` |
| `/api/client/creatives/[id]/respond` | POST | Approve, request changes or reject content awaiting a decision (a reason is required unless approving). Decided once, atomically |
| `/api/client/tickets` | POST | Open a ticket or request |
| `/api/client/tickets/[id]/messages` | POST | Reply on their own ticket (reopens a resolved one; a closed one answers 409) |
| `/api/client/terms/accept` | POST | Accept the terms currently in force (records who, when and which version) |
| `/api/client/files/invoice/[id]` | GET | A five-minute signed download link for one of their own invoices' files |
| `/api/client/auth/forgot-password` | POST | Public. `{ email }` → checks the address is a registered, active client account and emails a 6-digit reset code, valid 10 minutes from when it was first sent. `{ requested: true, resent, waitSeconds }` on success: asking again after the one-minute pause re-sends the **same** code (`resent: true`, same expiry, wrong-guess count carried over); a new code is made only when there is none, it expired, or its five tries are used up. A repeat inside the minute sends nothing and returns the seconds left. An unregistered or disabled address is a 400 with a message on `email` and no email is sent. Rate limited |
| `/api/client/auth/forgot-password/verify` | POST | Public. `{ email, code }` → `{ valid: true }` if it is the right, unexpired code. Does not use the code up; wrong codes count towards the same five-tries-per-10-minutes limit (resends included) and give the same 400 as `confirm`. The sign-in form calls it as soon as the sixth digit is typed and shows the new-password fields only after it passes |
| `/api/client/auth/forgot-password/confirm` | POST | Public. `{ email, code, newPassword }` → sets the password (8+ characters, not the current one). Wrong, expired and unknown-email cases all give the same 400; five wrong codes kill the code. Success marks the email verified, clears "must reset", ends every open session and does not sign the client in |

Notes: invoice files are stored with Cloudinary `type: authenticated` and are only reachable through that signed link; creatives are stored
under an unguessable generated public id. A record that references a file is accepted only if the file is in this server's Cloudinary
account and in the client's own folder. The Dashboard Overview numbers are not stored: `deriveOverview` (`client-overview.service.ts`)
works them out from the records, and the portal and the admin's Overview tab call the same function.

## Pagination

`?page` and `?limit` are parsed by `pageQuerySchema` (`src/server/api/query.ts`): `page` ≥ 1 (default 1, max 10,000), `limit` 1–50 (default 12). Out-of-range or non-numeric values return `422 VALIDATION_ERROR` — they are never silently clamped, so a client always knows its request was rejected rather than quietly truncated.

## Slugs

Slugs are validated by `parseSlug` (`src/server/api/query.ts`) before ever reaching the database: empty, over 100 characters, or not matching `^[a-z0-9]+(-[a-z0-9]+)*$` → `400`. A well-formed slug that doesn't match a published record → `404`. Slugs are looked up via a unique index per content type (`services_slug_uidx`, `case_studies_slug_uidx`, `insights_slug_uidx`, `careers_slug_uidx`), never a full collection scan.

## Published-content protection

Every public read filters to `status: "published"` at the query layer (`isPublished()`/`publishedAnd()` in `src/server/db/helpers.ts`), not by trusting the request. No public controller reads a `status`/`includeDrafts` query parameter — those exist only as internal function parameters used exclusively by the token-gated `/preview/**` pages, never threaded from a public route's query string.

## Caching

Successful reads are sent with `Cache-Control: public, s-maxage=60, max-age=60` (`src/server/api/handler.ts`) — a CDN/browser may serve a response for up to 60 seconds. Writes (`/api/contact`) always get `no-store`. There is no on-demand cache purge on publish/unpublish; a just-edited item may be visible for up to 60 seconds after the edit. This is a deliberate, bounded tradeoff, not a bug — revisit only if a real staleness complaint arises.

The public **pages** are cached separately (ISR, `src/server/seo/public-cache.ts`): each is served from the cache and regenerated in the background at most an hour after it was built. Every successful admin content write (`POST`/`PATCH`/`PUT`/`DELETE` through `adminApi`) clears that cache, so an edit shows on the next visit. After changing content any other way (a DB script, a direct Atlas edit), clear it with `POST /api/admin/revalidate` (Administrator token, no body); otherwise the change appears within the hour. The Work and Insights listings, preview, admin and client portal pages are never cached.

## Rate limiting

Fixed-window, per-IP (via `x-forwarded-for`), in-memory (`src/server/api/rate-limit.ts`):

| Scope | Limit |
|---|---|
| Public reads | 120 req/min |
| Public writes (`/api/contact`) | 5 req/min |
| Admin API | 30 req/min |
| Admin auth | 10 req/min |

A client over the limit gets `429` with a `Retry-After` header.

## SEO compatibility

- Slugs are the only public identifier — no content type is ever addressed by database ID.
- `canonicalUrl`, `metaTitle`, `metaDescription`, OG/Twitter fields are part of every indexable content type's response (`src/server/validation/common.ts`'s `Seo` type).
- Draft content is excluded from the sitemap and is not indexable (`src/server/seo/sitemap.ts`, `src/server/seo/robots.ts`).

## Versioning

There is no `/api/v1/` prefix, and none is planned. The project is a single first-party frontend consuming its own API — there's no external consumer to version against, and the response contract above is designed to stay stable (adding fields, not renaming/removing them) across frontend redesigns. Introduce versioning only if a real external consumer or a genuinely breaking contract change requires it.
