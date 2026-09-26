# Content architecture

Public-website content only. CRM is out of scope: "CRM Automation" is a *Service record*, not a CRM data model.

```
Content source → MongoDB (driver) → module services → public APIs → frontend
```

Schema: [src/server/db/schema.ts](src/server/db/schema.ts). Input validation (zod): `src/server/validation/` and `src/server/modules/*/*.schema.ts`. Business logic: `src/server/modules/*/*.service.ts`. Schema management: `scripts/migrate.ts` (see "Schema management" below).

Content is stored, not styled: no positions, colours, widths or animation fields exist anywhere.

## Entities

| Entity (table) | Purpose | Key fields |
|---|---|---|
| `SiteSettings` (`site_settings`) | Singleton shared site data. No draft state; always public | siteName, siteDescription, logo, favicon, socialLinks[], contact, defaultCta, defaultSeo, defaultOgImage |
| `HomePage` (`home_page`) | Singleton, draft/published | Embedded sections + ordered references (below) |
| `Service` (`services`) | Service landing page | name, slug, shortDescription, description, hero, problem, solution, deliverables[], process[], tools[], faqs[], cta, seo, displayOrder |
| `CaseStudy` (`case_studies`) | Work / case study | title, slug, summary, client, industry, challenge, strategy, execution, results[], heroImage, media[], testimonial, seo |
| `Insight` (`insights`) | Article (Markdown `content`) | title, slug, excerpt, content, author, featuredImage, category, tags[], seo |
| `TeamMember` (`team_members`) | Public profile | name, role, shortBio, photo, displayOrder |
| `Testimonial` (`testimonials`) | Reusable quote | quote, personName, personRole, companyName, client?, photo |
| `Client` (`clients`) | Publicly displayed client | name, description, website, industry, logo |
| `Career` (`careers`) | Public job posting only | title, slug, summary, description, requirements[], responsibilities[], location, employmentType, seo |

All except SiteSettings have `id (uuid)`, `status`, `createdAt`, `updatedAt`; slugged/dated entities add `publishedAt`. Categories and tags are plain fields on Insight (no tables) because nothing queries them beyond a category filter.

Reusable value shapes (zod, stored as embedded documents): `Media {url, alt, decorative?, width?, height?, mimeType?, caption?}` (rules in [MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md)), `Video {url, mimeType, poster, duration?, …}` (hero/story only), `Seo {metaTitle, metaDescription, canonicalUrl, ogTitle, ogDescription, ogImage}`, `Cta {label, target}`, `Metric {label, value, description?, context?, source?, link?}`, `TitledItem {title, description?, icon?}`.

## Home page

Page-specific copy is embedded (embedded, one field per section); reusable records are referenced through ordered link collections and never copied.

| Section | Representation |
|---|---|
| Hero | `hero`: heading, supportingCopy, label (eyebrow), ctas[] (max 2: primary, secondary), media, video |
| Business Proof | `businessProof`: intro + `items: Metric[]` |
| SMASH Story | `story`: intro, media, points[], cta |
| Services | `servicesSection` intro + `home_services` → Service |
| Growth Engine | `growthEngine`: intro + `steps: TitledItem[]` |
| Selected Work | `selectedWorkSection` intro + `home_case_studies` → CaseStudy |
| Results | `results`: intro + `items: Metric[]` |
| Why SMASH | `whySmash`: intro + `items: TitledItem[]` (any count) |
| Testimonials | `testimonialsSection` intro + `home_testimonials` → Testimonial |
| Technology | `technology`: intro + `items: {name, logo?, description?}[]` |
| Insights | `insightsSection` intro + `home_insights` → Insight |
| CTA | `cta`: eyebrow, heading, description, cta (primary), secondaryCta |

Section order is not stored; the frontend owns layout. The API names these fields differently (mapping in [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md)). Every section intro also accepts an `eyebrow`. CTA targets must be a defined canonical route or an `https` URL. "Featured"/order for referenced records is the position in the link table.

## Relationships

- Service ↔ CaseStudy: many-to-many (`service_case_studies`, editable from either side).
- Insight → Services, CaseStudies: many-to-many (`insight_services`, `insight_case_studies`); Insight → author (TeamMember, optional).
- CaseStudy → Client, → Testimonial (optional, single); Testimonial → Client (optional).
- HomePage → Services, CaseStudies, Testimonials, Insights (ordered).

On delete: link rows cascade; single references (`client_id`, `testimonial_id`, `author_id`) become null. No circular dependencies.

## Publishing

States: `draft` (default) and `published`. The `content_status` enum is where `scheduled`/`archived` can be added later.

