# Page specifications — Stage 2, Phase 4

The single per-page specification that designer, content team, developer and SEO all work from. Every field below is synthesized from already-approved work (Phase 1: [SEO_SITE_ARCHITECTURE.md](SEO_SITE_ARCHITECTURE.md), [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md), [SEO_KEYWORD_INTENT_MAP.md](SEO_KEYWORD_INTENT_MAP.md); Phase 2: [PAGE_CONTENT_MATRIX.md](PAGE_CONTENT_MATRIX.md), [CONTENT_GAP_REPORT.md](CONTENT_GAP_REPORT.md); Phase 3: [CONTENT_CONTRACTS.md](CONTENT_CONTRACTS.md), [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md)) — nothing here contradicts that work; this file consolidates and freezes it into one lookup per page. No route, slug, or API contract was changed except the one documented exception in §0.

## 0. Change-control log for this phase

Per the phase brief's change-control rule (§4), one gap was found and corrected, following the required procedure:

1. **Conflict:** the Careers hub page (§11 below) cannot be marked "Backend: Approved" — no HTTP endpoint existed to list published `Career` records (`GET /api/services`, `/api/work`, `/api/insights` all have list endpoints; `/api/careers` did not).
2. **Technical reason:** the phase brief requires verifying "does the API contain everything the page needs?" before approving a page spec (§27); it did not.
3. **Affected pages:** Careers hub only. Career detail page is unaffected (already served in-process).
4. **SEO implications:** none negative — this is an additive endpoint; no existing route, slug, or canonical changed.
5. **Smallest safe correction:** added `GET /api/careers` and `GET /api/careers/:slug`, mirroring the existing testimonials/clients pattern (uncounted, curated list) exactly, reusing the `listPublishedCareers`/`getPublishedCareerBySlug` service functions that already existed. Two new tests added; full suite re-run at 245/245 passing; `typecheck`/`lint`/`build` all clean.
6. **Documented:** `API.md`, `CONTENT_CONTRACTS.md`, `DEVELOPER_CONTENT_CONTRACT.md`, `CMS_CONTENT_MAP.md` all updated in this phase.

No other backend, route, or contract change was made.

## 1. Specification format

Each page below follows this record:

```
Page Name / Route / Content Type
Page Purpose / Target Audience
Search Intent / Primary Topic / Primary Keyword-Phrase (evidence class) / Secondary Topics
H1 / H2 structure / H3 where needed
Meta Title / Meta Description / Canonical / OG
Schema Type
Primary CTA / Secondary CTA
Internal Links / Related Pages
Image / Video Requirements
Indexability
Content Status / Design Status / Development Status / SEO QA Status
```

Evidence class on every keyword is **semantic recommendation** unless marked **verified** — none are verified (no external keyword tool was available in any phase; see `SEO_KEYWORD_INTENT_MAP.md` §"Important keyword policy").

---

## 2. Home (`/`)

```
Content Type:      HomePage (singleton)
Purpose:           Convert visitors by establishing SMASH's growth-partner positioning and routing to proof
Target Audience:   Prospective clients evaluating a growth/marketing partner
Search Intent:     Navigational (brand)
Primary Topic:     SMASH (brand / growth partner)
Primary Keyword:   "SMASH" / "SMASH international" — semantic, brand term, not a competitive keyword play
Secondary Topics:  services overview, results, technology, growth methodology
H1:                hero.heading — Copy Ready ("We Built Businesses Before We Built an Agency.")
H2s:               Business Proof / SMASH Story / Services / Growth Engine / Selected Work / Measurable Results / Why SMASH / Client Testimonials / Technology & Platforms / Insights / [closing CTA has no heading requirement]
H3:                none required (each section is single-level)
Meta Title:        Home-specific (required to publish an indexable Home): "SMASH International | Growth & Performance Marketing Agency" — brand + approved positioning, no claims; confirm with the client
Meta Description: Home-specific (required to publish an indexable Home); see `HOME_SEO` in src/server/db/home-design-content.ts
Canonical:         "/" (implemented, tested)
OG:                falls back to defaultOgImage until a Home-specific image is set
Schema:            Organization (implemented, renders on every published Home)
Primary CTA:       "Let's Talk Growth" → /contact
Secondary CTA:     none confirmed — do not add one without a genuine second action
Internal Links:    → Services, Work, Insights hubs (via links.* — gated on available:true), → each referenced Service/CaseStudy/Testimonial/Insight
Related Pages:     all hubs
Image Requirements: Hero image/video — CONTENT REQUIRED; must not be an oversized asset (PERFORMANCE REVIEW REQUIRED per CONTENT_GAP_REPORT.md §11)
Video Requirements: Optional hero video — RESPONSIVE DESIGN DECISION REQUIRED for mobile autoplay/poster behaviour
Indexability:      Index, follow, in sitemap (INDEXABILITY_MATRIX.md)
Content Status:    Copy Required (hero headline only is Copy Ready) — see CONTENT_GAP_REPORT.md §1
Design Status:     No approved visual design exists yet (unchanged); all 12 sections implemented structurally against the Phase 1 token system (Stage 3, Phase 2 — Hero; Phase 3 — the remaining 11) — Awaiting Designer Review, not "Not started"
Development Status: Implemented — all 12 sections render real backend data end-to-end (verified live against seeded content, §"Section completion status" below); empty sections correctly render nothing
SEO QA Status:     Ready — one H1 (Hero), 11 real H2s below it (one per section, verified live: exactly 11), resolver/canonical/schema mechanisms verified; content-dependent copy still blocked on approval
```

