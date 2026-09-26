# Content gap report — Stage 2, Phase 2

Every piece of copy, media, or claim referenced by [PAGE_CONTENT_MATRIX.md](PAGE_CONTENT_MATRIX.md) that does not yet exist, or exists only as an unverified example, tracked by page and severity. Nothing here is filled with invented copy or Lorem Ipsum (phase brief §28); missing content is marked missing.

## Content states used

`Copy Required` · `Copy Draft` · `Copy Ready` · `Image Required` · `Image Ready` · `Video Required` · `Video Ready` · `Approval Required` · `Approved` · `Uploaded` · `Published`

## 1. Home

```
Hero
- Headline:        Copy Ready  ("We Built Businesses Before We Built an Agency." — approved project direction)
- Supporting copy: Copy Required
- Hero visual:     Image/Video Required
- Secondary CTA:   Copy Required (only if a genuine second action is confirmed)

Business Proof
- "400+":                    Claim Verification Required
- "₹20L → ₹400Cr":            Claim Verification Required
- "150 sq.ft":                Claim Verification Required
- "Major retail network":     Claim Verification Required
- (all four block publish until each metric's `source` is supplied — already enforced server-side)

SMASH Story        — Copy Required, Image Required
Services section    — blocked on final service catalogue (see §3)
Growth Engine        — Copy Required (steps)
Selected Work        — blocked on at least one real case study (see §4)
Results              — Copy Required + Claim Verification Required (same as Business Proof)
Why SMASH            — Copy Required
Testimonials         — blocked on at least one real, approved testimonial (see §5)
Technology           — Copy Required (platform list)
Insights             — blocked on at least one real, published article (see §6)
Closing CTA          — Copy Required
```

**Critical:** Hero supporting copy, hero visual, at least one real service, one real case study, one real testimonial (else the corresponding Home sections legitimately render `null`, which is acceptable but reduces the page to a fraction of its intended structure).
**Important:** Business Proof/Results verification, Growth Engine, Why SMASH, Technology.
**Optional:** Selected Work beyond the minimum one item, secondary hero CTA.

## 2. About

```
Story/origin narrative   Copy Required + Claim Verification Required (any founding detail)
Approach                  Copy Required
Capabilities              Copy Required
Leadership/Team           Copy Required per TeamMember (name, role, bio, photo) — none exist beyond seed samples; the "Our Team" section is wired up (Stage 3, Phase 7) and will show real ones as soon as they're published
Business proof            Reuse Home's, once verified (do not create a second set)
Technology                Reuse Home's
Culture                   Copy Required
Content model             Missing entirely for the story/approach/culture narrative — see CMS_CONTENT_MAP.md §3 (AboutPage proposal); "Our Team" did not need a new model (TeamMember already existed)
```
**Critical:** content model + at least the story/approach copy. **Important:** team profiles. **Optional:** a second technology/culture treatment beyond Home's.

## 3. Services (hub + all 4 candidate detail pages)

