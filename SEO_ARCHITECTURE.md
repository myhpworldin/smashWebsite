# SEO architecture

```
Content record ──► adapter ──► SeoSource ──► resolveMetadata(site, source) ──► ResolvedMetadata ──► toNextMetadata ──► <head>
   (seo object)     adapters.ts               metadata.ts  (fallbacks, canonical, robots)            next-metadata.ts
                                                  │
SiteSettings + env ─► loadSiteSeoContext ─────────┘                       schema.ts ─► JSON-LD (rendered since Phase 8)
```

Everything SEO lives in [src/server/seo/](src/server/seo/). There is one resolver; the per-type adapters only say where a record keeps its title, summary, image and `seo`. The framework's own `generateMetadata` is used; no SEO package was added.

## Where SEO data is stored

| Page | Source |
|---|---|
| Home, Service, CaseStudy, Insight, Career | `seo` field on the record (same shape everywhere, validated by `seoSchema`) |
| SiteSettings | `defaultSeo`, `defaultOgImage`, `siteName`, `siteDescription`, `logo`, `socialLinks`, `contact` |
| About, Services/Work/Insights/Careers hubs, Contact | [static-pages.ts](src/server/seo/static-pages.ts): page name and search intent only. No description is invented; it falls back to the site default until approved copy is added |

No migration was needed: the new fields are optional keys in existing documents. Old rows remain valid.

### `seo` fields

`metaTitle`, `metaDescription`, `canonicalUrl`, `ogTitle`, `ogDescription`, `ogImage`, `twitterCard`, `twitterTitle`, `twitterDescription`, `twitterImage`, `robotsIndex`, `robotsFollow`, `primarySearchTopic`, `relatedSearchTopics[]`, `searchIntent`. Media everywhere is `{url, alt, width?, height?}`. `publishedAt`/`updatedAt` are read from the record, not the `seo` object.

## Metadata generation (`resolveMetadata`)

| Field | Fallback order |
|---|---|
| Title | `seo.metaTitle` → content title → `defaultSeo.metaTitle` → site name. Formatted `Title \| Site` unless it is the Home page or already contains the site name |
| Description | `seo.metaDescription` → content summary/excerpt trimmed to 160 at a word boundary → `defaultSeo.metaDescription` → `siteDescription` → none |
| OG title/description | `seo.ogTitle`/`ogDescription` → the resolved title/description |
| OG image | `seo.ogImage` → content image (service hero, case-study hero, insight featured image) → `defaultOgImage` → none. Relative URLs become absolute |
| Twitter | own fields → OG values; card = `summary_large_image` with an image, else `summary` |
| Article dates | `publishedTime`/`modifiedTime` for Insights only |

The image URL is checked for shape only. There is no media library, so existence of the file is not verified.

## Canonical

`canonicalUrl(path, NEXT_PUBLIC_SITE_URL)`: lowercase, no trailing slash, no query or fragment, on the configured host. The request host is never used. An explicit `seo.canonicalUrl` is honoured only if it is on the site's own origin (its query is dropped). Since Phase 6 an off-site canonical is **rejected on write** (422); the generator still ignores one defensively if it ever reaches stored data, and validation reports it. In production the env schema rejects a non-https or localhost site URL.

## Robots and publishing

| State | Result |
|---|---|
| Draft | `noindex, nofollow` (and the route 404s anyway) |
| Published | `index, follow` unless `robotsIndex`/`robotsFollow` is `false` |
| Published + `robotsIndex: false` | Reachable, `noindex` (follow stays true unless set) |
| Any page when `APP_ENV` ≠ `production` | forced `noindex, nofollow` |

`auditPublishedSeo(...).entries[].indexable` is the list a sitemap should use: published, `robots.index` true, and (not yet enforced) canonical equal to its own path. Drafts are never in it.

## Search topics (no keyword data)

`primarySearchTopic`, `relatedSearchTopics`, `searchIntent` are **editorial notes** on what a page is meant to answer. They are never written into titles, headings, alt text or body copy by code. No volume, difficulty, ranking, CPC or trend data is stored or claimed anywhere. Validation warns when a published page has no topic, when the topic shares no word with the slug (route/topic mismatch), or when related topics repeat the primary or each other. Duplicate primary topics across pages are reported by the audit.

## Structured data ([schema.ts](src/server/seo/schema.ts))

| Generator | When | Sources |
|---|---|---|
| `organizationJsonLd` / `homeJsonLd` | Home | SiteSettings: name, site URL, logo, http(s) social links, email/phone as `contactPoint`. No address, awards, etc. |
| `serviceJsonLd` | Service pages | name, shortDescription, URL, provider = the organization. No price/rating/area |
| `articleJsonLd` | Insights | headline, excerpt, image, published author, dates, `mainEntityOfPage`, publisher |
| `breadcrumbJsonLd` | Any page with ≥ 2 crumbs | The real hierarchy Home → hub → detail ([breadcrumbs.ts](src/server/seo/breadcrumbs.ts)) |
| `faqJsonLd` | Service pages that have FAQs | The same `faqs` the page renders; nothing when empty |

`servicePageJsonLd`, `insightPageJsonLd`, `caseStudyPageJsonLd` compose these per page; `serializeJsonLd` makes them safe for an inline script. Since Phase 8 the pages render Organization (Home), Service and Article JSON-LD; BreadcrumbList and FAQPage stay gated until those sections are visible. See [SEO_INDEXING.md](SEO_INDEXING.md).

## Validation ([validate.ts](src/server/seo/validate.ts))

`validateSeo` returns `{level, field, message}` issues; only structural problems are errors.

- **Errors:** no title anywhere; canonical not a valid URL or on another host.
- **Warnings:** title > 60 or description outside 70–160 characters (search-snippet conventions, not project rules); no description at all; canonical points at another page; noindex + canonical override; index on a draft; non-indexable environment; generic alt text ("image", "photo"); missing image width/height; missing/misaligned/duplicated search topics.
- **Structural rules already enforced on write** (zod): valid URLs, alt text required on media, boolean robots flags, slug format/uniqueness (Phase 3).
- **Cross-page (`auditPublishedSeo`):** duplicate resolved titles, descriptions, canonicals and primary topics. Duplicate slugs cannot occur within a type (unique index) and differ by prefix across types.

`npm run seo:audit` prints this for the database in `MONGODB_URI`. Validation is not run automatically on save (there is no editor UI yet); it is meant for the editor/admin phase and QA.

## Internal-linking data

Public service and case-study lookups now also return `relatedInsights` (published only), alongside the existing `relatedCaseStudies`/`relatedServices`. Only `{id, title, slug, excerpt}` is returned, never full records. Nothing generates links automatically.

## Framework integration

`generateMetadata` is wired on Home and the four detail pages via `next-metadata.ts`. Unknown slugs return no metadata (the page issues the 404/redirect). Home swallows metadata errors so `/` never fails when the database is missing. Home is `force-dynamic` — **resolved, Stage 5 Phase 7**: this is now a deliberate, reconfirmed architectural decision, not a placeholder awaiting a later move to revalidation. See [CONTENT_DELIVERY.md](CONTENT_DELIVERY.md) §2 for why.

## Not implemented

Metadata for About/Contact/hub pages (their pages do not exist yet; the helpers `staticPageSource` and `resolveMetadata` are ready), SEO editing UI, image-existence checks, real keyword research.