### Section completion status (Stage 3, Phase 3)

| Section | Design | Content | API | Desktop | Mobile | SEO | Accessibility | Designer QA |
|---|---|---|---|---|---|---|---|---|
| Hero | No design yet | `[SAMPLE]` only | ✓ | ✓ (token-based) | ✓ (structural) | ✓ (H1) | ✓ | Awaiting |
| Business Proof | No design yet | `[SAMPLE]`; real figures blocked (CLAIM VERIFICATION REQUIRED) | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| SMASH Story | No design yet | `[SAMPLE]` only | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Services | No design yet | Blocked on final catalogue | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Growth Engine | No design yet | `[SAMPLE]` only | ✓ | ✓ | ✓ | ✓ (H2, ordered) | ✓ | Awaiting |
| Selected Work | No design yet | Blocked (0 real case studies) | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Measurable Results | No design yet | Blocked (same as Business Proof) | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Why SMASH | No design yet | `[SAMPLE]` only | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Client Testimonials | No design yet | Blocked (0 real testimonials) | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Technology & Platforms | No design yet | `[SAMPLE]` only | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Insights | No design yet | Blocked (0 real articles) | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |
| Strong CTA | No design yet | `[SAMPLE]` only | ✓ | ✓ | ✓ | ✓ (H2) | ✓ | Awaiting |

"✓" under API/Desktop/Mobile/SEO/Accessibility means structurally verified against the token-based placeholder system and real backend data (live end-to-end check, not just typecheck) — not a pixel-perfect design match, since no design exists to match yet.

## 3. About (`/about`)

```
Content Type:      No dedicated model yet (proposed AboutPage — CMS_CONTENT_MAP.md §3)
Purpose:           Establish credibility: who SMASH is and why
Target Audience:   Prospective clients and candidates researching SMASH
Search Intent:     Navigational
Primary Topic:     About SMASH
Primary Keyword:   "About SMASH" — semantic
Secondary Topics:  team, story, capabilities, culture
H1:                "About SMASH"
H2s:               Our Story / Our Team / Careers CTA
H3:                per team member name, if the design groups them individually (optional)
Meta Title/Description: staticPageSource("/about") title only; description CONTENT REQUIRED
Canonical:         "/about" (mechanism ready, page not built)
Schema:            Organization (shared with Home — do not duplicate a second Organization block)
Primary CTA:       "Explore Our Work" → /work
Secondary CTA:     → /careers
Internal Links:    → Careers, → Work
Related Pages:     Careers, Home
Image Requirements: Team member photos — CONTENT REQUIRED
Indexability:      Index, follow (resolved in INDEXABILITY_MATRIX.md)
Content Status:    Copy Required (CONTENT_GAP_REPORT.md §2) — "Our Story" content model itself is still a gap
Design Status:     Built, no visual design (Stage 3, Phase 7)
Development Status: **Built, partially** (Stage 3, Phase 7) — H1, "Our Team" (real published `TeamMember` records), and the Careers/Work CTAs are live; "Our Story" is deliberately not built (still no content model/approved copy — inventing company-history copy would violate the anti-fabrication rule), so the page shows an honest "content pending" note in its place
SEO QA Status:     Ready-pending for the mechanism (metadata/canonical verified live); blocked on "Our Story" content model + copy
```

