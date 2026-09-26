# API

Public JSON API for the website. No authentication anywhere, and CRM is out of scope. Almost every endpoint is read-only; the one exception is `POST /api/contact` (Stage 3, Phase 7 — see "Write endpoints" below), a deliberately minimal, reviewed exception, not a general write allowance.

```
Route file (src/app/api/**/route.ts)  →  publicGet()  →  controller  →  content service  →  database
                                          rate limit,     parse params,   queries + publishing   MongoDB
                                          envelope,       project to      rules (isPublished)
                                          cache headers   public DTO
```

- Route files are two lines: `export const GET = publicGet(controller)`.
- Controllers: [src/server/api/public-content.controller.ts](src/server/api/public-content.controller.ts). No queries or business rules.
- Public representation: [src/server/api/serializers.ts](src/server/api/serializers.ts). Every field is listed explicitly; database rows are never serialised directly.
- Services and queries: `src/server/modules/*`. SEO: `src/server/seo/*`.

Server components (e.g. `/services/[slug]`) call the same content services in-process for their own rendering; the HTTP API exists for the progressive frontend, client-side fetching and external consumers. Both go through the same published-only queries.

## Conventions

**Envelope** (every endpoint, including `/api/health`)

```json
{ "success": true, "data": {}, "meta": {} }
{ "success": false, "message": "The requested service was not found.", "error": { "code": "RESOURCE_NOT_FOUND" } }
{ "success": false, "message": "Invalid request data.", "error": { "code": "VALIDATION_ERROR", "fields": { "limit": "Too big: expected number to be <=50" } } }
```

`meta` appears on collections. `fields` (field name → message) appears only on validation errors. Error responses are identical in every environment and never contain stack traces, driver text, paths or configuration; see [SECURITY.md](SECURITY.md).

| Status | `error.code` | When |
|---|---|---|
| 200 | – | Success |
| 400 | `BAD_REQUEST` | Malformed slug (not lowercase kebab-case, > 100 chars); URL longer than 2048 characters |
| 404 | `RESOURCE_NOT_FOUND` | No published content for that slug (unknown, draft, renamed, or an id); unknown `/api` path |
| 405 | `METHOD_NOT_ALLOWED` | Any method other than GET/HEAD/OPTIONS on `/api/**` (`Allow` header) |
| 422 | `VALIDATION_ERROR` | Invalid query parameters, with `fields` |
| 429 | `RATE_LIMITED` | Rate limit exceeded (`Retry-After` header) |
| 500 | `INTERNAL_SERVER_ERROR` | Anything unexpected. The message is always generic; details go only to the server log |

`401`, `403` and `409` exist in the error model but no public endpoint returns them (no authentication). Every endpoint below is **PUBLIC READ** except `POST /api/contact`, which is **PUBLIC WRITE**; there are no internal or admin HTTP endpoints.

**Query rules.** Only the documented parameters are read; unknown ones are ignored and cannot change results (e.g. `?status=draft` does nothing). A parameter given twice is rejected (422), as are control characters and values over the documented lengths. The request URL may be at most 2048 characters.

**Pagination** (`/api/services`, `/api/work`, `/api/insights`): `?page=1&limit=12`. Defaults `page=1`, `limit=12`; `limit` max 50, `page` max 10000. Out-of-range or non-numeric values return 422 (never clamped). Order is deterministic (with a slug tie-breaker) so pages do not overlap. `meta`: `{ page, limit, total, totalPages }`. Testimonials and clients are small curated sets, so they are not paginated: capped at 100 with `meta.total`.

**Media.** Every image in a response is a projected object `{url, alt, width?, height?, mimeType?, format?, caption?, decorative?, loading, srcSet?}` and every video `{url, mimeType, poster, duration?, width?, height?, autoplay, muted, loading}`; `loading` is `"eager"` for above-the-fold hero media and `"lazy"` otherwise. No storage or provider fields are returned. Details in [MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md). The `seo` block keeps its own absolute image URLs.

**Public paths, not ids.** Detail records are addressed by slug only. Every item carries `slug` and `path` (e.g. `/services/performance-marketing`) so the frontend can link without building URLs. No database ids, `displayOrder`, `status`, `createdAt` or metric `source` notes are ever returned. Order is expressed by array order.

**No redirects in the API.** A renamed slug returns 404 here; the page routes (`/services/[slug]` etc.) issue the 301.

