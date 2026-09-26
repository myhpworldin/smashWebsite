# Page content matrix — Stage 2, Phase 2

Content-first architecture for every public page: purpose, audience, structure, and what each section actually requires before a designer or frontend developer touches it. Builds directly on Stage 2 Phase 1 ([SEO_SITE_ARCHITECTURE.md](SEO_SITE_ARCHITECTURE.md), [PAGE_CONTENT_BLUEPRINT.md](PAGE_CONTENT_BLUEPRINT.md), [SEO_KEYWORD_INTENT_MAP.md](SEO_KEYWORD_INTENT_MAP.md)) — routes, slugs, and intents are not re-derived here, only cited. No business claim, client, metric, or piece of copy below is invented; anything not already in the codebase/seed/approved project direction is marked `CONTENT REQUIRED` or `CLAIM VERIFICATION REQUIRED`. Full gap tracking: [CONTENT_GAP_REPORT.md](CONTENT_GAP_REPORT.md).

## 1. Master page table

| Page | Route | Purpose | Primary Topic | H1 | Sections | Main CTA | CMS | Schema | Internal Links | Indexable |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | `/` | Convert visitors by establishing SMASH's growth-partner positioning and routing to proof | SMASH (brand) | Hero heading (§2) | 12 (§2) | Let's Talk Growth | HomePage + referenced Service/CaseStudy/Testimonial/Insight | Organization | → Services, Work, Insights, hubs | Yes |
| About | `/about` | Establish credibility: who SMASH is and why | About SMASH | "About SMASH" | Story, Team, Proof, Careers CTA | Explore Our Work | No dedicated model yet — `CONTENT REQUIRED` (§8) | Organization (shared) | → Careers, Work | Yes |
| Services hub | `/services` | Route to each service; frame the offering set | SMASH services | "Services" | Intro, card grid | (per card) Discuss Your Requirements | `GET /api/services` | none (listing) | → each Service | Yes |
| Service detail | `/services/[slug]` | Sell one specific, real SMASH service | The named service | Service name | Hero, Problem, Solution, Deliverables, Process, Tools, Proof, FAQ, CTA (§4) | Discuss Your Requirements | Service | Service, FAQPage (gated), BreadcrumbList (gated) | → related Case Study, related Insight | Yes, when published |
| Work hub | `/work` | Prove results across clients/industries | SMASH case studies | "Work" | Intro, filter (optional), card grid | Explore Our Work | `GET /api/work` | none (listing) | → each Case Study | Yes |
| Case study | `/work/[slug]` | Prove a specific outcome; support the commercial pages | The client/project | Case study title | Challenge, Approach, Execution, Results, Client, Testimonial, Related Services (§5) | Explore More Work | CaseStudy | BreadcrumbList (gated) | → related Service(s), related Insight(s) | Yes, when published |
| Industries | `/industries` (not yet justified — see §6) | Would group proof/services by vertical | Industry vertical | n/a | n/a | n/a | No dedicated model — `industry` is free text on Service/CaseStudy only | n/a | n/a | Decision pending |
| Insights hub | `/insights` | Topical authority, ongoing publishing | SMASH articles | "Insights" | Intro, category filter, card grid | Talk to SMASH | `GET /api/insights` | none (listing) | → each Article | Yes |
| Insight article | `/insights/[slug]` | Answer one specific question; support commercial pages | The article's topic | Article title | Intro, body, related content (§7) | Talk to SMASH | Insight | Article | → related Service, related Case Study | Yes, when published |
| Careers hub | `/careers` | Recruit; show culture and open roles | Working at SMASH | "Careers at SMASH" | Culture, open roles list | View Opportunities | No listing API yet — `CONTENT REQUIRED` (DEVELOPER_CONTENT_CONTRACT.md gap) | none | → each posting, → About | Yes |
| Career posting | `/careers/[slug]` | Convert a candidate into an applicant | The role | Role title | Summary, requirements, responsibilities, apply CTA | Apply Now | Career | none (JobPosting deferred — see DEVELOPER_CONTENT_CONTRACT.md) | → Careers hub | Yes, when published |
| Contact | `/contact` | Convert an enquiry | Contacting SMASH | "Contact SMASH" | Contact methods, enquiry form (§9) | Let's Talk Growth | SiteSettings.contact + future form model | none | → Services | Yes |
| Privacy Policy | `/privacy-policy` (built) | Legal disclosure | Data handling | "Privacy Policy" | Body only | none | No model — `CONTENT REQUIRED`, page renders an honest placeholder | none | → Contact | Noindex until content is approved (Stage 4, Phase 7) |
| Terms of Use | `/terms` (built — not `/terms-of-service`, see §10) | Legal disclosure | Terms of use | "Terms of Use" | Body only | none | No model, page renders an honest placeholder | none | → Contact | Noindex until content is approved |
| Cookie Policy | `/cookie-policy` (built) | Legal/data disclosure | Cookie use | "Cookie Policy" | Body only | none | No model, page renders an honest placeholder | none | → Privacy Policy | Noindex until content is approved |