## 4. Services hub (`/services`)

```
Content Type:      none (listing)
Purpose:           Route to each service; frame the offering set
Target Audience:   Prospective clients comparing offerings
Search Intent:     Commercial investigation
Primary Topic:     SMASH services (overview)
Secondary Topics:  each individual service name
H1:                "Services"
H2s:               none required for a single card grid; add per-category H2 only if the catalogue grows enough to need grouping
Meta Title/Description: staticPageSource("/services") title; description CONTENT REQUIRED
Canonical:         "/services"
Schema:            none (listing page — no CollectionPage claim without justification)
Primary CTA:       per card → its service detail page
Internal Links:    → each published Service
Related Pages:     each Service detail
Image Requirements: each service card image (already in ServiceSummary)
Indexability:      Index, follow
Content Status:    Blocked on final service catalogue approval (§5 below)
Design Status:     Not started
Development Status: Approved — GET /api/services fully sufficient (page file not yet built)
SEO QA Status:     Ready once catalogue is approved
```

## 5. Service detail (`/services/[slug]`) — template, applies once per approved service

```
Content Type:      Service
Purpose:           Sell one specific, real SMASH service
Target Audience:   A prospect who already knows they need this category of service
Search Intent:     Commercial investigation
Primary Topic:     The named service (e.g. Performance Marketing) — CANDIDATE NAME, not yet confirmed final (SEO_KEYWORD_INTENT_MAP.md §3)
Primary Keyword:   The service's own name in natural language, e.g. "performance marketing" — semantic recommendation only
Secondary Topics:  problem it solves, deliverables, process
H1:                Service.name
H2s:               The Business Problem / How SMASH Solves It / What We Deliver / Our Process / Tools & Platforms / Results (Case Study) / Frequently Asked Questions / Let's Talk Growth
H3:                per deliverable/process step, only if the design needs sub-grouping — not required by content
Meta Title:        "{Service name} | SMASH" pattern (resolver-generated, needs the real name)
Meta Description:  CONTENT REQUIRED per service (≤160 chars, per validate.ts convention)
Canonical:         /services/{slug}, self (implemented, tested)
OG:                service hero image → defaultOgImage fallback
Schema:            Service (always, implemented) + FAQPage (once FAQ section renders) + BreadcrumbList (once breadcrumbs render)
Primary CTA:       "Discuss Your Requirements" → /contact
Secondary CTA:     "Read the case study" → related case study, only if one exists
Internal Links:    → relatedCaseStudies[], → relatedInsights[] (both compact summaries, already in the API)
Related Pages:     related Case Study, related Insight
Image Requirements: Hero image, tool/platform logos — CONTENT REQUIRED
Indexability:      Index when published, follow, in sitemap
Content Status:    Blocked — every field CONTENT REQUIRED for all 4 candidate services (CONTENT_GAP_REPORT.md §3)
Design Status:     Not started
Development Status: Approved — API contract (ServiceDetail) already carries every field this spec needs; no backend change required
SEO QA Status:     Blocked on catalogue approval + copy; mechanism itself is Ready
```

## 6. Work hub (`/work`)

```
Content Type:      none (listing)
Purpose:           Prove results across clients/industries
Search Intent:     Commercial investigation / informational (proof)
Primary Topic:     SMASH case studies
H1:                "Work"
Meta Title/Description: staticPageSource("/work") title; description CONTENT REQUIRED
Canonical:         "/work"
Schema:            none
Primary CTA:       per card → its case study
Internal Links:    → each published Case Study
Indexability:      Index, follow
Content Status:    Blocked — zero real case studies exist (CONTENT_GAP_REPORT.md §4, the single largest content blocker site-wide)
Design Status:     Not started
Development Status: Approved — GET /api/work sufficient
SEO QA Status:     Ready once ≥1 real case study exists
```

## 7. Case study (`/work/[slug]`) — template

```
Content Type:      CaseStudy
Purpose:           Prove a specific outcome; support commercial pages
Search Intent:     Informational (proof supporting commercial intent)
Primary Topic:     The client/project
H1:                CaseStudy.title
H2s:               The Challenge / Our Strategy / Execution / Results / Client / What They Said / Related Services
Meta Title/Description: per case study, CONTENT REQUIRED once real case studies exist
Canonical:         /work/{slug}, self
Schema:            BreadcrumbList (once breadcrumbs render); no Review/Rating schema (no rating data exists — correctly withheld)
Primary CTA:       "Explore More Work" → /work
Internal Links:    → relatedServices[], → relatedInsights[]
Image Requirements: hero image, media gallery — CONTENT REQUIRED
Indexability:      Index when published, follow, in sitemap
Content Status:    Blocked — no real case study exists yet; every numeric result requires "Pending verification" until a `source` is supplied (server-enforced)
Design Status:     Not started
Development Status: Approved
SEO QA Status:     Blocked on content
```

