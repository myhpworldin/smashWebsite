# SEO Architecture

One centralized system, not SEO logic scattered per page. See [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md) for the per-route status table this architecture produces.

```
src/server/seo/
├── metadata.ts        resolveMetadata() — the single metadata resolver (title/description/canonical/robots/OG/Twitter)
├── adapters.ts         per-content-type SeoSource builders (home/service/offering/caseStudy/insight/career)
├── next-metadata.ts    thin build() wrapper → serviceMetadata/caseStudyMetadata/insightMetadata/careerMetadata/staticPageMetadata/homeMetadata
├── to-next-metadata.ts maps ResolvedMetadata onto Next.js's Metadata type (the only place that does)
├── static-pages.ts     SEO source for DB-less pages (About, Careers, Contact, legal pages, hubs)
├── validate.ts         validateSeo() (editorial warnings/errors) + assertNoCanonicalConflict / assertNoTitleConflict (write-time hard blocks) + auditPublishedSeo/auditSitemap (read-time reports)
├── schema.ts           JSON-LD builders: ProfessionalService (the business), Service, Article, BreadcrumbList, FAQPage
├── page-jsonld.ts       per-page-type JSON-LD assembly (what each page's <script> tag actually emits)
├── breadcrumbs.ts       buildBreadcrumbs() from canonical routes, never from a raw request URL
├── sitemap.ts           buildSitemap() / auditSitemap()
├── robots.ts            buildRobots() / resolveRobots consumers
├── redirects.ts         recordPathChange() — keeps redirects single-hop, no chains
├── slug.ts              slug format, uniqueness intent-key, slugify/generateSlug, style warnings
├── resolve.ts           resolvePublicRoute() — the one function that maps a path to "content | static | not found"
├── site-context.ts       loadSiteSeoContext() — SiteSettings + env → SiteSeoContext
├── env-context.ts       indexingFromEnv()/toleratesOutages() — the only place NEXT_PUBLIC_SITE_URL and tier are read
├── request-cache.ts     per-request memoization of the above lookups
├── public-cache.ts      page caching (ISR): published slugs to prerender, and the cache clear after a content write
├── home-readiness.ts    editor-facing "what's missing before Home can publish" report (admin API only)
└── links-audit.ts       validates editor-entered CTA/metric link targets resolve to real, live pages
```

Every `generateMetadata()` in `src/app/**` calls exactly one function from `next-metadata.ts` — no page re-implements title formatting, description truncation, or OG/Twitter fallback logic.

## Metadata resolution

`resolveMetadata(site: SiteSeoContext, source: SeoSource): ResolvedMetadata` (`metadata.ts`) is the one function that turns "site-wide defaults + one page's content" into a complete metadata object. Fallback order, applied consistently everywhere:

- **Title**: `seo.metaTitle` → content title/name → site default title → site name, then formatted as `"Title | SiteName"` (skipped for Home, and skipped if the title already names the site).
- **Description**: `seo.metaDescription` → content summary/excerpt (truncated at a word boundary, ~160 chars) → site default description → site-wide description.
- **Canonical**: a same-origin explicit `seo.canonicalUrl` override, else the route itself on the configured `NEXT_PUBLIC_SITE_URL` — never the request host, never with query/tracking parameters (stripped structurally by path normalization, not denylist-filtered).
- **Robots**: `noindex,nofollow` unless the content is published *and* the environment is an indexable tier; a content-level `robotsIndex`/`robotsFollow` flag only ever narrows that, never widens it.
- **Open Graph image**: `seo.ogImage` → the content's own image → the site's default OG image → none (never a broken/missing URL). On an indexable tier, a non-https or non-public-host image is dropped rather than leaked into production.
- **Twitter card**: falls back to the resolved OG title/description/image, so Twitter is never left without an image while OG has one.

## Pagination

A paginated listing (`/work`, `/insights`) passes its current page number into `SeoSource.page`. Page 1 is unaffected. Page 2+ gets:

- its own self-referential canonical (`?page=N`), never collapsed onto page 1's canonical,
- a distinguishing title suffix (`"Our Work – Page 3 | SMASH"`),
- `noindex,follow` — thin/near-duplicate relative to page 1, but still crawlable so links to individual items are reached.

`/services` has no pagination (its catalogue is returned in full), so it's unaffected.

## Canonical conflict protection

Two independent, complementary mechanisms:

1. **Write-time hard blocks** (`assertNoCanonicalConflict`, `assertNoTitleConflict` in `validate.ts`) run on every publish of a service, case study, insight, career, or Home. They only fire on an *explicit* editor-entered override (`seo.canonicalUrl` / `seo.metaTitle`) that collides with another already-published page's resolved canonical or title — they never block a page falling back to its own default, since defaults can't collide (slugs are already unique by construction).
2. **Read-time audits** (`auditPublishedSeo`, `auditSitemap` in `validate.ts`/`sitemap.ts`) catch everything a write-time block intentionally does not: a canonical pointing at a draft, at a missing page, or forming a chain/loop. A canonical pointing at a *different, real, published* page is a legitimate pattern (duplicate-content consolidation) and is correctly a warning here, not an error — Home is the one exception, since there is only ever one Home page and it can never legitimately defer its canonical elsewhere (`homeSeoProblems`, a hard publish-block).

