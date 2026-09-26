# SEO site architecture — Stage 2, Phase 1

> **Update, Stage 4 Phase 7:** this file is a Stage 2 snapshot and was not kept in lockstep with every later build phase (most "no page file"/"Defined" rows below are now built — see `ARCHITECTURE.md` §5 for the current state). The one item worth calling out explicitly: **Legal is resolved.** The routes proposed here as `/privacy-policy` / `/terms-of-service` are now built at `/privacy-policy`, `/terms` (not `-of-service` — the later phase brief settled the naming) and `/cookie-policy`, all noindex until legal review supplies real copy (`CONTENT_GAP_REPORT.md` §9). §6's "pending decision" #1 below is superseded by that.

This is the top-level map of the public website: every page that should exist, its parent, its build status, and why it exists. Per-route SEO detail (canonical, robots, secondary topics, status legend) lives in [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md); this file is the inventory and hierarchy that map is built from. Content models and relationships: [CONTENT_ARCHITECTURE.md](CONTENT_ARCHITECTURE.md). Nothing here invents new routes beyond what Stage 1 already defined in [src/lib/routes.ts](src/lib/routes.ts) except the two gaps identified in §3.

## 1. Inspection findings (what Stage 1 actually built vs. documented)

Read `src/lib/routes.ts`, `src/app/**`, `src/server/seo/static-pages.ts`, and Stage 1's own docs before changing anything. Three discrepancies were found:

| Existing route/doc | Existing content | Existing problem | Decision |
|---|---|---|---|
| `/careers/[slug]` | Page file exists (`src/app/careers/[slug]/page.tsx`), resolver wired, metadata wired | `SEO_ROUTE_MAP.md` still listed this as "Proposed" and its indexability as an open question, even though it is built and tested | Reclassified as **Implemented** below and in the updated route map; indexability resolved (§5 of this doc, and `INDEXABILITY_MATRIX.md`) |
| `/careers` (hub) | No page file. `STATIC_ROUTES` includes it; `LIVE_STATIC_ROUTES` does not | Career detail pages exist with no hub linking to them — an orphaned branch of the sitemap once careers are published | Confirmed as a required page (§3); flagged to the developer contract as a gap, not a new invention |
| Legal pages (Privacy Policy, Terms of Service) | Do not exist anywhere: no route constant, no page, no content model | Required for a commercial site collecting contact-form data; absent from every Stage 1 document | Added to the inventory as **Proposed**; needs a route decision and a content owner (§3, §9) |

No other route was added, renamed, or removed. `/services`, `/work`, `/insights`, `/about`, `/contact` remain hub/static pages with no page file yet (Stage 1's own "known limitation"); that is unchanged here.

## 2. Page inventory

| Page | Content type | Parent | URL | Indexable | Primary topic | Status |
|---|---|---|---|---|---|---|
| Home | HomePage | — | `/` | Yes | SMASH (brand) | Implemented (placeholder UI) |
| About | static | Home | `/about` | Yes | About SMASH | Defined (no page file) |
| Services hub | static | Home | `/services` | Yes | SMASH services (list) | Defined (no page file) |
| Service detail | Service | Services hub | `/services/[slug]` | Yes, when published | The named service | Implemented |
| Work hub | static | Home | `/work` | Yes | SMASH case studies (list) | Defined (no page file) |
| Case study | CaseStudy | Work hub | `/work/[slug]` | Yes, when published | The client/project | Implemented |
| Insights hub | static | Home | `/insights` | Yes | SMASH articles (list) | Defined (no page file) |
| Insight article | Insight | Insights hub | `/insights/[slug]` | Yes, when published | The article topic | Implemented |
| Careers hub | static | Home, About | `/careers` | Yes | Working at SMASH | **Gap — needs a page file** (see §1) |
| Career posting | Career | Careers hub | `/careers/[slug]` | Yes, when published | The role | Implemented |
| Contact | static | Home | `/contact` | Yes | Contacting SMASH | Defined (no page file) |
| Privacy Policy | static (new) | footer, Contact | `/privacy-policy` (proposed) | Yes | Data handling | **Proposed** — route, content owner and copy all pending |
| Terms of Service | static (new) | footer | `/terms-of-service` (proposed) | Yes | Terms of use | **Proposed** — same as above |

Every page above has a real business purpose: brand/navigation (Home, About), conversion (Services, Contact), proof (Work), authority/informational (Insights), recruiting (Careers), and legal compliance (Legal). No page was added for speculative SEO value alone (§6 of the phase brief).

## 3. Hierarchy

```
/
├── /about
│    └── (links to) /careers
├── /services
│    ├── /services/[service-slug]  (repeat per published service)
│    └── ...
├── /work
│    └── /work/[case-study-slug]   (repeat per published case study)
├── /insights
│    └── /insights/[article-slug]  (repeat per published article)
├── /careers                        ← gap: page file missing
│    └── /careers/[career-slug]    (repeat per published posting)
├── /contact
├── /privacy-policy                 ← proposed, not yet approved
└── /terms-of-service                ← proposed, not yet approved
```

Depth is capped at hub → detail, matching the existing URL policy in [URL_CONVENTIONS.md](URL_CONVENTIONS.md); nothing here introduces a third level (e.g. no `/services/[category]/[slug]`).

## 4. What did not change

- No service, case study, or insight slugs were invented or renamed. The four example service slugs (`performance-marketing`, `social-media-management`, `website-development`, `crm-automation`) remain **unconfirmed examples**, not approved final services — see [SEO_KEYWORD_INTENT_MAP.md](SEO_KEYWORD_INTENT_MAP.md) §3.
- No CMS, admin, authentication, or write endpoint was proposed. Out of scope per the phase brief.
- No visual layout, styling, or component design was produced. See [DESIGNER_HANDOFF.md](DESIGNER_HANDOFF.md) for what the designer needs instead.

## 5. Careers hub and indexability

Resolution for the open question left in Stage 1 (`SEO_ROUTE_MAP.md`, "Career posting" row): career detail pages should be indexable when published, on the same rule as every other content type (draft → 404/noindex, published → index unless opted out). Rationale: a job posting is content a candidate searches for by role name; there is no reason to withhold it that doesn't apply equally to services or case studies. This is recorded as final in `INDEXABILITY_MATRIX.md` and no longer listed as "decision required."

## 6. Pending, genuinely open decisions

1. **Legal page routes and copy.** `/privacy-policy` and `/terms-of-service` are a naming *proposal* (flat, matching the site's existing flat hub style rather than nesting under `/legal/`). Needs sign-off from whoever owns compliance copy — this is not an SEO or engineering decision.
2. **Careers hub content** — no copy, no "open roles" listing behaviour defined yet (does it list all published `Career` records, or link out?). See `PAGE_CONTENT_BLUEPRINT.md` §6 for the proposed structure pending confirmation.
3. **Final service names** — still placeholders (§4).