No page was added beyond what the approved sitemap and Phase 1 architecture justify. Industries is evaluated, not assumed (§6).

---

## 2. Home page section architecture

Sequence is fixed by the approved project direction and matches the implemented API contract in [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md) — this table adds the *content* requirement HOME_PAGE_CONTRACT.md doesn't cover (it documents data shape, not copy readiness).

### 01 — Hero
```
Purpose:          Immediately state what SMASH does and its growth-partner positioning.
Headline:         "We Built Businesses Before We Built an Agency." — APPROVED (existing project direction; treated as given, not invented further)
Supporting copy:  CONTENT REQUIRED
Primary CTA:      "Let's Talk Growth" → /contact
Secondary CTA:    CONTENT REQUIRED (only add if a genuine second action exists — e.g. "See Our Work" → /work; do not add a CTA for symmetry alone)
Visual:           Hero image/video — CONTENT REQUIRED (asset not in repo/seed)
Optional proof element: CLAIM VERIFICATION REQUIRED if a stat is placed in the hero (none confirmed yet)
SEO role:         The page's only H1; establishes primary topic (brand/growth positioning) — do not repeat the exact headline elsewhere on the page
Mobile behaviour: RESPONSIVE DESIGN DECISION REQUIRED — hero video autoplay/poster behaviour on mobile bandwidth
CMS source:       HomePage.hero
Frontend shape:   {eyebrow, heading, supportingText, primaryCta, secondaryCta, image, video} — see HOME_PAGE_CONTRACT.md §Sections row 1
Content status:   Copy Required (headline only is approved)
```

### 02 — Business Proof
```
Purpose:          Establish credibility with verified numbers before any narrative claim.
Candidate values: "400+", "₹20L → ₹400Cr", "150 sq.ft", "Major retail network" — these are EXISTING PROJECT DIRECTION EXAMPLES, not approved copy.
Status:           CLAIM VERIFICATION REQUIRED for every one of the four values above. None may publish without: (a) a verified source, and (b) the metric's `source` field populated — already enforced server-side (a metric cannot be published without `source`, per CONTENT_ARCHITECTURE.md "Verified metrics").
Data:             HomeMetricSection — {intro, items: Metric[]} where each Metric needs {label, value, source} at minimum before publish.
SEO role:         Supports the hero's claim with concrete numbers; no keyword role.
CMS source:       HomePage.businessProof
Content status:   Copy Required + Claim Verification Required (blocks publish, not blocks page-building)
```

### 03 — SMASH Story
```
Purpose:          Brief narrative bridge from "who we are" to "what we do."
Headline:         CONTENT REQUIRED
Supporting copy:  CONTENT REQUIRED (any origin-story detail, e.g. company founding narrative, must be verified before publish — do not draft placeholder history)
Media:            CONTENT REQUIRED
CTA:              optional — only if a genuine next step exists (e.g. → /about)
CMS source:       HomePage.story
Content status:   Copy Required
```

### 04 — Services
```
Purpose:          Show the real service catalogue and route to each.
Data:             Referenced, published Service records only (no HomePage-owned copy beyond intro/heading)
Content status:   Blocked on final service catalogue — see §4 "Content Models" in the Final Report and SEO_KEYWORD_INTENT_MAP.md §3
CMS source:       HomePage.servicesSection + home_services link table
```

### 05 — SMASH Growth Engine
```
Purpose:          Explain SMASH's methodology as a named, ordered process.
Steps:            CONTENT REQUIRED (title/description per step)
CMS source:       HomePage.growthEngine — {intro, steps: TitledItem[]}
Content status:   Copy Required
```

### 06 — Selected Work
```
Purpose:          Feature the strongest 3–6 case studies.
Data:             Referenced, published CaseStudy records
Content status:   Blocked on at least one real, published case study (none confirmed — see CONTENT_GAP_REPORT.md)
CMS source:       HomePage.selectedWorkSection + home_case_studies
```

### 07 — Measurable Results
```
Purpose:          Reinforce Business Proof with outcome-level metrics (distinct from company-level Business Proof).
Data:             Same shape as Business Proof — every item needs a verified `source` before publish.
Content status:   Copy Required + Claim Verification Required
CMS source:       HomePage.results
```