## 8. Industries (`/industries`) — not approved for build

```
Decision:          NOT BUILDING (re-confirmed again in Stage 3, Phase 7, when the phase brief explicitly asked for it; unchanged from PAGE_CONTENT_MATRIX.md §5)
Reason:            No Industry content model exists (industry is free text on Service/CaseStudy only); the project still has just one sample case study, so there is nothing to populate any industry-specific proof; building it now would produce thin, duplicate content against /work — exactly what that phase brief's own §9/§11 rules prohibit ("Do not create thin SEO pages").
Revisit condition:  ≥3 real case studies per target industry, and business confirmation that grouping by industry adds distinct value beyond /work. Neither condition changed this phase.
```

## 9. Insights hub (`/insights`)

```
Content Type:      none (listing)
Purpose:           Topical authority, continuous publishing
Search Intent:     Informational
Primary Topic:     SMASH articles / marketing insights
H1:                "Insights"
Meta Title/Description: staticPageSource("/insights") title; description CONTENT REQUIRED
Canonical:         "/insights"
Primary CTA:       per card → article
Internal Links:    → each published Insight
Indexability:      Index, follow
Content Status:    Blocked — zero real articles exist; acceptable to launch with 0 (section renders null) but 1–2 at launch recommended
Design Status:     Not started
Development Status: Approved — GET /api/insights (with ?category) sufficient
SEO QA Status:     Ready once ≥1 article exists
```

## 10. Insight article (`/insights/[slug]`) — template

```
Content Type:      Insight
Purpose:           Answer one specific question; support commercial pages informationally
Search Intent:     Informational
Primary Topic:     The article's specific topic (author-determined per article, not predetermined here)
H1:                Insight.title
Body structure:    Markdown-authored H2/H3 within the article body — not prescribed here (content, not architecture)
Meta Title/Description/Canonical/OG: per article, resolver-implemented
Schema:            Article (implemented; requires headline + publish date)
Primary CTA:       "Talk to SMASH" → /contact
Internal Links:    → relatedServices[], → relatedCaseStudies[]
Indexability:      Index when published, follow, in sitemap
Content Status:    Per-article, none exist yet
Development Status: Approved
SEO QA Status:     Ready once articles are authored; each new article should be manually checked against existing published titles for topic overlap (no automated check exists — SEO_KEYWORD_INTENT_MAP.md §5)
```

## 11. Careers hub (`/careers`)

```
Content Type:      Career (list) — via GET /api/careers, added this phase (§0)
Purpose:           Recruit; show culture and open roles
Search Intent:     Navigational
Primary Topic:     Working at SMASH
H1:                "Careers at SMASH"
H2s:               Culture / Open Roles
Meta Title/Description: staticPageSource("/careers") title; description CONTENT REQUIRED
Canonical:         "/careers"
Schema:            none (a JobPosting-per-role schema is deferred — see §12)
Primary CTA:       "View Opportunities" → list of open Career postings
Internal Links:    → each published Career posting, → About
Image Requirements: none required beyond optional culture imagery — CONTENT REQUIRED if used
Indexability:      Index, follow, in sitemap (resolved in INDEXABILITY_MATRIX.md)
Content Status:    Copy Required (culture/positioning) — CONTENT_GAP_REPORT.md §7
Design Status:     Built, no visual design (Stage 3, Phase 7)
Development Status: **Built** (Stage 3, Phase 7) — `/careers/page.tsx`, lists real published `Career` records via `listPublishedCareers`, no pagination (small curated set); "Culture" H2 not built (no approved copy, matches Content Status)
SEO QA Status:     Ready-pending — mechanism (metadata/canonical/sitemap) verified live; blocked only on real culture copy
```

## 12. Career posting (`/careers/[slug]`)