**Caching.** Successful responses send `Cache-Control: public, s-maxage=60, max-age=60`; errors send `no-store`. An unpublished item can therefore still be served for up to 60 seconds by a CDN or browser sitting in front of this JSON API specifically. There is no on-demand purge yet (no write path exists to trigger one). Drafts are never returned, so they cannot enter a cache. **This does not apply to the actual website pages** (`/services/[slug]` etc.): every page is `dynamic = "force-dynamic"` and reads the database directly, in-process — its own response carries `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` (Next.js's default for a fully dynamic route), so a publish, edit or unpublish is reflected on the live page immediately, with no cache layer to invalidate. Verified live (Stage 5, Phase 4): editing a published Service's content appeared on its page on the very next request. The 60-second window above only matters if something external ever fetches this JSON API directly through a caching layer — nothing does today.

**Rate limiting.** 120 requests per minute per client (first `x-forwarded-for` hop) for reads, in memory, per server instance ([rate-limit.ts](src/server/api/rate-limit.ts)), with a bounded bucket table. `POST /api/contact` uses a separate, much tighter bucket (5/minute) keyed independently of reads, so exhausting one never blocks the other. Both are a best-effort guard well above normal browsing/crawler rates and normal form-filling speed respectively. Requests without a client address are not limited. Limits reset on restart and are not shared between instances, and `x-forwarded-for` is only trustworthy behind a proxy that sets it, so real abuse protection belongs at the CDN/edge. Details in [SECURITY.md](SECURITY.md).

**Indexing.** Every `/api/**` response carries `X-Robots-Tag: noindex, nofollow`; the API is not disallowed in robots.txt (see [SEO_INDEXING.md](SEO_INDEXING.md)).

**CORS.** None: the API is same-origin and sends no `Access-Control-*` headers.

**SEO in responses.** Detail endpoints and Home include `seo`, produced by the same `resolveMetadata` that drives `generateMetadata`, so they cannot disagree:
`{ title, description, canonical, robots: {index, follow}, openGraph: {title, description, url, type, siteName, image}, twitter: {card, title, description, image}, publishedTime?, modifiedTime? }`. `canonical` is built from `NEXT_PUBLIC_SITE_URL` and the slug's route, never from the request host. `robots` is `noindex, nofollow` unless `APP_ENV=production`. Editorial fields (`primarySearchTopic`, etc.) are not exposed.

**Publishing.** Only published content is returned, enforced in the query layer. Related items and joined records (client, testimonial, author, related services/case studies/insights) are included only if they are themselves published.

## Endpoints

### `GET /api/health`
Liveness plus configuration: `data: { status: "ok" }`, `Cache-Control: no-store`. It returns a safe 500 if the environment is invalid or incomplete (the log names the variable) and does not touch the database. It reveals nothing about the environment or dependencies.

### `GET /api/home`
The published Home page; 404 until it is published. `data` has one key per section, always present, `null` when a section has nothing to show: `seo`, `hero`, `businessProof`, `story`, `services`, `growthEngine`, `selectedWork`, `results`, `whySmash`, `testimonials`, `technology`, `insights`, `bannerCta`, `industries`, `ourStory`, `team`, `cta`, `links`, `publishedAt`, `updatedAt`. Referenced services, case studies, testimonials, insights and team members are card summaries in the editor's order, published ones only, with canonical `slug`/`path`. Fixed cost: 6 queries plus the site settings read (run in parallel), however many items are referenced. Stored section content that fails validation is returned as `null` and logged by section name. The complete field-by-field contract, with rules, null semantics and frontend guidance, is in [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md).

### `GET /api/services`
Query: `page`, `limit`. Ordered by display order then name. Item (`ServiceSummary`): `{ name, slug, path, shortDescription, image }`.

### `GET /api/services/:slug`
`{ name, slug, path, shortDescription, description, hero, problem, solution, deliverables[], process[], tools[], faqs[], cta, relatedCaseStudies[{title, slug, path, summary, image}], relatedInsights[{title, slug, path, excerpt}], publishedAt, updatedAt, seo }`. Errors: 400, 404.

### `GET /api/work`
Query: `page`, `limit`. Newest first. Item (`CaseStudySummary`): `{ title, slug, path, summary, industry, image, client: {name, logo} | null, publishedAt }` (client only if published).

### `GET /api/work/:slug`
`{ title, slug, path, summary, industry, challenge, strategy, execution, results[{label, value, description?, context?, link?}], heroImage, media[], client, testimonial, relatedServices[{name, slug, path, shortDescription}], relatedInsights[…], publishedAt, updatedAt, seo }`. `client`/`testimonial` are `null` unless published. Errors: 400, 404.

### `GET /api/insights`
Query: `page`, `limit`, `category` (exact match; an unknown category returns an empty list). Newest first. Item (`InsightSummary`): `{ title, slug, path, excerpt, image, category, tags, author: {name, role} | null, publishedAt, updatedAt }`. The article body is not read.

### `GET /api/insights/:slug`
`{ title, slug, path, excerpt, content (Markdown), image, category, tags, author: {name, role, photo} | null, relatedServices[{name, slug, path}], relatedCaseStudies[{title, slug, path}], publishedAt, updatedAt, seo }`. Errors: 400, 404.

### `GET /api/careers`
Not paginated (small curated set, same pattern as testimonials/clients), display order = newest published first. Item (`CareerSummary`): `{ title, slug, path, summary, location, employmentType, publishedAt }`. `meta: { total }`. Added in Stage 2, Phase 4 to unblock the Careers hub page — see `CONTENT_CONTRACTS.md`.

### `GET /api/careers/:slug`
`{ title, slug, path, summary, description, requirements[], responsibilities[], location, employmentType, publishedAt, updatedAt, seo }`. Errors: 400, 404. Added in Stage 2, Phase 4; the existing `src/app/careers/[slug]/page.tsx` continues to read the same content in-process via `getPublishedCareerBySlug` and is unaffected by this endpoint's addition.

### `GET /api/testimonials`
`data: [{ quote, personName, personRole, companyName, photo }]`, display order. `meta: { total }`.

### `GET /api/clients`
`data: [{ name, description, website, industry, logo }]`, display order. `meta: { total }`.

### `GET /api/site-settings`
`{ siteName, siteDescription, logo, favicon, socialLinks[], contact, defaultCta, defaultSeo, defaultOgImage, updatedAt }`; 404 until settings exist. Everything here is public: only put information approved for publication in `contact`. Environment variables and secrets are never part of this response.

## Write endpoints

### `POST /api/contact`
The public contact form (Stage 3, Phase 7). Not CRM: it persists one row (`enquiries`) and nothing else — no assignment, pipeline, or staff notification exists. `serviceOfInterest`, if sent, must match an actual published Service's name (Stage 6, Phase 3) — a request naming an unknown or draft service is refused (422), so the raw log can't fill with arbitrary strings a real visitor could never have produced from the form's own dropdown. An administrator can read submissions back (`GET /api/admin/enquiries`, `GET /api/admin/enquiries/:id` — Stage 6, Phase 3): list/get only, no create/update/delete, since a submission is an immutable record, not editable content. Not available to the Content Editor role — this is visitor personal data, not website content (same reasoning as Site Settings).

Body: `{ name, email, message, phone?, serviceOfInterest? }`. `name` and `phone`/`serviceOfInterest` ≤200 chars, `message` ≤5000 chars, `email` must be a valid address; all are server-validated with `zod` regardless of frontend validation. Unknown fields are rejected (`.strict()`), except `honeypot` (see below).

Response: `{ success: true, data: { received: true } }` — the submission is never echoed back. Errors: 400 (malformed/oversized JSON body), 422 (`VALIDATION_ERROR`, with `fields`), 429 (`RATE_LIMITED`, its own bucket — see "Rate limiting" above). Never cached (`Cache-Control: no-store`).

**Spam handling:** the request body may include `honeypot`, a field the real form hides from visitors with CSS (never `display:none`, since some bots specifically skip that). A non-empty value marks the submission as spam — the response is still `{ success: true, data: { received: true } }` (identical to a real success) but nothing is written to the database, so an adaptive bot gets no signal about what tripped the trap.

This is the one *public* route `src/proxy.ts` allows POST on; every other `/api/**` path still answers any non-GET/HEAD/OPTIONS method with a 405 before reaching a handler — except `/api/admin/**` (below), which the proxy lets every method through unchecked, deferring authorization to the route itself.

## Admin API (Stage 4, Phase 2; roles added Stage 5, Phase 1)

Content management, not public. A non-developer-oriented walkthrough with copy-paste examples is [CMS_GUIDE.md](CMS_GUIDE.md); this section is the exact technical contract.

**Authentication:** every request needs `Authorization: Bearer <token>` (`admin-auth.ts`), checked with a constant-time comparison against two possible shared secrets:

| Token | Role | Restriction |
|---|---|---|
| `ADMIN_API_TOKEN` | `administrator` | None. |
| `CMS_EDITOR_API_TOKEN` (optional) | `editor` | Any create/update whose body sets `"status": "published"` is refused (403) — an administrator must publish. `/api/admin/site-settings` (both `GET` and `PATCH`) is refused (403) entirely — it has no draft/publish state to gate per-request, so it's administrator-only wholesale. Draft preview (below) is unrestricted for either role: previewing is a read, not a publish action. |

Missing/wrong/unrecognized token → 401. If `ADMIN_API_TOKEN` isn't set at all, every admin request is a safe 500 ("not configured") — never silently open; `CMS_EDITOR_API_TOKEN` is entirely optional and independent (env-validated to require `ADMIN_API_TOKEN` and to differ from it — `env.ts`). Its own rate-limit bucket (`RATE_LIMITS.admin`, 30/min per client) is deliberately tight. Never cached (`Cache-Control: no-store`). Responses are the **raw stored shape** (draft/published, `id`, `createdAt`, everything) — never `publicizeMedia`-projected — because an editor needs to see and change the real record, not the public wire projection.

This is still two shared credentials, not a multi-user/session system — a deliberate, minimal extension of Phase 2's single-secret design (`admin-auth.ts`'s own comment: "upgrading to real multi-user auth later only touches this file, not the CRUD logic") rather than building the site's first full auth system speculatively (sessions, password storage, per-user accounts). Every admin controller (`admin.controller.ts`) delegates to the exact same service functions (`createService`/`updateService`, etc.) the rest of the codebase already used in-process — no new validation, slug, publish-gate or relationship logic was written for role separation, only the one `assertMayPublish` check and the `requireRole` route option.