### 08 — Why SMASH
```
Purpose:          State genuine differentiators, not generic agency claims.
Data:             CONTENT REQUIRED — {title, description, icon} per reason
Content status:   Copy Required. Flag: avoid generic claims ("best," "leading") that cannot be substantiated — same discipline as the slug-style warning already enforced in SLUG_STRATEGY.md.
CMS source:       HomePage.whySmash
```

### 09 — Client Testimonials
```
Purpose:          Third-party proof.
Data:             Referenced, published Testimonial records
Content status:   Blocked on at least one real, approved testimonial — testimonials must never be fabricated (phase brief §3); none exist in the repo beyond `[SAMPLE]`-prefixed seed data.
CMS source:       HomePage.testimonialsSection + home_testimonials
```

### 10 — Technology & Platforms
```
Purpose:          List real tools/platforms SMASH actually uses.
Data:             CONTENT REQUIRED — {name, logo, description, url} per platform; only list capabilities SMASH genuinely has (phase brief §7 rule 6 applies here too: "List only real capabilities" per HOME_PAGE_CONTRACT.md row 10)
CMS source:       HomePage.technology
```

### 11 — Insights
```
Purpose:          Surface recent/selected articles; supports continuous publishing.
Data:             Referenced, published Insight records
Content status:   Blocked on at least one real, published article
CMS source:       HomePage.insightsSection + home_insights
```

### 12 — Strong CTA
```
Purpose:          Final conversion push before the footer.
Primary CTA:      "Let's Talk Growth" → /contact (consistent with the hero's CTA language — do not introduce a competing phrase, per phase brief §25)
CMS source:       HomePage.cta
Content status:   Copy Required
```

**No section above may launch with invented copy.** Where "CONTENT REQUIRED" appears, the section renders `null` per the existing API contract (`HOME_PAGE_CONTRACT.md` rule 1) until an editor supplies real content — this is already how the backend behaves; Phase 2 does not change that behaviour, only tracks it.

---

## 3. Service architecture

Per-service structure (applies to every service once real names are confirmed — see §11 of the Phase 2 brief and §3 of `SEO_KEYWORD_INTENT_MAP.md`):

```
Service Name / Slug / Primary Topic  ← pending final catalogue (see Content Models §5 below)
Page Purpose        Sell this specific offering
Hero                 Name + one-line value proposition + CTA
Problem              What business pain this addresses — CONTENT REQUIRED per service
SMASH Solution        How SMASH approaches it — CONTENT REQUIRED
Deliverables          Concrete list of what's included — CONTENT REQUIRED
Process               Ordered steps — CONTENT REQUIRED
Tools/Platforms        Only real tools SMASH uses for this service — CONTENT REQUIRED
Proof/Case Study       relatedCaseStudies[] from the API — requires at least one published case study tagged to this service
FAQs                  Real prospect questions — CONTENT REQUIRED
CTA                   "Discuss Your Requirements" → /contact
Related Insights       relatedInsights[] from the API — optional, only if a relevant article exists
Internal Links         → case study, → insight (only when real relationships exist)
SEO Metadata           per SEO_ARCHITECTURE.md resolver — needs metaTitle/metaDescription once name is final
Schema                 Service (always) + FAQPage (once FAQ section renders) + BreadcrumbList (once breadcrumbs render)
```

**Depth check (phase brief §11):** none of the four candidate services (Performance Marketing, Social Media Management, Website Development, CRM Automation) currently has enough approved content to answer the ten questions in §11 of the brief. Each is `CONTENT REQUIRED` end-to-end. No service page should launch until: (a) the service is confirmed real, and (b) Problem/Solution/Deliverables/Process/FAQ copy exists. This prevents exactly the "thin page built only for a keyword" outcome the brief prohibits (§11).

---

## 4. Work / case-study architecture

**Work hub (`/work`):** card grid of published case studies. Filtering by industry is possible today only as a client-side filter on the existing free-text `industry` field (no dedicated Industry taxonomy exists — see §6). No filter should be built prematurely; recommend launching without a filter until enough case studies exist to need one (a filter over 2–3 items adds no value).

**Case study card:** title, slug, path, summary, industry, image, client (published only), keyResult (first result, if any) — already the exact shape of `WorkCard` in `HOME_PAGE_CONTRACT.md`.