```
Content Type:      Career
Purpose:           Convert a candidate into an applicant
Search Intent:     Navigational / transactional (apply)
Primary Topic:     The specific role title
H1:                Career.title
H2s:               Summary / Requirements / Responsibilities / Apply
Meta Title/Description/Canonical: implemented (careerMetadata)
Schema:            None. JobPosting deliberately deferred: Google's JobPosting schema requires datePosted/validThrough (and typically salary/location structure) that the Career model does not carry (SEO_CONTENT_MAP.md §2) — adding fields for schema's sake without a genuine posting-lifecycle need would violate §23/§31 (no fabricated data)
Primary CTA:       "Apply — Contact Us" → `/contact` (Stage 3, Phase 7 decision: no ATS/application backend exists and building one is CRM-adjacent scope, so "Apply" honestly routes to the one real public enquiry channel rather than a fabricated application flow)
Internal Links:    → Careers hub (breadcrumb)
Indexability:      Index when published, follow, in sitemap (resolved — was "decision required" in Stage 1)
Content Status:    Per-posting, sample content only
Design Status:     Built, no visual design (Stage 3, Phase 7)
Development Status: **Built** (Stage 3, Phase 7) — breadcrumbs, summary/meta, description, responsibilities, requirements, Apply CTA; BreadcrumbList schema (no JobPosting — see Schema above)
SEO QA Status:     Ready-pending — mechanism verified live; blocked only on real role copy
```

## 13. Contact (`/contact`)

```
Content Type:      SiteSettings.contact + proposed Enquiry model (CMS_CONTENT_MAP.md §3)
Purpose:           Convert an enquiry
Search Intent:     Transactional
Primary Topic:     Contacting SMASH
H1:                "Contact SMASH"
Meta Title/Description: staticPageSource("/contact") title; description CONTENT REQUIRED
Canonical:         "/contact"
Schema:            none required (no LocalBusiness claim without verified address/hours)
Primary CTA:       "Let's Talk Growth" → enquiry mechanism
Secondary CTA:     phone / WhatsApp — mechanism built (Stage 6, Phase 4); renders once a real number is configured
Internal Links:    → Services
Indexability:      Index, follow, in sitemap (resolved)
Content Status:    Approval Required — verified contact details (including a real WhatsApp number) not yet populated in SiteSettings (CONTENT_GAP_REPORT.md §8); an administrator can read submitted messages back (Stage 6, Phase 3) but there is still no CRM surface — by design
Design Status:     Built, no visual design (Stage 3, Phase 7)
Development Status: **Built** (Stage 3, Phase 7; WhatsApp and admin read-back added Stage 6, Phases 3–4) — the `Enquiry` model (name/email/phone?/message/serviceOfInterest?/createdAt, exactly the shape CMS_CONTENT_MAP.md §3 pre-approved), `POST /api/contact`, and a real client-validated form with server-side validation (including that `serviceOfInterest`, if sent, must name a real published service), its own rate-limit bucket and an invisible honeypot. Still not CRM: the submission is written, an administrator can read it back, and nothing more. Display-only contact details render the `SiteSettings.contact` fields that exist, now including WhatsApp click-to-chat once a number is configured
SEO QA Status:     Ready-pending — mechanism verified live; blocked on verified contact details and real copy
```

## 14. Legal pages (`/privacy-policy`, `/terms`, `/cookie-policy`) — built, Stage 4 Phase 7

```
Content Type:      No model exists — a static placeholder body, not CMS-editable (a LegalPage content type is only worth building once real copy exists to migrate in; see CONTENT_GAP_REPORT.md §9)
Purpose:           Legal disclosure
Search Intent:     Navigational
H1:                "Privacy Policy" / "Terms of Use" / "Cookie Policy"
Canonical:         finalized — the Stage 4 Phase 7 brief settled the naming (/terms, not /terms-of-service)
Schema:            none
Indexability:      Noindex, deliberately, until legal review supplies real copy — indexing a placeholder would be a false signal to search engines. Flip `robotsIndex` in static-pages.ts once content lands.
Content Status:    Content pending approval (legal review required) — the page honestly says so rather than inventing legal language or 404ing
Development Status: Built — route, page, noindex metadata and footer link are all live; the only remaining gap is legal copy, not engineering
Footer linking:    Done — the Footer now links all three pages from every page on the site
SEO QA Status:     Verified (sitemap correctly excludes them, robots meta correct, no broken links) — blocked only on legal copy
```

---

## 15. CMS and API compatibility verification (phase brief §26–27)

Checked every page above against the frozen contract in `CONTENT_CONTRACTS.md`:

