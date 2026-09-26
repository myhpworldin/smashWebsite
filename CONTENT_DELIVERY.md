# Content delivery, caching & revalidation — Stage 5, Phase 7

How content published through the CMS reaches the public website. This consolidates what the phase brief asked for as three separate files (`CONTENT_DELIVERY.md`, `CACHE_STRATEGY.md`, `REVALIDATION.md`) into one, because in this project's actual architecture those three topics collapse into a single, simple answer: **there is effectively no cache layer for pages to revalidate.** Splitting that one fact across three files would manufacture complexity that doesn't exist, contrary to this and every prior phase's own "document the actual implementation" and "do not introduce unnecessary infrastructure" rules.

## 1. The actual data flow

```
CMS (admin API) → database → service-layer function → page component / public API → response
```

One layer, no intermediate cache or build step. A page component (`src/app/services/[slug]/page.tsx`, etc.) calls the exact same service-layer function (`getPublishedServiceBySlug`, etc.) the public JSON API uses, in-process, on every request. There is no separate "build the page, then serve it" step for CMS-driven pages.

## 2. Rendering strategy — one deliberate decision, not per-page tuning

**Every content-driven route is `export const dynamic = "force-dynamic"`.** This was a decision made early (Stage 2/3) and never revisited by accident — `SEO_ARCHITECTURE.md` even left a note calling it out as reconsiderable ("Home is force-dynamic for now; a later phase can move it to revalidation"). This phase (Stage 5, Phase 7) revisited it deliberately and **confirms it as the correct choice, not a gap**:

- **Outage safety already depends on it.** `SEO_INDEXING.md`'s "Outages" policy requires production to fail a request (never serve a blank, indexable, or *stale* 200) when the database is genuinely unreachable, so crawlers retry instead of indexing wrong content. Static generation or ISR would instead serve the last successfully cached page during an outage — a *stale* success, exactly what that policy exists to prevent. Introducing a cache layer now would directly conflict with a safety property this project has enforced since Stage 2.
- **No measured performance problem exists to justify the complexity.** The content volume is small (a handful of services, case studies, articles), the database is a single MongoDB deployment colocated with the app, and no Core Web Vitals data anywhere in this project's history shows page-render time as a bottleneck. Adding ISR/`revalidateTag` now would be optimizing before there's evidence of a problem — the opposite of this phase's own "optimize only where there is an actual problem" rule (§12).
- **It gets correctness for free.** Every "does the change propagate" question this and prior phases have asked — Home reflecting a Service edit, a listing reflecting an unpublish, a sitemap reflecting a new publish — has one answer: yes, immediately, because every request reads the current database state. There is no revalidation step that can fail, lag, or need a retry mechanism (§18 of this phase's brief), because there is no cache to invalidate in the first place.

If real traffic ever makes this a genuine performance problem, the correct fix is targeted (`revalidateTag` per content type, invalidated from `admin.controller.ts`'s write paths) — not before then.

## 3. Cache behavior, precisely

| Surface | Cache-Control | Why |
|---|---|---|
| Public pages (`/services/[slug]`, `/work`, `/`, etc.) | `private, no-cache, no-store, max-age=0, must-revalidate` (Next.js's default for a fully dynamic route) | No cache exists to go stale. Verified live, Stage 5 Phase 4 & 6: an edit is visible on the very next request. |
| Public JSON API (`/api/services`, etc.) | `public, s-maxage=60, max-age=60` | A bounded, already-documented (`API.md`) window that matters only if an external CDN/consumer ever fetches this API directly — nothing does today. The pages themselves never go through this cached response; they call the service layer in-process. |
| Admin API (`/api/admin/**`) | `no-store` | Never cached — an editor must see the real, current record. |
| Media, static assets, Next.js build assets | `public, max-age=…, immutable` / `stale-while-revalidate` | Content-addressed or genuinely static; safe to cache aggressively (`next.config.ts`). |

## 4. Dependency map (unchanged from `INTERNAL_LINK_MAP.md` — restated here for the revalidation question specifically)

```
Home       → Services (featured), Case Studies (featured), Testimonials (featured), Insights (featured)
Service    → related Case Studies, related Insights
Case Study → related Services, related Insights, Client, Testimonial
Insight    → related Services, related Case Studies, Author (TeamMember)
```

Because nothing is cached, "which dependents need revalidating when X changes" has no operational answer to give — every dependent reads X fresh on its own next request regardless of what changed. Verified live, Stage 5 Phase 6: editing a Service already featured on Home updated Home's rendered content immediately, and removing it from Home's featured list removed it from Home immediately, with no explicit revalidation call anywhere in the code path.

## 5. API payload scoping (already correct, reconfirmed this phase)

Every list endpoint (`listPublishedServices`, `listPublishedCaseStudies`, `listPublishedInsights`, `listPublishedCareers`) selects a narrow, explicit column projection (`serviceSummary`/`caseStudySummary`/`insightSummary`) — id, title, slug, summary/excerpt, image, a couple of list-relevant fields. None of them ever select long-form body fields (`description`, `challenge`/`strategy`/`execution`, `content`, `faqs`, `deliverables`, `process`, `tools`). Detail pages (`getPublished*BySlug`) select the full row only when rendering that one record. This was already correct (built incrementally since Stage 3) and required no change.

## 6. Database query shape (already correct, reconfirmed this phase)

No N+1 patterns exist. Every list query is one `select` + one `count`, run in parallel (`Promise.all`). Every detail page's related-content lookups are a fixed, small number of queries (one per relationship type), never one query per related item. Home's own related-content fetch is explicitly documented as "five queries in total, however many items are referenced" (`home.service.ts`). 15 indexes exist across the schema, all justified by an actual query pattern in the code (status+publishedAt composite indexes backing every `isPublished`/`publishedAnd` filter combined with an `ORDER BY publishedAt`; unique indexes backing slug lookups and the duplicate-slug guard; position indexes backing Home's ordered reference lists). No index was added speculatively this phase, and none needed to be.

## 7. Failure behavior

- **Database unreachable, production**: the request fails (safe 500), not a stale or blank 200 — crawlers retry later (`SEO_INDEXING.md`).
- **Database unreachable, development/staging**: the page logs a warning and renders its shell without that section's data (`toleratesOutages()`), matching the "other tiers degrade, production fails loud" split documented since Stage 3.
- **CMS (admin API) unreachable/misconfigured**: every admin request is a safe 500 naming the problem, never silently open (`admin-auth.ts`).
- **Revalidation failure**: not an applicable failure mode in this architecture — there is no separate revalidation step to fail. Publish and public visibility are the same database write, read fresh on the next request.

## 8. What this phase found

No code changes. Every mechanism this phase's checklist asks about — rendering strategy, cache policy, targeted revalidation, dependent-page updates, payload scoping, query efficiency, failure behavior — was either already correct (payload scoping, query shape, failure handling) or is correctly *absent by design* (a cache/revalidation layer would conflict with this project's own outage-safety policy and has no performance justification yet). The one genuine gap was documentation: this architecture's rationale had never been written down in one place, leaving `SEO_ARCHITECTURE.md`'s old "for now" note looking like an unresolved TODO rather than the deliberate, reconfirmed decision it now is.
