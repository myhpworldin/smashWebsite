# Developer content contract — Stage 2, Phase 1

What each page needs from the backend: route, content model, API, SEO data source, schema, relationships, and whether the route must be statically defined or generated dynamically. This is the implementation-facing counterpart to [DESIGNER_HANDOFF.md](DESIGNER_HANDOFF.md); both are built from the same page inventory in [SEO_SITE_ARCHITECTURE.md](SEO_SITE_ARCHITECTURE.md).

Everything marked **Implemented** already exists in the codebase (`ARCHITECTURE.md`, `API.md`). Nothing in this file asks for new backend architecture — Stage 1 already built the content models, APIs, and SEO pipeline for every page type. What remains is frontend page files for the routes marked **Page file needed**.

**Stage 2, Phase 4 note:** the one gap this file identified that blocked a page specification (no `GET /api/careers*` endpoints) was fixed in Phase 4 — see `CONTENT_CONTRACTS.md` and [PAGE_SPECIFICATIONS.md](PAGE_SPECIFICATIONS.md), which is now the consolidated, frozen per-page record superseding the status notes below where they conflict.

## Per-page contract

### Home — `/`
```
Route:     / (static, singleton)
Content:   HomePage model
API:       GET /api/home
SEO:       resolveMetadata via home adapter; canonical always "/"
Schema:    Organization / WebSite (homeJsonLd) — implemented
Related:   Service, CaseStudy, Testimonial, Insight (ordered link tables)
Status:    Implemented (placeholder page.tsx exists; full section rendering is the frontend track's job per HOME_PAGE_CONTRACT.md)
```

### Service detail — `/services/[slug]`
```
Route:     /services/[slug] (dynamic, generated per published Service)
Content:   Service model
API:       GET /api/services/:slug
SEO:       Service metadata adapter; canonical self
Schema:    Service + BreadcrumbList (breadcrumbs gated off until rendered) + FAQPage (gated off until FAQ section renders)
Related:   relatedCaseStudies[], relatedInsights[] (already in API response)
Status:    Implemented end-to-end (route, resolver, metadata, schema). Blocked only on real service names/content (SEO_KEYWORD_INTENT_MAP.md §3).
```

### Services hub — `/services`
```
Route:     /services (static)
Content:   none (listing page) — reads GET /api/services
SEO:       staticPageSource("/services") — title + intent only, no description yet
Schema:    none currently generated for hubs (no LocalBusiness/CollectionPage data claimed)
Status:    Page file needed. Once built, add "/services" to LIVE_STATIC_ROUTES in src/lib/routes.ts so it enters the sitemap (a test enforces this list matches actual page files — SEO_INDEXING.md).
```

### Case study — `/work/[slug]`
```
Route:     /work/[slug] (dynamic, per published CaseStudy)
Content:   CaseStudy model
API:       GET /api/work/:slug
SEO:       CaseStudy metadata adapter
Schema:    BreadcrumbList (gated off); no Article/Review schema claimed (no rating data exists)
Related:   relatedServices[], relatedInsights[], client, testimonial (published only)
Status:    Implemented end-to-end.
```

### Work hub — `/work`
```
Route:     /work (static)
Content:   none — reads GET /api/work
Status:    Page file needed; add to LIVE_STATIC_ROUTES on build.
```

### Insight article — `/insights/[slug]`
```
Route:     /insights/[slug] (dynamic, per published Insight)
Content:   Insight model
API:       GET /api/insights/:slug
SEO:       Insight metadata adapter; publishedTime/modifiedTime emitted
Schema:    Article (articleJsonLd) — implemented, requires headline + publish date
Related:   relatedServices[], relatedCaseStudies[]
Status:    Implemented end-to-end.
```

### Insights hub — `/insights`
```
Route:     /insights (static)
Content:   none — reads GET /api/insights (supports ?category filter)
Status:    Page file needed; add to LIVE_STATIC_ROUTES on build.
```