| Page | API contains everything needed? | Verdict |
|---|---|---|
| Home | Yes — `HomeResponse` covers all 12 sections + seo + links | **Approved** |
| About | No — no model for story/approach/culture copy | **Missing Data** (content-model gap, not a code defect — see §3) |
| Services hub / detail | Yes — `ServiceSummary`/`ServiceDetail` cover the full blueprint | **Approved** |
| Work hub / Case study | Yes — `CaseStudySummary`/`CaseStudyDetail` | **Approved** |
| Insights hub / article | Yes — `InsightSummary`/`InsightDetail` | **Approved** |
| Careers hub | **Was Missing Data — fixed this phase** (§0) | **Approved** |
| Career posting | Yes — `CareerDetail` | **Approved** |
| Contact | Yes — display fields (`SiteSettingsPublic.contact`) and, as of Stage 3 Phase 7, `POST /api/contact` for submissions | **Approved** |
| Legal | No model exists (static placeholder body) | **Missing Data** (content only — page and route are built, Stage 4 Phase 7) |

Only one gap was fixable within this phase's scope (Careers hub — a genuine, justified, additive API endpoint). About and Legal require new content models, which is a larger decision (what fields, who owns the content) appropriately deferred to a content-model design step, not something to add speculatively per phase brief §26 rule 3 ("determine whether it is genuinely required" — yes, but the *shape* of that model needs a content decision first, e.g. does About need multiple story sections or one block; inventing that now would be exactly the "field added because it might be useful" the brief prohibits).

## 16. Final page specification matrix

| Page | Route | Primary Topic | Search Intent | H1 | Meta | Canonical | Schema | Internal Links | Content | Design | Dev | SEO |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | `/` | SMASH (brand) | Navigational | hero.heading | Partial | ✓ | Organization | ✓ | Copy Required | Not started | Approved | Ready |
| About | `/about` | About SMASH | Navigational | "About SMASH" | Pending | ✓ | none | ✓ | Copy Required ("Our Story") | Built, no visual design | Built, partially | Ready-pending |
| Services hub | `/services` | SMASH services | Commercial | "Services" | Pending | ✓ | none | ✓ | Blocked (catalogue) | Not started | Approved | Ready-pending |
| Service detail | `/services/[slug]` | Named service | Commercial | Service.name | Pending | ✓ | Service+FAQPage+Breadcrumb | ✓ | Blocked | Not started | Approved | Blocked |
| Work hub | `/work` | Case studies | Commercial/Informational | "Work" | Pending | ✓ | none | ✓ | Blocked | Not started | Approved | Ready-pending |
| Case study | `/work/[slug]` | Client/project | Informational | title | Pending | ✓ | Breadcrumb | ✓ | Blocked | Not started | Approved | Blocked |
| Industries | — | — | — | — | — | — | — | — | Not building | Not building | Not building | Not building |
| Insights hub | `/insights` | Articles | Informational | "Insights" | Pending | ✓ | none | ✓ | Blocked (0 real articles) | Built, no visual design (Stage 3, Phase 6) | Approved | Ready-pending |
| Insight article | `/insights/[slug]` | Per-article | Informational | title | ✓ (mechanism) | ✓ | Article+Breadcrumb | ✓ | Per-article | Built, no visual design (Stage 3, Phase 6) | Approved | Ready-pending |
| Careers hub | `/careers` | Working at SMASH | Navigational | "Careers at SMASH" | Pending | ✓ | none | ✓ | Copy Required ("Culture") | Built, no visual design | Built | Ready-pending |
| Career posting | `/careers/[slug]` | Role title | Navigational/Transactional | title | ✓ | ✓ | Breadcrumb (no JobPosting) | ✓ | Per-posting | Built, no visual design | Built | Ready-pending |
| Contact | `/contact` | Contacting SMASH | Transactional | "Contact SMASH" | Pending | ✓ | none | ✓ | Approval Required (details) | Built, no visual design | Built (form + display) | Ready-pending |
| Legal (×3) | `/privacy-policy`, `/terms`, `/cookie-policy` | data/terms/cookies | Navigational | per-page | Noindex (deliberate) | ✓ | none | ✓ (footer) | Pending approval | Built, no visual design | Built | Verified, content-blocked |

"✓" under Meta/Canonical/Internal Links means the *mechanism* is implemented and tested, not that final approved copy exists — content readiness is tracked separately in the Content column and in `CONTENT_GAP_REPORT.md`.
