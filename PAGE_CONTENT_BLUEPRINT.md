# Page content blueprint — Stage 2, Phase 1

Content structure for every page, detailed enough that a designer does not need to invent sections and a developer does not need to invent data shapes. This file defines *what belongs where*; it does not specify layout, colour, or component design (see [DESIGNER_HANDOFF.md](DESIGNER_HANDOFF.md) for the handoff format and [DEVELOPER_CONTENT_CONTRACT.md](DEVELOPER_CONTENT_CONTRACT.md) for the API/model wiring).

Heading rules that apply to every page below (per phase brief §15):
- Exactly one `<h1>` per page.
- Headings reflect actual content; none are inserted for keyword placement.
- Hierarchy is not skipped for visual reasons (an `<h3>` never appears without a preceding `<h2>` in that section).

## 1. Home

Full section-by-section data contract already exists and is authoritative: [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md). Summary of the heading structure it implies:

```
H1 — hero.heading                          (the only H1 on the page)
H2 — businessProof.heading
H2 — story.heading
H2 — servicesSection.heading
H2 — growthEngine.heading
H2 — selectedWorkSection.heading
H2 — results.heading
H2 — whySmash.heading
H2 — testimonialsSection.heading
H2 — technology.heading
H2 — insightsSection.heading
H2 — cta.heading
```

Each section is `null` when the editor has not populated it — the H2 simply does not render (rule 1 in HOME_PAGE_CONTRACT.md). No section is forced to carry its own keyword; Home represents the brand/business topic as a whole, per phase brief §13.

## 2. Service detail page (`/services/[slug]`)

Structure required by the developer brief §12, mapped to the actual `Service` model fields (`CONTENT_ARCHITECTURE.md`) and the actual API response (`API.md` → `GET /api/services/:slug`):

```
H1 — service.name

H2 — The Business Problem        ← service.problem
H2 — How SMASH Solves It         ← service.solution
H2 — What We Deliver             ← service.deliverables[]
H2 — Our Process                 ← service.process[]
H2 — Tools & Platforms           ← service.tools[]
H2 — Results / Case Study        ← relatedCaseStudies[] (from the API response)
H2 — Frequently Asked Questions  ← service.faqs[]        (also feeds FAQPage schema, once rendered)
H2 — Let's Talk Growth           ← service.cta
```

| Field | Purpose | CTA | Related route |
|---|---|---|---|
| Hero | `service.hero` (media/heading area) | primary CTA in hero | `/contact` (typical) |
| Problem | `service.problem` — the pain point this service addresses | none | — |
| Solution | `service.solution` — SMASH's approach | none | — |
| Deliverables | `service.deliverables[]` | none | — |
| Process | `service.process[]` | none | — |
| Tools | `service.tools[]` | none | — |
| Case Study | `relatedCaseStudies[]` (title, slug, path, summary, image) | "Read the case study" | `/work/[slug]` |
| FAQ | `service.faqs[]` | none | — |
| CTA | `service.cta` | primary | `/contact` or defined route |

Internal links required: at minimum one `relatedCaseStudies` link and, where relevant content exists, `relatedInsights` (both already returned by the API). Do not add a link with no real relationship (phase brief §16).

This structure applies to **every** service once its name is confirmed (§3 of `SEO_KEYWORD_INTENT_MAP.md`) — it is not written per-example-slug because the four current names are placeholders.

## 3. Case study page (`/work/[slug]`)

Fields per `API.md` → `GET /api/work/:slug`:

```
H1 — caseStudy.title

H2 — The Challenge     ← challenge
H2 — Our Strategy      ← strategy
H2 — Execution         ← execution
H2 — Results           ← results[] (each carries a verified `source` before publish — see CONTENT_ARCHITECTURE.md)
H2 — Client            ← client (only if published)
H2 — What They Said    ← testimonial (only if published)
H2 — Related Services  ← relatedServices[]
```

Related content: `relatedServices[]` (→ `/services/[slug]`) and `relatedInsights[]` (→ `/insights/[slug]`), both already in the API response. A published case study never shows a draft client or testimonial (enforced in the query layer).

## 4. Insight article (`/insights/[slug]`)

```
H1 — insight.title

(article body, insight.content — Markdown, author-authored heading structure within)
H2 — Related Services   ← relatedServices[]  (shown if any)
H2 — Related Work       ← relatedCaseStudies[] (shown if any)
```

The article body's internal H2/H3 structure is authored per article (Markdown) and is not prescribed here — it is content, not architecture. Category and tags (`insight.category`, `insight.tags[]`) support the hub's filtering, not the article's own headings.

## 5. Hub pages (`/services`, `/work`, `/insights`) — page files not yet built

These have SEO source (`static-pages.ts`) but no page file. Blueprint for when they are built:

```
H1 — "Services" / "Work" / "Insights"   (per STATIC_PAGES title in src/server/seo/static-pages.ts)
(intro copy — optional, one paragraph, informational or commercial framing per the hub's intent)
(card grid: ServiceCard / WorkCard / InsightCard, from GET /api/services, /api/work, /api/insights)
```

No H2 is required if the hub is a single card grid with no categorisation; if the Insights hub adds a category filter, each category becomes a labelled group, not a full page reload (implementation detail for the frontend track, not an SEO requirement).

## 6. About, Careers hub, Contact — no content model yet

These are `static-pages.ts` entries with a title and search intent only; no body copy, hero, or structured sections have been approved. Proposed minimum structure (content owner must approve actual copy — this is not invented here):

**About** (`/about`)
```
H1 — About SMASH
H2 — Our Story
H2 — Our Team          (TeamMember records already exist in the content model — CONTENT_ARCHITECTURE.md)
H2 — Careers CTA        → links to /careers
```

**Careers hub** (`/careers`) — currently missing a page file (see SEO_SITE_ARCHITECTURE.md §1)
```
H1 — Careers at SMASH
(intro copy)
(list of published Career postings, card per role: title, location, employmentType → /careers/[slug])
```

**Contact** (`/contact`)
```
H1 — Contact SMASH
(contact form or contact details — from SiteSettings.contact, already in the content model)
```

## 7. Legal pages — proposed, not yet approved

**Privacy Policy** (`/privacy-policy`) and **Terms of Service** (`/terms-of-service`): single-H1, single-column legal text pages. No content model exists for these; they need either a new simple content type (title + rich-text body) or to be treated as static markdown owned by legal/compliance, not marketing. This is a pending decision (`SEO_SITE_ARCHITECTURE.md` §6) — no structure is prescribed beyond H1 + body, since inventing legal section headings would misrepresent actual legal content.

## 8. Metadata blueprint (applies to every indexable page above)

| Field | Source |
|---|---|
| Meta Title | `seo.metaTitle` → content title → `defaultSeo.metaTitle` → site name (already implemented — `SEO_ARCHITECTURE.md`) |
| Meta Description | `seo.metaDescription` → content summary trimmed to 160 chars → site default |
| Canonical | `canonicalUrl(path, NEXT_PUBLIC_SITE_URL)` — always self-canonical unless an explicit same-origin override is set |
| OG Title/Description | `seo.ogTitle`/`ogDescription` → resolved title/description |
| OG Image | `seo.ogImage` → content hero image → `defaultOgImage` |

No new metadata mechanism is proposed — this reuses the resolver documented in `SEO_ARCHITECTURE.md`. Uniqueness across pages is enforced editorially via `npm run seo:audit`'s duplicate-title/description/canonical check, not by new code in this phase.