### Careers hub — `/careers`
```
Route:     /careers (static)
Content:   Career model, list of published postings
API:       GET /api/careers — implemented in Phase 4 (CareerSummary[], uncounted like testimonials/clients)
SEO:       staticPageSource("/careers")
Status:    API resolved. Page file still needed — this remains the one open gap (SEO_SITE_ARCHITECTURE.md §1): the hub can now call GET /api/careers or the in-process listPublishedCareers, either works.
```

### Career posting — `/careers/[slug]`
```
Route:     /careers/[slug] (dynamic, per published Career)
Content:   Career model
API:       GET /api/careers/:slug — implemented in Phase 4 (CareerDetail, with seo). The existing page (src/app/careers/[slug]/page.tsx) continues to use the in-process getCareer/request-cache call and does not need to change; the HTTP route exists for external/client-side consumers and API consistency with services/work/insights.
SEO:       staticPageSource-style resolution via careerMetadata (src/server/seo/next-metadata.ts) — already implemented
Schema:    None currently generated (no JobPosting schema — would require salary/location/valid-through fields not modelled yet; do not add without those fields, since Google's JobPosting schema has required properties this model doesn't carry)
Status:    Page file implemented (title/H1 only placeholder body — needs the full blueprint in PAGE_CONTENT_BLUEPRINT.md).
```

### About — `/about`
```
Route:     /about (static)
Content:   No dedicated model. TeamMember records already exist and are publishable; story copy has no home yet.
SEO:       staticPageSource("/about")
Status:    Page file needed. Decide whether "About" gets its own content model (headline/story fields) or stays static copy in the frontend — this is a genuine open decision, not resolved here, because it affects whether an editor can update About without a deploy.
```

### Contact — `/contact`
```
Route:     /contact (static)
Content:   SiteSettings.contact (already modelled: likely address/email/phone)
SEO:       staticPageSource("/contact")
Status:    Page file needed. If a contact form is required, it needs a write endpoint — explicitly out of scope for this stage (no CRM/lead capture per phase brief). Until then, this page can only display contact details, not accept submissions.
```

### Legal pages — `/privacy-policy`, `/terms`, `/cookie-policy` (built, Stage 4 Phase 7)
```
Route:     final — added to ROUTES/STATIC_ROUTES/LIVE_STATIC_ROUTES in src/lib/routes.ts (the Stage 4 Phase 7 brief itself settled the naming: /terms, not /terms-of-service)
Content:   Still no model — a static placeholder body (src/components/content/LegalPageBody.tsx) rendering an honest "awaiting approved content" notice, not invented legal text. A LegalPage content type remains future work, worth building once real copy exists to migrate in.
API:       None.
Status:    Engineering-complete — route, page, noindex metadata (until content is approved) and footer links are all live. The only remaining gap is legal-reviewed copy, not engineering.
```

## Cross-cutting requirements (already implemented, apply to any new page)

- Every dynamic route must go through `resolvePublicRoute`/`requirePublishedRoute` so drafts 404 identically to unknown slugs (`URL_CONVENTIONS.md`).
- Every static route that gets a page file must be added to `LIVE_STATIC_ROUTES` in `src/lib/routes.ts` — a test fails otherwise, which is intentional (`SEO_INDEXING.md`).
- Every page must use `generateMetadata` wired through `next-metadata.ts`, not ad hoc `<head>` tags.
- No new schema type should be added unless the underlying fields are genuinely present on the model (phase brief §19) — this is why JobPosting schema is explicitly deferred above.

## Summary of backend gaps found during this phase (not fixed here — Phase 1 is planning only)

1. ~~No `GET /api/careers` listing endpoint~~ — **fixed in Stage 2, Phase 4**; see `CONTENT_CONTRACTS.md`.
2. ~~No content model or route entry for legal pages~~ — **route/page built in Stage 4, Phase 7**; a content model remains deferred (no copy to model yet).
3. No content model for About's story copy (TeamMember alone isn't the whole page).
4. No write endpoint for a Contact form (expected — CRM/write endpoints are out of scope for this stage).
