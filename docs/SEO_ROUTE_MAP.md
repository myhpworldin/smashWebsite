# SEO Route Map

Every public route, its data source, and its current SEO status. "Verified" means actually implemented and tested; "Pending"/"Future research" are called out explicitly rather than assumed.

| Page Type | Route | Primary Topic | Slug Valid | Metadata | Canonical | Schema | Sitemap | Indexable |
|---|---|---|---|---|---|---|---|---|
| Home | `/` | Business homepage | n/a (singleton) | Verified — `homeMetadata()` | Verified — self, forced (hard publish block if it points elsewhere) | ProfessionalService (the business entity), WebSite-level breadcrumb excluded (depth < 2) | Verified — included when published | Published + indexable tier only |
| Services (hub) | `/services` | Service catalogue | n/a | Verified — `staticPageMetadata` | Verified — self | BreadcrumbList (Home → Services) | Verified — static entry | Always (no draft concept for a hub) |
| Service | `/services/[slug]` | One service | Verified — unique, lowercase, hyphenated, format+uniqueness enforced | Verified — `serviceMetadata(slug)` | Verified — self by default, editor override allowed | Service, BreadcrumbList, FAQPage (only if the service has FAQs) | Verified — published only | Published + `seo.robotsIndex !== false` |
| Service offering | `/services/[category]/[offering]` | One deliverable's own page | Verified — same slug rules, nested to avoid collision with category slugs | Verified — `serviceOfferingMetadata` | Verified — self | BreadcrumbList (3-level), FAQPage (the page's own FAQs) | Verified — included, `lastmod` = the category's `updatedAt` | Published category + offering has its own slug |
| Work (hub) | `/work` | Case study catalogue | n/a | Verified — `staticPageMetadata`, pagination-aware (page 2+ gets its own canonical/title, noindex,follow) | Verified — self per page number | BreadcrumbList (Home → Our Work) | Verified — static entry (page 1 only; later pages are intentionally noindex) | Page 1 always; page 2+ follow-only |
| Case Study | `/work/[slug]` | One case study | Verified | Verified — `caseStudyMetadata(slug)` | Verified | Service(s) referenced via BreadcrumbList; no dedicated CaseStudy/Article @type (see Pending) | Verified — published only | Published + indexable |
| Insights (hub) | `/insights` | Article catalogue | n/a | Verified — `staticPageMetadata`, pagination-aware (same as Work) | Verified — self per page number | None (hub page) | Only once an article is published (`insightsHubSeo`); page 1 only | While no article is published: noindex,follow (approved 2026-10-23). Then page 1 indexable; page 2+ follow-only |
| Article | `/insights/[slug]` | One article | Verified | Verified — `insightMetadata(slug)` | Verified | Article, BreadcrumbList | Verified — published only | Published + indexable |
| About | `/about` | Company page | n/a | Verified — `staticPageMetadata`, own title and description (`static-pages.ts`) | Verified — self | None yet (no Organization schema emitted outside Home) | Verified — static entry | Always indexable |
| Careers (hub) | `/careers` | Job listing catalogue | n/a | Verified — `staticPageMetadata` | Verified — self | None (hub page) | Verified — static entry | Always indexable |
| Career | `/careers/[slug]` | One job listing | Verified | Verified — `careerMetadata(slug)` | Verified | BreadcrumbList only — no JobPosting (honest omission: `datePosted`/`validThrough` don't exist on the Career model) | Verified — published only | Published + indexable |
| Contact | `/contact` | Contact page | n/a | Verified — `staticPageMetadata` | Verified — self | None | Verified — static entry | Always indexable |
| FAQ | `/faq` | Frequently asked questions | n/a | Verified — `staticPageMetadata`, page-specific description | Verified — self | FAQPage (exactly the questions rendered, from `src/lib/faq-content.ts`) + BreadcrumbList | Verified — static entry | Always indexable |
| Privacy / Terms / Cookie Policy | `/privacy-policy`, `/terms`, `/cookie-policy` | Legal pages | n/a | Verified — title only | Verified — self | None | Excluded from sitemap | Deliberately `noindex` until approved legal copy lands (Stage 4, Phase 7) |
| Preview pages | `/preview/**` | Editor preview of a single draft | n/a | Hand-rolled, always `noindex,nofollow` | n/a | None | Never included | Never indexable, regardless of content status |
| Admin | `/admin/**` | CMS editor UI | n/a | n/a | n/a | n/a | Never included | Never indexable; also blocked in robots.txt |

## Metadata copy (Phase 2)

- Every live page has its own title and description; `npm run seo:audit` (which now includes the static pages and the offering pages) reports duplicates, over-long titles and any `[SAMPLE]` placeholder as an error.
- Copy that lives in the database (service categories and their introductions, offering pages, Home, case studies, Site Settings brand name and default social image) is written from `src/server/db/service-seo-copy.ts` by `npm run db:update-service-seo-copy`; the DB-less pages' copy is in `src/server/seo/static-pages.ts`.
- `resolveMetadata` never publishes text beginning `[SAMPLE]`; it falls back to the next source instead.
- Site Settings `siteName` is the public brand ("SMASH Digital Media"), used in titles, `og:site_name` and the Organization `name`. The registered name ("SMASH Digital Media Private Limited", `src/lib/company.ts`) is used for the footer copyright, the Legal pages, the enquiry emails and the Organization `legalName`.

## Notes on "Verified"

Every "Verified" entry above traces to code read during this audit (Stage 7, Phase 3), not to an assumption — see [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md) for the exact functions and files.

## Pending (requires a content/business decision, not a code change)

- Opening hours and map coordinates for the business entity: awaiting the business.
- Official social profile URLs (Site Settings `socialLinks` → `sameAs` and the footer icons): awaiting the business.
- Case Study detail pages have no dedicated Article/CaseStudy JSON-LD — add if/when a schema.org type for case studies is deemed worth the investment; Service and Article schema already cover the two highest-value page types.
- Legal pages stay `noindex` until Legal/Compliance supplies approved copy — this is a content decision, not a technical one.

## Future research (explicitly not claimed here)

No keyword volume, difficulty, ranking position, or traffic estimate is claimed anywhere in this document or in the codebase's SEO content (`primarySearchTopic`/`relatedSearchTopics` fields capture the page's own intended topic, entered by an editor — they are not search-volume-validated keywords). If keyword research is commissioned, route/slug choices should be re-validated against it rather than assumed correct from current business terminology alone.