Run the audit with `npm run seo:audit` against any `MONGODB_URI`.

## Structured data (JSON-LD)

Only four schema.org types exist, each emitted only when the page's own real data supports it — nothing is invented:

| Type | Source | Emitted on |
|---|---|---|
| `ProfessionalService` (a LocalBusiness, and so Organization, subtype) | Site Settings: brand name, registered `legalName`, description, URL, `@id` `…/#organization`, logo (Site Settings logo, else `/media/smash-logo-schema.png`, the white logo on deep blue so it shows on Google's white background), telephone and email, `https://` social links only, a customer-service contact point, and the business-confirmed office address as a `PostalAddress` (PIN code, country, and Kochi/Kerala only because the stored line names them; nothing geocoded) | Home only |
| `Service` | The service's own name/description/URL | Service detail pages (fails safe — returns nothing without a name) |
| `Article` | The insight's own headline/description/image/author/dates | Insight detail pages (fails safe without headline/publishedAt) |
| `BreadcrumbList` | `buildBreadcrumbs()`, from canonical routes/slugs | Service, service-offering, case-study, insight, career detail pages; the FAQ page; the `/services` and `/work` listings (`listingPageSchemas`) |
| `FAQPage` | Exactly the FAQs the page renders | Service category and offering pages when they have `faqs`; the FAQ page (`src/lib/faq-content.ts`) |

The business is a `ProfessionalService` (final audit, 2026-10-23), justified by its staffed Kochi office. Opening hours and coordinates are left out until the business supplies them. No ratings, reviews, prices, employee counts, awards or areas served exist anywhere, and none should be added without a real, approved data source (never fabricated to "add more schema"). Validated with the Schema.org validator: 0 errors, 0 warnings.

## Breadcrumbs

Built exclusively from `normalizePathname()` + the app's own `ROUTES`/`CONTENT_ROUTES`/static-page tables — never from the raw incoming request URL. A hub segment (e.g. "Services") is only a clickable link when that hub page is actually live; otherwise it renders as unlinked text rather than a link to a 404.

## Redirects

Stored in the `redirects` collection (`fromPath`, `toPath`, `statusCode`, `createdAt`). `recordPathChange()` (`redirects.ts`) is called automatically whenever a published record's slug changes, and actively keeps the table flat:

- if a redirect already targets the *new* slug's old path, it's removed (would otherwise recreate a cycle),
- any redirect currently pointing at the *old* slug is repointed straight at the new one (collapses what would become a 2-hop chain into a single hop).

A→B→C chains cannot be created through the normal slug-change path. `findRedirect()` is therefore a single, non-chain-walking lookup by design.

## Indexability decision

`resolveRobots(site, status, seo)`: indexable only when `status === "published"` **and** the environment is an indexable tier (`NODE_ENV=production`, via `indexingFromEnv()`), then narrowed by the content's own `robotsIndex`/`robotsFollow` flags (which default to `true` only once the content is otherwise indexable — they can never make a draft indexable). Admin and preview routes are noindex through three independent layers regardless of content status: the page's own hand-rolled `noindex,nofollow` metadata, an `X-Robots-Tag: noindex, nofollow` header on every `/admin/**` and `/preview/**` request, and a robots.txt `Disallow` for both paths.

## Sitemap consistency

`buildSitemap()` includes a URL only when `sitemapEligible()` — `resolveRobots(...).index` is true **and** the page's own resolved canonical equals that URL — using the exact same `resolveRobots`/`resolveCanonical` functions every page's metadata uses, so the sitemap and a page's own `<meta name="robots">`/canonical tag can never drift apart. `auditSitemap()` additionally verifies every listed URL is https, on the site's own origin, free of query/fragment, not a duplicate, actually resolves to a live page, isn't noindex, and that any canonical pointing elsewhere doesn't form a chain or loop.

## Business-claim safety

`Metric.source` is required before a service/case-study/Home record can publish (`assertMetricsVerified`) — no statistic reaches a public page without a stated source. The data model has no field capable of carrying a fabricated claim ("number of clients", "years in business", employee counts, awards) into Organization schema or anywhere else — there's nothing to invent because no such field exists to invent it into. If a future business requirement adds such a claim, it must come from an approved content field with a verification trail, not a hardcoded string in code.

## Internal linking

Content relationships (service↔case study, insight↔service, insight↔case study) aren't just stored — they're actively surfaced in the public API responses for the relevant detail pages (`relatedCaseStudies`, `relatedInsights`, `relatedServices`), published-only, so the frontend can render contextual internal links without needing database access of its own. This is a separate concern from `links-audit.ts`, which validates that editor-entered CTA/metric link *targets* actually resolve to a live page (not a 404 or a stale redirect).

## What's verified vs. what needs a decision

See [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md)'s "Pending" and "Future research" sections. In short: everything described above is implemented and tested today. Service-offering sitemap inclusion and CaseStudy/Article-equivalent schema are open, low-priority technical additions. Legal-page indexability is a content/compliance decision, not a code change. No keyword-volume or ranking claim is made anywhere in this codebase.
