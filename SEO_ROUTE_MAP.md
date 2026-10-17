# SEO Route Map

Every public route, its data source, and its current SEO status. "Verified" means actually implemented and tested; "Pending"/"Future research" are called out explicitly rather than assumed.

| Page Type | Route | Primary Topic | Slug Valid | Metadata | Canonical | Schema | Sitemap | Indexable |
|---|---|---|---|---|---|---|---|---|
| Home | `/` | Business homepage | n/a (singleton) | Verified — `homeMetadata()` | Verified — self, forced (hard publish block if it points elsewhere) | Organization, WebSite-level breadcrumb excluded (depth < 2) | Verified — included when published | Published + indexable tier only |
| Services (hub) | `/services` | Service catalogue | n/a | Verified — `staticPageMetadata` | Verified — self | None (hub page) | Verified — static entry | Always (no draft concept for a hub) |
| Service | `/services/[slug]` | One service | Verified — unique, lowercase, hyphenated, format+uniqueness enforced | Verified — `serviceMetadata(slug)` | Verified — self by default, editor override allowed | Service, BreadcrumbList, FAQPage (only if the service has FAQs) | Verified — published only | Published + `seo.robotsIndex !== false` |
| Service offering | `/services/[category]/[offering]` | One deliverable's own page | Verified — same slug rules, nested to avoid collision with category slugs | Verified — `serviceOfferingMetadata` | Verified — self | BreadcrumbList (3-level) | Pending — not yet in the sitemap generator; low priority since offerings are reachable from their category page | Published category + offering has its own slug |
| Work (hub) | `/work` | Case study catalogue | n/a | Verified — `staticPageMetadata`, pagination-aware (page 2+ gets its own canonical/title, noindex,follow) | Verified — self per page number | None (hub page) | Verified — static entry (page 1 only; later pages are intentionally noindex) | Page 1 always; page 2+ follow-only |
| Case Study | `/work/[slug]` | One case study | Verified | Verified — `caseStudyMetadata(slug)` | Verified | Service(s) referenced via BreadcrumbList; no dedicated CaseStudy/Article @type (see Pending) | Verified — published only | Published + indexable |
| Insights (hub) | `/insights` | Article catalogue | n/a | Verified — `staticPageMetadata`, pagination-aware (same as Work) | Verified — self per page number | None (hub page) | Verified — static entry (page 1 only) | Page 1 always; page 2+ follow-only |
| Article | `/insights/[slug]` | One article | Verified | Verified — `insightMetadata(slug)` | Verified | Article, BreadcrumbList | Verified — published only | Published + indexable |
| About | `/about` | Company page | n/a | Verified — `staticPageMetadata`, falls back to site-wide description (no invented copy) | Verified — self | None yet (no Organization schema emitted outside Home) | Verified — static entry | Always indexable |
| Careers (hub) | `/careers` | Job listing catalogue | n/a | Verified — `staticPageMetadata` | Verified — self | None (hub page) | Verified — static entry | Always indexable |
| Career | `/careers/[slug]` | One job listing | Verified | Verified — `careerMetadata(slug)` | Verified | BreadcrumbList only — no JobPosting (honest omission: `datePosted`/`validThrough` don't exist on the Career model) | Verified — published only | Published + indexable |
| Contact | `/contact` | Contact page | n/a | Verified — `staticPageMetadata` | Verified — self | None | Verified — static entry | Always indexable |
| FAQ | `/faq` | Frequently asked questions | n/a | Verified — `staticPageMetadata`, page-specific description | Verified — self | FAQPage (exactly the questions rendered, from `src/lib/faq-content.ts`) + BreadcrumbList | Verified — static entry | Always indexable |
| Privacy / Terms / Cookie Policy | `/privacy-policy`, `/terms`, `/cookie-policy` | Legal pages | n/a | Verified — title only | Verified — self | None | Excluded from sitemap | Deliberately `noindex` until approved legal copy lands (Stage 4, Phase 7) |
| Preview pages | `/preview/**` | Editor preview of a single draft | n/a | Hand-rolled, always `noindex,nofollow` | n/a | None | Never included | Never indexable, regardless of content status |
| Admin | `/admin/**` | CMS editor UI | n/a | n/a | n/a | n/a | Never included | Never indexable; also blocked in robots.txt |

## Notes on "Verified"

Every "Verified" entry above traces to code read during this audit (Stage 7, Phase 3), not to an assumption — see [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md) for the exact functions and files.

## Pending (requires a content/business decision, not a code change)

- Service offering pages (`/services/[category]/[offering]`) are not yet included in `sitemap.xml` — low priority, since they're already linked from their published category page, but worth adding once the frontend redesign confirms offering pages are a permanent, promoted part of the site rather than a secondary deep-link target.
- Case Study detail pages have no dedicated Article/CaseStudy JSON-LD — add if/when a schema.org type for case studies is deemed worth the investment; Service and Article schema already cover the two highest-value page types.
- Legal pages stay `noindex` until Legal/Compliance supplies approved copy — this is a content decision, not a technical one.

## Future research (explicitly not claimed here)

No keyword volume, difficulty, ranking position, or traffic estimate is claimed anywhere in this document or in the codebase's SEO content (`primarySearchTopic`/`relatedSearchTopics` fields capture the page's own intended topic, entered by an editor — they are not search-volume-validated keywords). If keyword research is commissioned, route/slug choices should be re-validated against it rather than assumed correct from current business terminology alone.