- Every public read goes through `isPublished`/`publishedAnd` in the query layer ([helpers.ts](src/server/db/helpers.ts)); the frontend is never trusted to hide drafts.
- Related records are included only if *they* are published (a published case study hides a draft client, testimonial, service; Home skips draft references). A published record may reference drafts; they simply do not appear.
- The Home page and each published record 404 when unpublished. SiteSettings has no draft state.
- Public DTOs drop `status` and `createdAt`; Insight lists omit the article body.
- `publishedAt` is stamped on first publish and kept afterwards; a DB check requires it whenever `status = 'published'`.
- Write functions (`createX`/`updateX`) are internal service functions. No write HTTP endpoints or authentication exist yet.

## Validation

- **Identity:** names/titles non-empty, length-limited; slug `^[a-z0-9]+(-[a-z0-9]+)*$` in zod *and* a DB check constraint; unique index per slug table (duplicate → `CONFLICT` 409). Slug policy (reserved words, id-like slugs, intent check, redirects) is in [SLUG_STRATEGY.md](SLUG_STRATEGY.md).
- **Relationships:** referenced ids must exist (`VALIDATION_ERROR` listing missing ids); FK constraints back this up.
- **Media:** `url` must be `http(s)` or root-relative (no `javascript:`), `alt` required.
- **Links (`Cta.target`):** http(s) URL or root-relative path. Phase 3 may replace paths with route references.
- **Verified metrics:** Business Proof, Home Results, and CaseStudy results require a `source` on every metric before the owning record can be published. Nothing is pre-filled.
- **Structure:** typed arrays/objects with size caps, not one free-text blob.
- **Allow-listed writes (Phase 6):** every input schema is strict; unknown/protected keys (`id`, `createdAt`, `publishedAt`, …) are rejected. `publishedAt` is server-stamped.
- **Publish minimums (Phase 6):** service and career need a description, a case study needs a narrative section, Home needs a hero heading; re-checked on later edits. Same-site canonical only. See [SECURITY.md](SECURITY.md).

## Redirects

`redirects` (`from_path` unique, `to_path`, `status_code` 301/308) is written when a previously published slug changes; see SLUG_STRATEGY.md.

## Indexes

Only query-backed: unique `slug` on services, case_studies, insights, careers; `(status, display_order)` on services, team_members, clients, testimonials; `(status, published_at)` on case_studies, insights, careers; `insights.category` (list filter); FK lookups `case_studies.client_id`, `testimonials.client_id`, reverse-side link-table indexes, and `(home_id, position)` on Home link tables.

## Schema management

`schema.ts` declares the collections, per-collection defaults, indexes and collection validators. `npm run db:migrate` (`ensureSchema`) creates the collections with their validators and indexes and is idempotent; it never drops or rewrites data. Changing a validator or index means editing `schema.ts` and re-running it. Removing or reshaping stored fields is a manual data migration, not automatic.

## SEO preparation only

Indexable entities (Home, Service, CaseStudy, Insight, Career) carry a nullable `seo` object, SiteSettings carries `defaultSeo`/`defaultOgImage`, and media carries `alt`/`width`/`height`. Slug/route architecture followed in Phase 3. Still not done: metadata output, canonical tags, sitemap, robots, schema.org (Phase 4) and any keyword research. No keyword data or volume claims exist in the codebase.

## Stage 2, Phase 2 — content readiness

Page-by-page content requirements, readiness tracking and business-claim verification are documented separately, not duplicated here: [PAGE_CONTENT_MATRIX.md](PAGE_CONTENT_MATRIX.md) (structure per page/section), [CMS_CONTENT_MAP.md](CMS_CONTENT_MAP.md) (content-type mapping, including proposed additions: `AboutPage`, `Enquiry`, `LegalPage`, and two new `Career` fields for JobPosting schema), [CONTENT_GAP_REPORT.md](CONTENT_GAP_REPORT.md) (what's missing or unverified, by severity). Two decisions from that phase affect this schema going forward: `/industries` pages were evaluated and deliberately not built (no dedicated model — `industry` stays free text on `Service`/`CaseStudy`); Career gains `datePosted`/`validThrough` only once JobPosting schema is actually implemented, not before.

## Sample content

`npm run db:seed` loads a few records for local development from [seed.ts](src/server/db/seed.ts). Every string is prefixed `[SAMPLE]`, with no metrics, testimonials, client names or claims. The script refuses `APP_ENV=production`.

## Verified integrity (Stage 1 sign-off)

Checked against the real schema (tests/verification.test.ts): 18 collections; slug format, per-collection slug uniqueness, `published ⇒ publishedAt`, singleton and redirect rules are enforced by the database (collection validators and unique indexes) even for direct writes. **No foreign keys:** MongoDB cannot enforce references, so the services validate them on write and every public read only exposes published records; a record deleted behind the application's back leaves at most an orphan link document, which no read returns (tested).
