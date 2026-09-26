# Internal linking architecture — Stage 2, Phase 1 (updated in Phase 2, §5)

Every link below corresponds to a real content relationship already present in the data model (`CONTENT_ARCHITECTURE.md`) or a real navigational need. None is added purely for SEO (phase brief §16); see `SEO_ROUTE_MAP.md` §"Internal linking readiness" for the code-level detail this file organizes.

## 1. Structural hierarchy (hub → detail)

```
Home
 ├── Services (hub)
 │    ├── Service: [slug]
 │    └── ... (one per published Service)
 ├── Work (hub)
 │    ├── Case Study: [slug]
 │    └── ...
 ├── Insights (hub)
 │    ├── Article: [slug]
 │    └── ...
 ├── Careers (hub)          ← page file gap, see SEO_SITE_ARCHITECTURE.md §1
 │    ├── Career: [slug]
 │    └── ...
 ├── About
 ├── Contact
 ├── Privacy Policy          (built, Stage 4 Phase 7 — linked from footer, noindex until content is approved)
 ├── Terms of Use            (built, Stage 4 Phase 7 — same)
 └── Cookie Policy           (built, Stage 4 Phase 7 — same)
```

Every hub links down to its own detail pages; every detail page links back up to its hub via breadcrumbs (`BreadcrumbList` schema, already implemented — `SEO_ARCHITECTURE.md`).

## 2. Contextual (cross-entity) relationships

These already exist as queryable relationships in the schema and are returned by the API — this section says which pages should render them as links, not invent new joins.

| From | To | Data source | Already in API? |
|---|---|---|---|
| Service | Related Case Study | `service_case_studies` join table | Yes — `relatedCaseStudies` on `GET /api/services/:slug` |
| Service | Related Insight | `insight_services` join table | Yes — `relatedInsights` on `GET /api/services/:slug` |
| Case Study | Related Service | `service_case_studies` | Yes — `relatedServices` on `GET /api/work/:slug` |
| Case Study | Related Insight | `insight_case_studies` | Yes — `relatedInsights` on `GET /api/work/:slug` |
| Insight | Related Service | `insight_services` | Yes — `relatedServices` on `GET /api/insights/:slug` |
| Insight | Related Case Study | `insight_case_studies` | Yes — `relatedCaseStudies` on `GET /api/insights/:slug` |
| Home | Service, Case Study, Testimonial, Insight | `home_*` ordered link tables | Yes — `HOME_PAGE_CONTRACT.md` §"Sections" |
| Case Study | Client, Testimonial | `client_id`, `testimonial_id` | Yes (null unless published) |
| About | Careers | navigational only, no data relationship | Proposed (§6, `PAGE_CONTENT_BLUEPRINT.md`) |
| Career | About / Careers hub | navigational only | Breadcrumb only |

Every one of these is populated only from published records — a case study never links to a draft service (enforced in the query layer, per `CONTENT_ARCHITECTURE.md` "Publishing").

## 3. Rules

1. **Link only what the API already returns.** No page should fetch extra data solely to manufacture a link; if a relationship isn't in the model, it isn't a link (rules out invented "related content" widgets).
2. **No orphan pages.** Every indexable page must be reachable from at least one other indexable page — this is why the Careers hub gap (§1 of `SEO_SITE_ARCHITECTURE.md`) matters: once a Career posting is published, it is currently unreachable except by direct URL/sitemap, which is a real linking defect, not a cosmetic one.
3. **Breadcrumbs everywhere a hierarchy exists.** `breadcrumbJsonLd` already computes Home → hub → detail (`SEO_ARCHITECTURE.md`); the frontend renders it once breadcrumb UI exists (currently gated off, per `SEO_INDEXING.md`).
4. **Home's `links` block gates navigation.** `links.services/work/insights/about/contact` each carry `available: boolean`; the frontend must not render a link to a hub with `available: false` (it would 404) — see `HOME_PAGE_CONTRACT.md`. The Careers hub should be added to this block once built; Legal pages are footer-only navigation (not part of Home's primary CTA set) and are linked directly since they're now real pages, not gated by this block.
5. **CTA and metric links are audited, not assumed safe.** `seo:audit`'s link-health check already flags a CTA pointing at an unbuilt page or an old slug (`SEO_INDEXING.md` §"Link health") — currently flags `/contact` and `/about` because those pages don't exist yet. This is expected until those pages ship; it is not a new defect.

## 4. Known gaps carried into Phase 2

- Careers hub has no inbound page to link from (About → Careers link is only proposed, not built).
- ~~Legal pages have no inbound link anywhere yet~~ **Resolved, Stage 4 Phase 7:** the Footer component now exists and links all three Legal pages from every page on the site.

## 5. Phase 2 additions — CTA-driven journeys

Content architecture (`PAGE_CONTENT_MATRIX.md`) adds journey-level links beyond the structural/contextual ones above — each is a CTA destination, not a new data relationship, and follows the CTA language rules in that document (§25 of the Phase 2 brief: no competing CTA phrasing per page):

| Page | Primary CTA | Destination | Journey purpose |
|---|---|---|---|
| Home hero + closing CTA | "Let's Talk Growth" | `/contact` | Conversion — same phrase both places, not two competing CTAs |
| Service detail | "Discuss Your Requirements" | `/contact` | Conversion from a specific service interest |
| Work hub / case study | "Explore More Work" | `/work` (from a case study) | Keep proof-browsing momentum before asking for conversion |
| Insight article | "Talk to SMASH" | `/contact` | Convert an informational visit into a conversation |
| Careers hub | "View Opportunities" | scrolls to / lists open `Career` postings | Recruiting funnel |
| About | "Explore Our Work" | `/work` | Bridge credibility → proof |

Every destination above already exists as a route in `SEO_SITE_ARCHITECTURE.md`; no CTA points at an unbuilt page except where a page is explicitly marked "page file needed" elsewhere, in which case the CTA should not render until that page ships (same rule as §3 rule 4 above).

Industries links are intentionally absent: since `/industries` is not being built (`PAGE_CONTENT_MATRIX.md` §5), no internal link should point at it.
