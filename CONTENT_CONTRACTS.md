# Content contracts — Stage 2, Phase 3 (frozen), extended in Phase 4

This file is the audit and freeze record for the public API's content contracts. Full endpoint-by-endpoint documentation (parameters, status codes, example responses) already exists in [API.md](API.md) and is not duplicated here — this file records *what was verified*, *what changed*, and *what is now frozen*. Section-level content requirements (what copy/media each page needs) are in [PAGE_CONTENT_MATRIX.md](PAGE_CONTENT_MATRIX.md); this file is about the API shape, not the copy.

## 1. Audit of the existing implementation

Per phase brief §4, every public route, controller, service, serializer, and existing frontend consumer was inspected before any change was made.

| Endpoint | Current response | Data source | Frontend consumer | Problems found | Change made |
|---|---|---|---|---|---|
| `GET /api/health` | `{status:"ok"}` | config only | none yet | None | None |
| `GET /api/home` | 12-section object, `seo`, `links` | `HomePage` + 4 referenced types | `src/app/page.tsx` (placeholder) | None | Added `HomeResponse` export type |
| `GET /api/services` | Paginated `ServiceSummary[]` | `Service` | Services hub (not built) | None | Added `ServiceSummary`/`ServiceDetail` export types |
| `GET /api/services/:slug` | `ServiceDetail` | `Service` + related | `src/app/services/[slug]/page.tsx` | None | as above |
| `GET /api/work` | Paginated `CaseStudySummary[]` | `CaseStudy` | Work hub (not built) | None | Added `CaseStudySummary`/`CaseStudyDetail` export types |
| `GET /api/work/:slug` | `CaseStudyDetail` | `CaseStudy` + related | `src/app/work/[slug]/page.tsx` | None | as above |
| `GET /api/insights` | Paginated `InsightSummary[]`, `?category` | `Insight` | Insights hub (not built) | None | Added `InsightSummary`/`InsightDetail` export types |
| `GET /api/insights/:slug` | `InsightDetail` | `Insight` + related | `src/app/insights/[slug]/page.tsx` | None | as above |
| `GET /api/testimonials` | `Testimonial[]`, `meta.total` | `Testimonial` | Home (in-process) | None | Added `Testimonial` export type |
| `GET /api/clients` | `Client[]`, `meta.total` | `Client` | none yet | None | Added `Client` export type |
| `GET /api/site-settings` | `SiteSettingsPublic` | `SiteSettings` | none yet directly (SEO defaults consumed in-process) | None | Added `SiteSettingsPublic` export type |
| `GET /api/careers`, `GET /api/careers/:slug` | `CareerSummary[]`/`CareerDetail` | `Career` | `src/app/careers/[slug]/page.tsx` (in-process, unaffected) + Careers hub (page file still pending, per SEO_SITE_ARCHITECTURE.md §1) | **Fixed in Phase 4** — no HTTP list/detail route existed; the Careers hub page specification (PAGE_SPECIFICATIONS.md) could not be marked "API: Approved" without it | Added both routes, mirroring the testimonials/clients uncounted-list pattern (careers are a small curated set, not expected to need pagination). Server functions (`listPublishedCareers`, `getPublishedCareerBySlug`) already existed; only the HTTP surface and DTOs (`careerSummaryDto`, `careerDetailDto`) were added. 2 new tests added (`tests/api.test.ts`); full suite re-run at 245/245 |

**No duplicate endpoint was created.** Every route above already existed with a correct, tested implementation (243/243 tests passing, `npm run typecheck`/`lint` clean, confirmed by re-running the full suite in this phase). The only code change in this phase is additive: exported TypeScript types mirroring each DTO's actual return shape (§3).

## 2. Response envelope (already implemented, now the frozen standard)

```json
// success, single item
{ "success": true, "data": { } }

// success, collection (only when paginated or countable)
{ "success": true, "data": [ ], "meta": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 } }

// failure
{ "success": false, "message": "Human-readable message", "error": { "code": "RESOURCE_NOT_FOUND" } }
```

This matches the phase brief's target shape exactly, with one intentional naming difference already established in Stage 1 and kept as-is (not "blindly" replaced per phase brief §7): the collection key is `meta`, not `pagination`, because `meta` also carries non-pagination information on some endpoints (e.g. `insights`' echoed `category`, or `testimonials`/`clients`' `{total}` on an uncounted list). Renaming it now would be a breaking change with no benefit — see §5.

## 3. Public response shapes (frozen)

Every shape below is backed by an exported TypeScript type in code (not just this document), so "documentation matches implementation" is enforced by the compiler, not by discipline alone:

| Content type | Summary type | Detail type | Where exported |
|---|---|---|---|
| Home | — | `HomeResponse` | `src/server/api/home.dto.ts` |
| Service | `ServiceSummary` | `ServiceDetail` | `src/server/api/serializers.ts` |
| Case Study | `CaseStudySummary` | `CaseStudyDetail` | `src/server/api/serializers.ts` |
| Insight | `InsightSummary` | `InsightDetail` | `src/server/api/serializers.ts` |
| Testimonial | `Testimonial` | — (one shape) | `src/server/api/serializers.ts` |
| Client | `Client` | — (one shape) | `src/server/api/serializers.ts` |
| Site Settings | `SiteSettingsPublic` | — (one shape) | `src/server/api/serializers.ts` |
| Career | `CareerSummary` | `CareerDetail` | `src/server/api/serializers.ts` (added Phase 4) |
| SEO object | `PublicSeo` | — | `src/server/api/serializers.ts` |
| Envelope | `ApiSuccess<T, M>` / `ApiFailure` | | `src/server/lib/response.ts` |
| Pagination meta | `PaginationMeta` | | `src/server/api/query.ts` |

Every one of these types is a `ReturnType<typeof ...>` of the actual serializer function — they cannot drift from the runtime response, because they *are* the runtime response's type, not a hand-maintained duplicate (this is the mechanism that prevents "backend says one thing, frontend assumes another," phase brief §25).

Full field-by-field content for each shape is already documented in `API.md`'s per-endpoint sections and is not repeated here.

## 4. Contract design principle — verified compliant

Checked every serializer in `src/server/api/serializers.ts` and `src/server/api/home.dto.ts` line by line: **zero** presentation fields (`tailwindClass`, `cssClass`, pixel widths, margins, animation durations) exist anywhere in a public response. Every field describes content (title, slug, description, media, relationship) or semantics (publishedAt, SEO). This was true before this phase and remains true — nothing was added that violates it.

## 5. Backward-compatibility statement

No breaking change was made in this phase. The only additions are:
1. Nine new exported TypeScript types (§3) — purely additive, zero runtime effect.
2. Two new documentation files (this one and `FRONTEND_INTEGRATION.md`) and additions to `API.md` (§"API versioning", §"Content contract freeze").

From this point forward, any field rename, removal, or shape change to a response documented here must: identify who consumes it (frontend page or external), prefer an additive change, update `API.md` + this file + the exported type + its test in the same change, and be called out explicitly as a breaking change if unavoidable — exactly the discipline already demonstrated in `API.md`'s "Breaking changes" history (Phases 5, 6, 7, 9).

## 6. Security verification (re-confirmed this phase)

Re-read every serializer against the field-leak test already in `tests/api.test.ts` (`expect(found, ...).toEqual([])`, walking every endpoint's fully populated response for 17 categories of internal/sensitive field). No `id`, `status`, `createdAt`, `displayOrder`, or metric `source` is exposed anywhere — confirmed both by re-reading the code and by the passing test. No new field introduced in this phase (type-only additions) changes this.
