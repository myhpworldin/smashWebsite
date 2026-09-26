# SEO route map

Source of truth in code: [src/lib/routes.ts](src/lib/routes.ts) (patterns), [src/server/seo/resolve.ts](src/server/seo/resolve.ts) (URL → published content). No keyword research exists for this project: **search volume, difficulty and ranking potential are unknown and deliberately not stated.** Topics below are the site's own terminology and are marked *unvalidated*.

Status legend: **Implemented** = route file or resolver exists and is tested. **Defined** = pattern and resolver recognise it, but no page file yet (frontend/designer track). **Proposed** = not in the approved sitemap; needs confirmation.

## Route table

| Page | Content type | Route pattern | Slug source | Search intent | Primary topic | Secondary topics | Canonical | Indexability | Parent | Related pages | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | HomePage | `/` | none | Navigational | SMASH (brand) | services overview | `/` | Index | none | all hubs | Implemented (placeholder page) |
| About | static | `/about` | none | Navigational | About SMASH | team, story | `/about` | Index | `/` | `/careers`, `/contact` | Defined |
| Services hub | static | `/services` | none | Commercial | SMASH services (list) | each service | `/services` | Index | `/` | service pages | Defined |
| Service detail | Service | `/services/[service-slug]` | `Service.slug` | Commercial | the named service | tools, process, FAQs | `/services/<slug>` | Index when published | `/services` | related case studies, insights | Implemented |
| Work hub | static | `/work` | none | Commercial / informational | SMASH case studies (list) | industries | `/work` | Index | `/` | case studies | Defined |
| Case study | CaseStudy | `/work/[case-study-slug]` | `CaseStudy.slug` | Informational (evidence for commercial intent) | the client/project | related services | `/work/<slug>` | Index when published | `/work` | related services, testimonial, insights | Implemented |
| Insights hub | static | `/insights` | none | Informational | SMASH articles (list) | categories | `/insights` | Index | `/` | articles | Defined |
| Article | Insight | `/insights/[article-slug]` | `Insight.slug` | Informational | the article topic | related services | `/insights/<slug>` | Index when published | `/insights` | related services, case studies | Implemented |
| Careers hub | static | `/careers` | none | Navigational | working at SMASH | open roles | `/careers` | Index | `/` | `/about` | **Gap** — career detail pages exist and are reachable/indexable but there is no hub page file linking to them; see SEO_SITE_ARCHITECTURE.md §1 |
| Career posting | Career | `/careers/[career-slug]` | `Career.slug` | Navigational | the role | none | `/careers/<slug>` | Index when published | `/careers` | none | Implemented (page file, resolver and metadata exist and are tested; the earlier "proposed" status here was stale — see SEO_SITE_ARCHITECTURE.md §1) |
| Contact | static | `/contact` | none | Transactional | contacting SMASH | none | `/contact` | Index | `/` | `/services` | Defined |
| Privacy Policy | static | `/privacy-policy` | none | Navigational | data handling | none | `/privacy-policy` | **Noindex (Stage 4, Phase 7)** — flip once copy is approved | `/` | `/contact` | **Implemented, content pending** — route built, page renders an honest "awaiting approval" notice |
| Terms of Use | static | `/terms` | none | Navigational | terms of use | none | `/terms` | **Noindex (Stage 4, Phase 7)** — flip once copy is approved | `/` | `/privacy-policy` | **Implemented, content pending** — same as above; route is `/terms`, not `/terms-of-service` (naming finalized in the Stage 4 Phase 7 brief) |
| Cookie Policy | static | `/cookie-policy` | none | Navigational | cookie use | none | `/cookie-policy` | **Noindex (Stage 4, Phase 7)** — flip once copy is approved | `/` | `/privacy-policy` | **Implemented, content pending** — same as above |

"Index" is the default. Robots output is implemented (Phase 4, see [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md)): drafts and every non-production environment are `noindex`, and a published page can opt out with `seo.robotsIndex = false`.

Metadata is emitted by `generateMetadata` on `/` and the four detail routes. The hub, About and Contact pages have no page files yet, so they emit nothing until built; their SEO source is `staticPageSource`. Each record's `seo.primarySearchTopic` / `searchIntent` record the intended topic and are editorial only.

## Sitemap status (Phase 8)

Listed in `/sitemap.xml` when published and indexable: `/`, `/services/[slug]`, `/work/[slug]`, `/insights/[slug]`, `/careers/[slug]`. **Not listed**, because no page file exists yet (they return 404): `/about`, `/services`, `/work`, `/insights`, `/careers`, `/contact`. `LIVE_STATIC_ROUTES` (`src/lib/routes.ts`) controls this and a test keeps it in sync with the page files. Details: [SEO_INDEXING.md](SEO_INDEXING.md).

## Non-indexable / non-page paths

| Path | Behaviour |
|---|---|
| `/api/**` | Not public pages; excluded from URL normalisation |
| Draft content slugs | Resolve to not-found (identical to unknown slugs) |
| Old slugs of once-published content | 301 to the current URL (see redirects) |
| Query-string variants (`?utm=…`) | Serve the same page; canonical ignores the query |

## Service slugs

The specification's examples are **not confirmed final services** and none are seeded or hardcoded:

| Example (from spec) | State |
|---|---|
| `performance-marketing`, `social-media-management`, `website-development`, `crm-automation` | Valid slug shapes; each becomes a route only once a matching Service is created and published. Final names must be confirmed by the client. |

`crm-automation` would be a marketing *service page*; it does not imply a CRM product or data model (CRM is on hold).

## Duplicate-intent review

| Pair | Finding | Handling |
|---|---|---|
| `performance-marketing` vs `performance-marketing-services` | Same intent | Rejected in code: services whose slugs share an intent key (ignoring "service(s)" and plural endings) conflict on create/update |
| `/services/about` vs `/about` | Different paths, but confusable | Slugs equal to a top-level segment (`about`, `services`, `work`, `insights`, `careers`, `contact`, `api`) are rejected |
| Possible overlap of `social-media-management` and `performance-marketing` (paid social) | Distinct services, but content must not duplicate | Not enforceable in code; editorial check when both are written |
| Case study vs. service pages for the same topic | Different intent (proof vs. offer) | Allowed; case study slugs describe the client/project, not the service keyword |

The intent check is a slug heuristic only. It cannot detect two differently-named pages covering one topic; that stays an editorial review.

## Internal linking readiness

Relationships that exist in the content model and are exposed with slugs: Service ↔ CaseStudy, Insight → Services/CaseStudies, CaseStudy → Testimonial/Client, Home → all four. Build links only with `ROUTES.*` helpers. Automatic link generation is not implemented.

## Non-public routes (Stage 4, Phase 2)

`/api/admin/**` and `/preview/**` are not part of this route map: neither is indexable, neither is ever linked from a public page, and neither uses slug-based addressing the way public content routes do (admin routes address records by database id — see `API.md`, `CMS_GUIDE.md`). `/preview/` is explicitly disallowed in `robots.txt`; both carry `X-Robots-Tag: noindex, nofollow` on every tier.