```
Final service catalogue    Approval Required — the four example names are not confirmed as SMASH's actual offerings
Per service (×4 candidates):
  Hero copy         Copy Required
  Problem            Copy Required
  Solution            Copy Required
  Deliverables         Copy Required
  Process               Copy Required
  Tools/Platforms        Copy Required
  Case study proof       Blocked on §4 (no case studies exist)
  FAQs                    Copy Required
  Hero/section images      Image Required
```
**Critical:** catalogue approval (blocks everything else — writing final copy against unconfirmed names risks rework). **Important:** Problem/Solution/Deliverables/Process (the page's substance). **Optional:** FAQ (can launch thin and be extended, unlike the rest).

## 4. Work / Case studies

```
Real case studies: NONE exist in the repository (only [SAMPLE]-prefixed seed content, per CONTENT_ARCHITECTURE.md §"Sample content")
Per future case study:
  Client name/logo       Approval Required (client sign-off before publishing their name)
  Industry                Copy Required
  Challenge/Approach/Execution   Copy Required
  Results/metrics          Source / Approval Required for every number (enforced server-side — cannot publish without a verification source)
  Media                     Image Required
  Testimonial               Approval Required (client sign-off)
```
**Critical:** at least 1 real case study to unblock Home's Selected Work/Results and every service's Proof section — this is the single highest-leverage content gap in the whole site. **Important:** 3–6 case studies for a credible Work hub. **Optional:** testimonial attached to each.

## 5. Testimonials (site-wide)

```
Real, approved testimonials: NONE exist (seed data is [SAMPLE]-prefixed only)
```
**Critical:** at least 1 to populate Home's Testimonials section (currently would legitimately render `null`).

## 6. Insights

```
Real, published articles: NONE exist
Per article: title, excerpt, body, author, featured image — all Copy/Image Required
```
**Important, not Critical:** Insights is the one section designed for ongoing, post-launch publication (phase brief §14) — a launch with zero articles is acceptable if Home's Insights section renders `null`, but at least 1–2 articles at launch is strongly recommended for credibility and to exercise the Article schema end-to-end before relying on it.

## 7. Careers

```
Culture/positioning copy    Copy Required
Open roles                    Content-dependent — zero or more, real postings only
Application mechanism          **Resolved (Stage 3, Phase 7):** no ATS/application backend was built (out of scope); "Apply" honestly routes to `/contact` instead
Careers hub page file           **Done (Stage 3, Phase 7)** — see SEO_SITE_ARCHITECTURE.md §1
Careers list endpoint/wiring     Done — `GET /api/careers` (Stage 2, Phase 4); page wired to it (Stage 3, Phase 7)
```
**Critical (remaining):** culture copy. **Optional:** open roles (a "no current openings" state is legitimate, and is what currently renders without real postings).

## 8. Contact

```
Verified contact details (email/phone/WhatsApp/address)   Approval Required — must confirm before publish; nothing in SiteSettings is populated with real values yet. **WhatsApp field added (Stage 6, Phase 4)** — the model/schema decision is resolved; only a real number is still missing.
Enquiry mechanism                                            **Resolved (Stage 3, Phase 7; read-back added Stage 6, Phase 3):** a minimal `Enquiry` write model + `POST /api/contact` + a real form, exactly the shape CMS_CONTENT_MAP.md §3 pre-approved, plus an administrator-only `GET /api/admin/enquiries` to actually see submissions. Not CRM — no assignment, pipeline, or notification exists.
Contact page file                                             **Done (Stage 3, Phase 7)**
```
**Critical (remaining):** verified contact details, including a real WhatsApp number now that the field exists.

## 9. Legal

```
Routes                **Resolved (Stage 4, Phase 7):** /privacy-policy, /terms, /cookie-policy — no longer pending naming.
Page files             **Done (Stage 4, Phase 7):** all three render, noindex, with a clear "awaiting approved content" notice — never invented policy text.
Privacy Policy copy    Copy Required + Approval Required (legal review) — still the real gap
Terms of Use copy      Copy Required + Approval Required — still the real gap
Cookie Policy copy     Copy Required + Approval Required + only needed if the site actually sets non-essential cookies (unconfirmed — verify before committing to write this page)
Content model         Still none (CMS_CONTENT_MAP.md §3) — the three pages are static placeholders, not CMS-editable; a LegalPage content type is only worth building once real copy exists to migrate in
```
**Critical for a public launch with any data collection (e.g. a contact form):** Privacy Policy copy. **Important:** Terms of Use copy. **Optional/conditional:** Cookie Policy copy, only if cookies beyond strictly necessary ones are actually used. The engineering work (routes, noindex, footer links) is done; what remains is legal/business, not engineering.

## 10. Industries

Not building this page family in this phase (`PAGE_CONTENT_MATRIX.md` §5) — no gap to track until the business revisits the decision.

## 11. Cross-page technical/content flags carried from this phase

| Flag | Where | Type |
|---|---|---|
| `RESPONSIVE DESIGN DECISION REQUIRED` | Home hero video/poster behaviour on mobile | Responsive |
| `PERFORMANCE REVIEW REQUIRED` | Any hero video, case-study media galleries, large Business Proof/Results visual treatments | Performance |
| `KEYWORD RESEARCH VALIDATION REQUIRED` | Final service names/topics, if the business wants data-backed validation beyond the semantic recommendation in SEO_KEYWORD_INTENT_MAP.md | SEO |

## 12. Summary counts

| Severity | Count of distinct blocking items |
|---|---|
| Critical | 7 (service catalogue approval, ≥1 case study, ≥1 testimonial, About story/approach content model, verified Contact details, Privacy Policy, hero supporting copy+visual) — Careers hub page+wiring and the Contact page+enquiry mechanism are engineering items resolved in Stage 3, Phases 5–7 |
| Important | 9 |
| Optional | 7 |

No item above was resolved with placeholder or invented content. Every "Required"/"Approval Required" marker names exactly what is missing and why it cannot be supplied by this phase (it needs business, legal, or design input — not engineering).