**Content types**, each at `/api/admin/<type>` (list, create) and `/api/admin/<type>/:id` (get, update) — `:id` is the record's real database id (a UUID), not its slug:

| `<type>` | Maps to |
|---|---|
| `services` | `Service` |
| `work` | `CaseStudy` |
| `insights` | `Insight` |
| `team` | `TeamMember` |
| `testimonials` | `Testimonial` |
| `clients` | `Client` |
| `careers` | `Career` |

`GET /api/admin/<type>` supports `?page&limit` (same as the public collection endpoints) and returns every status, drafts included, newest first. `POST`/`PATCH` accept the same input shape `create*`/`update*` already validated in-process (`.strict()`, so unknown fields are rejected) — see each module's `*.schema.ts`. Setting `"status": "published"` runs the existing publish-gate validation (`assertPublishable`) first — incomplete content, or content still containing literal "Lorem ipsum" placeholder text (Stage 5, Phase 1), is refused and stays a draft. Errors: 400 (malformed id/JSON/oversized body), 401, 403 (editor role tried to publish, or tried Site Settings), 404, 409 — an exact-duplicate slug; a near-duplicate targeting the same topic (`assertNoDuplicateIntent`, Stage 5 Phase 2, e.g. `x` and `x-services`, every slugged content type); or, on publish only, an explicit `seo.canonicalUrl` override that resolves to the same URL as another already-published page's canonical, of any content type (`assertNoCanonicalConflict`, Stage 5 Phase 3 — real-time, not just the `seo:audit` report) — 422 (validation, relationship, or publish-gate failure, all with `fields` where applicable), 429.