**Case study detail (`/work/[slug]`):**
```
Client            CONTENT REQUIRED per case study (real, approved client name — or anonymized if the client requires it)
Industry          free text, CONTENT REQUIRED
Challenge         CONTENT REQUIRED
Approach/Strategy CONTENT REQUIRED
Execution         CONTENT REQUIRED
Results/Metrics   SOURCE / APPROVAL REQUIRED for every number — already enforced server-side (a result cannot publish without a verification `source`)
Media             CONTENT REQUIRED
Testimonial       optional, only if the client approved one
Related Services   relatedServices[] — only real relationships
Related Insights   relatedInsights[] — optional
CTA               "Explore More Work" → /work, or a service-specific CTA if the case study supports one service strongly
```

**Current state: zero real case studies exist in the repository** (only `[SAMPLE]`-prefixed seed content). This is the single largest content blocker for Home (§2, sections 06/07), Work hub, and every Service page's Proof section.

---

## 5. Industries — evaluated, not built

Per phase brief §13: only build `/industries` pages where genuine content value and business relevance exist. Findings:

- No `Industry` content model exists; `industry` is free text on `Service` and `CaseStudy` (confirmed in `src/server/db/schema.ts`).
- No case studies exist yet to populate industry-specific proof.
- Building dedicated `/industries/[slug]` pages today would produce **thin pages with no unique content** beyond a filtered case-study list — exactly what §13 prohibits.

**Decision: do not build `/industries` in this phase.** Recommended path if the business later wants it: once ≥3 real case studies per target industry exist, revisit as a filtered view of `/work` (`?industry=`) before investing in a dedicated content model and page family. This is a pending business decision, not an engineering one — see `CONTENT_GAP_REPORT.md`.

---

## 6. Insights architecture

Already structurally implemented (`API.md`, `PAGE_CONTENT_BLUEPRINT.md` §4). Phase 2 content requirement: the system must support **continuous publication** (phase brief §14) — this is already true (Insight is a standard published-content type with category/tags, no code change needed). The only requirement is an actual editorial process to keep publishing after launch, which is a business/operations decision, not a content-architecture gap.

## 7. Careers architecture

```
Culture/positioning   CONTENT REQUIRED — do not invent employment policy or benefits language (phase brief §15)
Open roles listing    Career records, published only
Role detail            title, summary, description, requirements[], responsibilities[], location, employmentType — all already modelled
Application CTA        "Apply Now" → mailto/form (CONTENT REQUIRED: decide the actual application mechanism — no application-handling backend exists, and building one is outside this phase's scope, same reasoning as Contact §9)
```

## 8. Contact architecture (CRM-ready, CRM not built)

```
Contact methods    SiteSettings.contact — CONTENT REQUIRED (verify actual email/phone/WhatsApp/address before publish)
Enquiry path        Either a mailto/external form for now, or a lightweight public form
Form fields (if approved): name, email, phone (optional), message, service of interest (optional) — a reasonable minimum set, not a CRM-shaped schema
CRM readiness note: build the form's field set and validation as a self-contained "enquiry" concept (e.g. an `Enquiry` record with the fields above) so that connecting it to a CRM later is a matter of adding a consumer, not redesigning the page or its fields. Do NOT build any CRM logic, staff assignment, or lead-routing now — out of scope (phase brief §2).
```

No write endpoint exists yet for this (confirmed in `API.md` "Not implemented" and `DEVELOPER_CONTENT_CONTRACT.md`); building one is a Phase 3+ decision.

## 9. About architecture

```
SMASH Story         CONTENT REQUIRED — do not manufacture company history (phase brief §17)
Business origin      CLAIM VERIFICATION REQUIRED if any founding narrative or timeline is included
Approach              CONTENT REQUIRED
Capabilities          CONTENT REQUIRED
Leadership/Team       TeamMember records already modelled — CONTENT REQUIRED (no team members in the repo beyond seed samples)
Business proof        Reuse the same verified metrics as Home's Business Proof — do not create a second, differently-verified set
Technology            Reuse Home's Technology section content — do not duplicate/diverge
Culture               CONTENT REQUIRED
CTA                   → Careers
```

## 10. Legal pages

**Resolved (Stage 4, Phase 7):** the Stage 4 Phase 7 brief itself specified the final routes — `/privacy-policy`, `/terms`, `/cookie-policy` — settling the naming question this section previously left open. All three are built and render, but hold no approved copy yet and stay noindex until they do; see `CONTENT_GAP_REPORT.md` §9.

```
Privacy Policy   Data handling disclosure — legal-review required before publish
Terms of Use     Terms of use disclosure — legal-review required before publish
Cookie Policy    Cookie/tracking disclosure — required if any analytics/marketing cookies are used (not yet confirmed whether any are); legal-review required
```

None of these three pages should be written as if legally reviewed — every sentence needs sign-off from whoever owns compliance, exactly as Phase 1 already flagged for the first two.
