# SEO content alignment map — Stage 2, Phase 2

Verifies that URL, topic, H1, headings, body content, internal links, metadata and schema agree with each other for every page — a single coherent purpose per page, not independently optimized elements (phase brief §21). Keyword/topic source of truth remains [SEO_KEYWORD_INTENT_MAP.md](SEO_KEYWORD_INTENT_MAP.md) from Phase 1; nothing here introduces a new keyword target.

## 1. Alignment table

| Page | URL topic | H1 | Major H2s support topic? | Body can naturally cover it? | Internal links relevant? | Metadata source ready? | Schema appropriate? |
|---|---|---|---|---|---|---|---|
| Home | brand | hero.heading | Yes — each section is a facet of "who SMASH is / what it delivers" | Blocked on copy (PAGE_CONTENT_MATRIX.md §2) | Yes (to every hub) | Yes (resolver implemented) | Organization — implemented |
| Service detail | the named service | service name | Yes — Problem/Solution/Deliverables/Process/Tools/FAQ all describe one offering | Blocked on content (§3 of PAGE_CONTENT_MATRIX.md) | Yes, once a related case study/insight exists | Yes, once service name is final | Service + FAQPage (gated) + BreadcrumbList (gated) |
| Work hub | case studies overview | "Work" | N/A (listing page) | Blocked on real case studies | Yes | Yes (static-pages source) | none needed |
| Case study | the client/project | case study title | Yes — Challenge/Approach/Execution/Results all describe one project | Blocked on content | Yes, to related service(s) | Yes, once populated | BreadcrumbList (gated); no Review/Rating schema (no rating data exists — correctly absent) |
| Insights hub | articles overview | "Insights" | N/A | Ongoing (author-driven) | Yes | Yes | none needed |
| Insight article | the article's specific topic | article title | Author-determined per article | Author-driven | Yes, where a real relationship exists | Yes | Article — implemented |
| Careers hub | working at SMASH | "Careers at SMASH" | Yes | Blocked on culture copy | Yes, to postings | Yes (static-pages source) | none needed |
| Career posting | the role | role title | Yes | Per-posting | Yes, back to hub | Yes (implemented) | None — JobPosting deliberately deferred (see below) |
| Contact | contacting SMASH | "Contact SMASH" | N/A | Blocked on verified contact details | Yes | Yes | none needed |
| About | about SMASH | "About SMASH" | Yes | Blocked on content | Yes | Yes (static-pages source) | Organization (shared with Home, not duplicated) |
| Legal (3 pages) | data/terms/cookies | per-page title | N/A | Blocked on legal review | minimal (→ Contact) | **Built, Stage 4 Phase 7** — noindex until content is approved | none |

No row shows a page whose URL, H1, and body would describe three different things (the anti-pattern in phase brief §21's example) — because every page above is still bound to one real content model or one real business function, not an invented keyword combination.

## 2. Why JobPosting schema stays deferred

Google's `JobPosting` structured-data type requires `datePosted`, `validThrough`, `hiringOrganization`, and (for full rich-result eligibility) location and, in many cases, salary information. The `Career` model (`CONTENT_ARCHITECTURE.md`) currently has none of `datePosted`/`validThrough`/salary. Emitting the schema without them would either fail validation or require inventing data — both prohibited (phase brief §19, §23). **Decision: do not add JobPosting schema until the Career model gains these fields; this is a content-model gap, not an SEO gap** (tracked in `CONTENT_GAP_REPORT.md`).

## 3. Per-page SEO content checklist (phase brief §38)

Applied to every indexable page in `PAGE_CONTENT_MATRIX.md` §1:

```
[x] Route matches page topic                — yes, for every implemented route (routes were not renamed in Phase 2)
[x] Slug matches approved route strategy    — unchanged from Phase 1 (SLUG_STRATEGY.md)
[~] Primary topic is clear                  — clear for all routed pages; NOT YET APPLICABLE for /industries (not built — see PAGE_CONTENT_MATRIX.md §5)
[ ] H1 represents page topic                — cannot be finally verified until copy exists (H1 is defined, wording pending on Home/About/Services/Careers/Contact)
[ ] Sections support the page intent        — structurally yes; content-wise blocked (see gap report)
[~] Content can naturally cover supporting topics — true by design (no page invents a supporting topic it can't cover); cannot be demonstrated without real copy
[x] Internal links are relevant             — every link in INTERNAL_LINK_MAP.md corresponds to a real data relationship
[x] Metadata can be generated                — resolver implemented and tested (SEO_ARCHITECTURE.md); works with placeholder OR real content
[x] Canonical can be generated                — implemented, tested (SEO_INDEXING.md)
[x] Schema is appropriate                     — no schema type requested without matching real fields (§2 above)
[x] Page is not unnecessarily duplicated      — Industries deliberately not built to avoid duplicating Work hub content (§5, PAGE_CONTENT_MATRIX.md)
[x] No keyword stuffing                       — no page architecture repeats a phrase across URL/H1/body/metadata artificially
[x] No fabricated SEO data                    — none introduced; see §4 below
```

Legend: `[x]` satisfied, `[~]` partially/structurally satisfied pending real content, `[ ]` blocked on content not yet written.

## 4. Keyword issues found

No fabricated SEO data was introduced. Two structural issues carried over from Phase 1, restated here because they affect content, not just routing:

1. **Service names remain unconfirmed placeholders.** Building final on-page copy (H1, body, metadata) against `performance-marketing` etc. risks writing real content against a name the business may not confirm. Recommend: freeze copywriting until the service catalogue is confirmed (`SEO_KEYWORD_INTENT_MAP.md` §3).
2. **No Insight-to-Insight topic collision check exists** (unchanged from Phase 1, §5 of `SEO_KEYWORD_INTENT_MAP.md`). As real articles are drafted, each new title/topic should be checked against existing published articles manually before publish — no code enforces this.

No new keyword targets were created in this phase; every topic reference above points back to `SEO_KEYWORD_INTENT_MAP.md`.

## 5. Metadata and schema readiness

Both the metadata resolver and every schema generator (`SEO_ARCHITECTURE.md`, `SEO_INDEXING.md`) already accept content-model input and require no code change to work once real copy exists — this phase confirms that readiness rather than re-implementing it. The only schema gap identified is JobPosting (§2), which is a model gap, not a resolver gap.