Two singletons have no list, just `GET`/`PATCH`: `/api/admin/home` (`HomePage`) and `/api/admin/site-settings` (`SiteSettings`, administrator-only — see the role table above) — both use the existing `saveHomePage`/`saveSiteSettings` upsert functions. Publishing an indexable Home (`seo.robotsIndex` not `false`) requires its own `seo.metaTitle` and `seo.metaDescription`, and an explicit `seo.canonicalUrl` must be the Home URL; a missing field returns a 422 naming it (`seo.metaTitle`, `seo.metaDescription`, `seo.canonicalUrl`). `GET /api/admin/home` also returns `seoReadiness: { indexable, required[], recommended[] }`: what still blocks publishing, and softer gaps (no Site Settings, no social image, over-long title/description).

**Preview** (`server/api/preview.ts`): `/preview/services/:slug`, `/preview/work/:slug`, `/preview/insights/:slug`, `/preview/careers/:slug`, each `?token=<ADMIN_API_TOKEN or CMS_EDITOR_API_TOKEN>`. Renders the real page components against the record regardless of its status (so a draft is visible), with a visible "Preview" banner. A missing or wrong token calls `notFound()` — indistinguishable from an unknown page, so a preview URL never reveals that preview access exists. Always `noindex, nofollow` (both the page's own metadata and an `X-Robots-Tag` header, on every tier), and `robots.txt` explicitly disallows `/preview/` in production as a further, non-authoritative signal to well-behaved crawlers.

## API versioning (Stage 2, Phase 3 decision)

**No `/v1` prefix, and none is planned.** The API has no external consumers yet (it serves this same Next.js app's pages and, potentially, its own client-side fetches — see `FRONTEND_INTEGRATION.md`), so there is nothing to version against. Introducing `/v1` now would be speculative complexity with no present benefit, and every breaking-change episode so far (Phases 5–9, listed above) was handled by an explicit, documented, in-place change while the API had zero real consumers — the correct approach pre-launch. If the API ever gains an external consumer (a mobile app, a partner integration), version at that point by prefixing new routes (`/api/v2/...`) while leaving `/api/...` serving `v1` semantics indefinitely; nothing in the current route structure (`src/app/api/**/route.ts`) blocks adding a parallel `/v2` tree later. This is a placement decision, not a rewrite.

## Content contract freeze (Stage 2, Phase 3)

The response shapes documented in this file are now frozen per [CONTENT_CONTRACTS.md](CONTENT_CONTRACTS.md): fields are not silently renamed or removed; changes are additive unless a breaking change is explicitly declared and documented the way Phases 5–9 above were. Exported TypeScript types for every response shape (`ServiceSummary`, `ServiceDetail`, `CaseStudySummary`, `CaseStudyDetail`, `InsightSummary`, `InsightDetail`, `Testimonial`, `Client`, `SiteSettingsPublic`, `HomeResponse`, `ApiSuccess`, `ApiFailure`, `PaginationMeta`) now exist in code so a consumer never has to re-derive a shape from the database or guess at it — see `FRONTEND_INTEGRATION.md`.

## Not implemented

A public team-detail API (a `teamMemberDto` exists and is used by the About page in-process, but there is no public `GET /api/team` — `/api/admin/team` is the admin equivalent); a multi-*user*/session admin auth system (two shared role-tokens — administrator/editor — not per-person accounts; see "Admin API" above); an admin UI (CMS_GUIDE.md's commands, not a screen); permanent deletion of admin content (unpublish only); audit logging of *who specifically* changed something (only *which role* — administrator or editor — is known); on-demand cache invalidation; CORS headers (same-origin use assumed); ETags; *actioning* a submitted enquiry (Stage 6, Phase 3 added read-back — `GET /api/admin/enquiries` — but there is still no status, assignment, or notification: no CRM surface exists).

## Breaking changes

**Phase 9.** `GET /api/home` sections now use one explicit, documented shape (nothing consumed the earlier pass-through JSON yet): `hero` is `{eyebrow, heading, supportingText, primaryCta, secondaryCta, image, video}` (was `label`, `supportingCopy`, `ctas[]`, `media`), `story.points`→`supportingPoints`, `story.media`→`image`, `whySmash.items`→`reasons`, `cta` is `{eyebrow, heading, description, primaryCta, secondaryCta}`; service pages use the same hero shape; sections with no content are `null` (empty sections used to be `{items: []}`); metric, step, reason and technology items carry `order`; work cards gain `keyResult`; `links` was added. Writes are stricter: CTA and metric-link targets must be a defined canonical route or an `https` URL, and a hero holds at most two CTAs.

**Phase 7.** Additive only: media objects gained `mimeType`, `format`, `caption`, `decorative`, `loading` and `srcSet`; nothing was removed. Writes are stricter: media URLs, alt text and dimensions are validated (see MEDIA_ARCHITECTURE.md), so previously accepted values such as `http://` URLs, `alt: "image"` or a width without a height are now rejected.

**Phase 6.** Error codes are now `RESOURCE_NOT_FOUND` (was `CONTENT_NOT_FOUND`) and `INTERNAL_SERVER_ERROR` (was `INTERNAL_ERROR`); validation errors carry `fields` (a map) instead of `details` (an array); `/api/health` no longer returns `env`; non-read methods on `/api` return 405; a repeated query parameter is now a 422. No consumer existed outside the tests.

**Phase 5.**

The envelope changed from `{data}` / `{error:{code,message}}` to the shapes above, and validation errors now return **422** (was 400). Only `GET /api/health` existed as an endpoint, so its body gained `success: true`. In the server code, `listPublished{Services,CaseStudies,Insights}` now take pagination and return `{items, total}` of card summaries (previously full rows); no application code outside tests consumed them.

## Server-side functions (used by pages and controllers)

Public reads: `getPublishedHome`, `listPublished{Services,CaseStudies,Insights,Testimonials,Clients,Team,Careers}`, `getPublished{Service,CaseStudy,Insight,Career}BySlug`, `getSiteSettings`, and the `getPublished*Summaries` helpers. SEO: see [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md). Write functions (`create*`/`update*`, `saveSiteSettings`, `saveHomePage`) are internal, with no HTTP surface and no authentication. Their input schemas are strict allow-lists; an unknown or protected field (`id`, `publishedAt`, …) is rejected, and publishing requires the content-type minimums listed in [SECURITY.md](SECURITY.md).
