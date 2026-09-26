# SEO indexing infrastructure

Technical indexing only: sitemap, robots, canonicals, indexability, structured data. Routes and slugs come from [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md) and [SLUG_STRATEGY.md](SLUG_STRATEGY.md) and were not changed. No keyword research exists; nothing here claims search performance.

```
published content ─► indexability (resolveRobots) ─┐
route + slug ─► canonical (resolveCanonical) ──────┼─► page <head>   (generateMetadata)
site origin (NEXT_PUBLIC_SITE_URL) ────────────────┼─► sitemap.xml   (only index + self-canonical)
APP_ENV tier ──────────────────────────────────────┴─► robots.txt + X-Robots-Tag
```

## Site origin

One source: `NEXT_PUBLIC_SITE_URL` (the project's existing variable; no second variable was added), read only through [seo/env-context.ts](src/server/seo/env-context.ts). Request headers (`Host`, `X-Forwarded-Host`) are never used; the sitemap was fetched with a spoofed Host header and still returned production URLs. In production the value must be the bare `https://smash.international` origin: `http`, `www.`, `staging.`/`preview.`/`dev.`/`test.` hosts, localhost, a path, query or credentials fail validation at startup. Staging must be https.

## Canonical URLs

`canonicalUrl(path, origin)` ([lib/routes.ts](src/lib/routes.ts)) is the only builder: origin + lowercase path, no trailing slash (except `/`), no duplicate slashes, **no query string, tracking parameter or fragment**, and it can never leave the origin (a crafted `/\evil.example` was found to escape it and is fixed; the function now asserts the result's origin). Dynamic pages use their stable slug, never an id. An explicit `seo.canonicalUrl` override is accepted only on the site's own origin (Phase 6) and, on the page, resolved by the same `resolveCanonical` the sitemap uses.

Verified on the running production build: `?utm_source=google&ref=x`, `/Services/Performance-Marketing/` and the plain URL all emit `<link rel="canonical" href="https://smash.international/services/performance-marketing">`.

## Indexability

| Situation | Robots meta / sitemap |
|---|---|
| Published, no overrides | `index, follow`, in the sitemap |
| Published, `seo.robotsIndex=false` | `noindex, follow`, reachable, **not** in the sitemap |
| Published, `seo.robotsFollow=false` | `index, nofollow`, in the sitemap |
| Published, canonical override pointing at another page | indexable, **not** in the sitemap (it defers to the other URL) |
| Draft / unknown slug / id | 404, never listed |
| Unpublished or missing Home | `noindex, nofollow`, not listed |
| Any non-production tier | every page `noindex, nofollow`, empty sitemap |

Nothing is `noindex` by default beyond these rules; noindex is a per-page editorial opt-out (`seo.robotsIndex`), not something the system applies for convenience.

## Sitemap (`/sitemap.xml`)

Next.js native `src/app/sitemap.ts`, generated per request from the database ([seo/sitemap.ts](src/server/seo/sitemap.ts)); a newly published service, case study, insight or career appears with no code change, and an unpublished or renamed one disappears (a renamed slug's old URL 308s to the new one). Four lean queries read only `slug`, `updatedAt` and `seo`. Entries: `<loc>` (canonical) and `<lastmod>` (the record's real `updatedAt`); no changefreq/priority. Sorted and de-duplicated; capped at the protocol's 50,000 URLs with a warning. A database failure returns an error, not an empty sitemap, so crawlers retry rather than conclude pages vanished.

**Static pages:** only routes that have a page file are listed, via `LIVE_STATIC_ROUTES` in `lib/routes.ts` (`/`, `/work`, `/insights`, and, as of Stage 3 Phase 7, `/about`, `/careers` and `/contact`). `/services` is the one remaining defined route without a page (it returns 404), so it is *not* advertised. A test compares that list with the page files and fails as soon as one is built, forcing the list (and so the sitemap) to be updated.

**Consistency by construction:** the sitemap and the page `<meta robots>`/canonical both call `resolveRobots` and `resolveCanonical`, and a test asserts `in sitemap ⇔ index && self-canonical` for every published page.

## robots.txt (`/robots.txt`)

Native `src/app/robots.ts`, environment-aware at request time ([seo/robots.ts](src/server/seo/robots.ts)).

| Tier | Output |
|---|---|
| production | `User-Agent: *` / `Allow: /` / `Sitemap: https://smash.international/sitemap.xml`. Nothing is disallowed |
| development, staging | `User-Agent: *` / `Disallow: /`, no sitemap |

The API is deliberately **not** disallowed: blocking resources a page might load client-side can break rendering. `/api/**` instead sends `X-Robots-Tag: noindex, nofollow`. There are no admin, auth or preview routes to hide, so no rules were invented for them; robots.txt is not access control. `/_next/` is not blocked (it serves scripts, styles and optimized images).

## Staging and development

Three layers, all verified on a staging build: `robots.txt` disallows crawling; every page carries `<meta name="robots" content="noindex, nofollow">`; every response (pages, API, media) carries `X-Robots-Tag: noindex, nofollow`; the sitemap is an empty `<urlset/>`. Recommended staging setup: set `NEXT_PUBLIC_SITE_URL` to the **production** origin so canonicals point at production (verified), and keep `APP_ENV=staging`. **`APP_ENV` must be set at build time as well as at run time**, because the `X-Robots-Tag` and HSTS headers are compiled into the build. If a staging host is ever reachable publicly, add HTTP authentication too; a robots disallow stops crawling but cannot remove a URL that was linked externally.

## Structured data

Rendered as JSON-LD by [components/JsonLd.tsx](src/components/JsonLd.tsx) (script content is escaped so `</script>`, `<!--` and U+2028 cannot break out; this is the one sanctioned `dangerouslySetInnerHTML`), composed in [seo/page-jsonld.ts](src/server/seo/page-jsonld.ts), built by [seo/schema.ts](src/server/seo/schema.ts).

| Type | Where | Emitted when | Verified output |
|---|---|---|---|
| Organization | `/` | Home is published. Only stored site name, URL, logo, http(s) social links, email/phone | yes |
| Service | `/services/:slug` | always for a published service; built from that record | yes |
| Article | `/insights/:slug` | headline **and** publication date exist (fail safe: otherwise nothing); author, image, dates from the record | yes |
| BreadcrumbList | detail pages | **only when the page renders breadcrumbs** — services, case studies, insights and careers all do (Stage 3, Phases 4–7) | yes |
| FAQPage | service pages | **only when the page renders its FAQs** | gated off |
| JobPosting | career pages | not implemented: `Career.datePosted`/`validThrough` don't exist on the model, so the schema cannot be emitted honestly (CMS_CONTENT_MAP.md §3) | – |
| LocalBusiness | – | not implemented: no verified address, hours or business data exist | – |

Every detail page (`servicePageJsonLd`, `caseStudyPageJsonLd`, `insightPageJsonLd`, `careerPageJsonLd`) now passes `{ breadcrumbs: true }` explicitly in `page-jsonld.ts`, since all four render a visible breadcrumb trail. Structured data must match visible content, so a page only sets this once it actually renders the section; the service in the test database has an FAQ and no FAQPage is emitted. Nothing invents ratings, prices, addresses, awards or counts.

## Invalid routes, redirects

Unknown, draft and id-style slugs return **404** (verified for services, work, insights and careers) on the actual HTML page route, not just the JSON API; the API also returns a JSON 404. A renamed published slug returns a permanent redirect to the new URL. Note this is Next's `permanentRedirect`, an HTTP **308** (permanent, equivalent to 301 for indexing), and earlier docs that said 301 meant this. The old slug is recorded in `redirects` and is not in the sitemap.

**Real defect found and fixed (Stage 3, Phase 5):** a global `src/app/loading.tsx` (added in Stage 3, Phase 1) made every route stream via an automatic Suspense boundary. Streaming commits the HTTP status line (200) as soon as the shell flushes, which happens *before* an `await`-ed `notFound()` call deeper in an async Server Component can run — so every dynamic detail page (`/services/[slug]`, `/work/[slug]`, `/careers/[slug]`) was silently returning **HTTP 200** with the not-found UI's markup for unknown, draft and id-style slugs, instead of a real 404. This is a soft-404: search engines may index or otherwise mishandle these URLs, and any client checking the status code would be misled. Verified against a real production build (`next build && next start`) with curl, for every affected content type, before and after. **Fixed** by removing the global `loading.tsx`. There is currently no automated test for this class of defect — it requires a running server (Vitest exercises route handlers and functions directly, not full Next.js page rendering/streaming) — so any future route-level loading UI must be re-verified this same way (a real build + curl against a known-bad slug for every dynamic content type) before being added, and should use a manually-placed `<Suspense>` scoped below the `notFound()` call site, never a file-based `loading.tsx` at a segment that sits above one.

## Outages

If Home data cannot load, production returns a 5xx (never a blank, indexable 200) so crawlers retry; other tiers log the failure and render the page shell. A missing Home record is different: the page emits `noindex, nofollow`. The sitemap likewise errors rather than returning an empty file when the database is down (verified by stopping the database under a running production build).

## Link health

`seo:audit` also checks internal links that editors enter (Home and service CTAs, metric links): each must be a built static page or published content, and not an old slug. `/about`, `/careers` and `/contact` all have page files as of Stage 3, Phase 7, so links to them no longer flag; `/services` (no hub page yet) is the one remaining static route this check would still catch.

**Real defect found and fixed (Stage 3, Phase 9):** this audit only ever covered *editor-entered* links (Home/service CTAs). It did not cover breadcrumbs, which are generated by the frontend itself, not entered by an editor — and `buildBreadcrumbs` unconditionally linked a detail page's hub segment (e.g. a service page's "Services" crumb → `/services`) even when that hub has no page file, in both the visible trail and the `BreadcrumbList` schema. Found live via a full internal-link crawl of every page. **Fixed**: `buildBreadcrumbs` (`src/server/seo/breadcrumbs.ts`) now sets that segment's `path` to `null` unless it's in `LIVE_STATIC_ROUTES`; `Breadcrumbs.tsx` renders a `null` path as plain text instead of a link, and `breadcrumbJsonLd` omits that `ListItem`'s `item` URL rather than pointing it at a 404. Verified live: `/services/[slug]`'s breadcrumb now shows "Services" as plain text, and the emitted schema has no `item` for that entry.

## Performance

Metadata, JSON-LD and the page body share one fetch per request (React `cache` in [seo/request-cache.ts](src/server/seo/request-cache.ts)); the sitemap reads three columns; robots needs no database. Sitemap and robots are `force-dynamic` because a build without the database would otherwise fail; put a CDN cache in front in production (a few minutes is fine).

## Testing procedure

```bash
npm test                      # canonical, origin, robots, sitemap, audit, route integrity, schema, headers
npm run seo:audit             # per-page issues, duplicates, sitemap audit, canonical chains/loops, internal-link health (needs MONGODB_URI)
npm run db:dev -- --seed      # optional: throwaway local MongoDB on :27018 for a real run
```

Manual check used for this phase: production build + a local MongoDB database; fetched `/robots.txt` and `/sitemap.xml` (XML parsed: valid, 9 URLs, no duplicates/queries, all https on the production origin); requested every sitemap URL (all 200, canonical equal to the URL, `index, follow`); confirmed the draft, the noindex page, the unpublished article and the renamed slug are absent; 404s for non-existent slugs; staging build behaviour above.

## Known limitations

- `/services` (hub) is the one remaining defined static route with no page file, so it 404s and is not in the sitemap. Work, Insights, About, Careers and Contact all have page files as of Stage 3, Phases 5–7.
- `/industries` was evaluated and deliberately not built (Stage 2 decision, re-confirmed Stage 3 Phase 7 — see `PAGE_SPECIFICATIONS.md` §8): no Industry content model exists, and there are not yet enough real case studies per industry to justify standalone pages without producing thin, duplicate content against `/work`.
- FAQ schema stays off outside service pages; JobPosting schema is not implemented on career pages (no verified posting/expiry dates exist on the model); breadcrumbs now render (and emit `BreadcrumbList`) on every detail page, including careers.
- `/about` has no company-story content model or approved copy yet (`PAGE_SPECIFICATIONS.md` §3) — the page ships with a real "Our Team" section (published `TeamMember` records) but no narrative "Our Story" section, rather than inventing one.
- `www` → apex and http → https redirects are hosting/DNS concerns and are not implemented here.
- The sitemap has a single file (fine to 50,000 URLs); no image or news sitemap.
- No Search Console / Rich Results validation was run (no network access to those tools); the JSON-LD was checked structurally only.
- Career detail pages are indexable when published; whether they should be is a content decision (route was marked "proposed" in Phase 3).
