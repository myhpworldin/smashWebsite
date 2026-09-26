# CMS / content-to-frontend data map — Stage 2, Phase 2

Which content model backs each page/section, whether it's dynamic, and the minimum data shape the frontend can rely on. This reflects the actual Stage 1 backend (`CONTENT_ARCHITECTURE.md`, `API.md`) — no new CMS field is proposed unless a real content gap requires it, and every proposal says why.

## 1. CMS mapping table

| Page/Section | Content Type | CMS Source | Dynamic? | Required |
|---|---|---|---:|---:|
| Home Hero | Hero content | `HomePage.hero` | No (singleton, editable) | Yes |
| Home Business Proof | Verified metrics | `HomePage.businessProof` | No | Yes |
| Home Story | Narrative | `HomePage.story` | No | Yes |
| Home Services | Service references | `HomePage.servicesSection` + `home_services` → `Service` | Yes | Yes |
| Home Growth Engine | Ordered steps | `HomePage.growthEngine` | No | Yes |
| Home Selected Work | Case study references | `HomePage.selectedWorkSection` + `home_case_studies` → `CaseStudy` | Yes | Yes |
| Home Results | Verified metrics | `HomePage.results` | No | Yes |
| Home Why SMASH | Reasons | `HomePage.whySmash` | No | Yes |
| Home Testimonials | Testimonial references | `HomePage.testimonialsSection` + `home_testimonials` → `Testimonial` | Yes | Yes |
| Home Technology | Platform list | `HomePage.technology` | No | Yes |
| Home Insights | Insight references | `HomePage.insightsSection` + `home_insights` → `Insight` | Yes | Yes |
| Home CTA | CTA content | `HomePage.cta` | No | Yes |
| Services hub listing | Service summaries | `Service` (list) | Yes | Yes |
| Service detail (all sections) | Service | `Service` | Yes | Yes |
| Work hub listing | Case study summaries | `CaseStudy` (list) | Yes | Yes |
| Case study detail | CaseStudy | `CaseStudy` | Yes | Yes |
| Insights hub listing | Insight summaries | `Insight` (list) | Yes | Yes |
| Insight detail | Insight | `Insight` | Yes | Yes |
| Careers hub listing | Career summaries | `Career` (list) — `GET /api/careers` (added Stage 2, Phase 4) | Yes | Yes |
| Career detail | Career | `Career` | Yes | Yes |
| About Team | Team profiles | `TeamMember` (list) | Yes | Yes |
| About Story/Approach/Culture | Narrative | **No model — proposed in §3** | No | Yes |
| Contact details | Contact info | `SiteSettings.contact` | No | Yes |
| Contact enquiry form | Enquiry submission | **No model — proposed in §3, CRM-ready but not CRM** | Yes (per submission) | Only if a public form is approved |
| Testimonials (site-wide) | Testimonial | `Testimonial` | Yes | Yes |
| Clients (site-wide) | Client | `Client` | Yes | Yes |
| Legal pages | Static legal text | **No model — proposed in §3** | No | Yes, once approved |
| Site-wide defaults (logo, socials, default SEO) | Site config | `SiteSettings` | No | Yes |

No field above stores CSS classes, spacing, pixel positions, or layout coordinates (confirmed against `src/server/db/schema.ts` — the phase brief's §27 prohibition already holds in the existing schema, and nothing in this phase adds a presentation field).

## 2. Frontend data contracts (dynamic sections)

These are the actual response shapes already implemented (`API.md`, `HOME_PAGE_CONTRACT.md`); reproduced here so the frontend does not need to cross-reference three documents for the same object.

```json
// ServiceCard (Home Services section, Services hub)
{
  "name": "string",
  "slug": "string",
  "path": "/services/string",
  "shortDescription": "string",
  "image": { "url": "string", "alt": "string", "width": 0, "height": 0 }
}
```

```json
// WorkCard (Home Selected Work, Work hub)
{
  "title": "string",
  "slug": "string",
  "path": "/work/string",
  "summary": "string",
  "industry": "string",
  "image": { "url": "string", "alt": "string" },
  "client": { "name": "string", "logo": { "url": "string", "alt": "string" } },
  "keyResult": { "label": "string", "value": "string", "description": "string" },
  "publishedAt": "ISO date"
}
```

```json
// InsightCard (Home Insights, Insights hub)
{
  "title": "string",
  "slug": "string",
  "path": "/insights/string",
  "excerpt": "string",
  "image": { "url": "string", "alt": "string" },
  "category": "string",
  "tags": ["string"],
  "author": { "name": "string", "role": "string" },
  "publishedAt": "ISO date",
  "updatedAt": "ISO date"
}
```

```json
// Testimonial
{
  "quote": "string",
  "personName": "string",
  "personRole": "string",
  "companyName": "string",
  "photo": { "url": "string", "alt": "string" }
}
```

```json
// Cta (every CTA on every page)
{
  "label": "string",
  "target": "/contact | /services/slug | https://…",
  "external": false
}
```

Every card/value type above is `| null` at the section level if the section has nothing to show (`HOME_PAGE_CONTRACT.md` rule 1) — the frontend must render nothing for a `null` section, never a placeholder.

## 3. Proposed CMS additions (content gaps, not speculative fields)

Each proposal below exists because a page in `PAGE_CONTENT_MATRIX.md` needs it, not because a designer might use it (phase brief §26 prohibits the latter):

| Proposed model/field | Needed for | Why not already covered |
|---|---|---|
| `AboutPage` (singleton, similar shape to `HomePage`: story, approach, capabilities, culture fields) | About page (§9, PAGE_CONTENT_MATRIX.md) | No existing model holds narrative copy outside HomePage; About needs the same kind of "draft/published, embedded jsonb copy" pattern already proven for Home |
| ~~`Enquiry` (name, email, phone?, message, serviceOfInterest?, createdAt)~~ | Contact form (§8, PAGE_CONTENT_MATRIX.md) | **Done — implemented in Stage 3, Phase 7 exactly as proposed here** (`enquiries` table, `POST /api/contact`). Intentionally minimal: no CRM logic, no assignment/notification. **Read-back added Stage 6, Phase 3** (`GET /api/admin/enquiries`, administrator-only) — the bare minimum for the log to be operationally usable, still no status/assignment/pipeline. |
| `LegalPage` (title, slug, body richtext/markdown, seo) OR static markdown files | Privacy Policy, Terms of Use, Cookie Policy | No model exists; a single reusable type avoids three one-off page types |
| `Career.datePosted`, `Career.validThrough` (and optionally salary range) | JobPosting schema (SEO_CONTENT_MAP.md §2) | Required by Google's JobPosting schema; without them the schema cannot be emitted honestly. Still not implemented (Stage 3, Phase 7's career page correctly emits only BreadcrumbList). |
| ~~Careers list endpoint~~ | Careers hub (§7, PAGE_CONTENT_MATRIX.md) | **Done — `GET /api/careers` added in Stage 2, Phase 4; the hub page itself built in Stage 3, Phase 7.** |

`AboutPage` remains unimplemented (still a genuine content-model decision, deferred — see `PAGE_SPECIFICATIONS.md` §15); `Enquiry` and the Careers hub page, listed as not-yet-implemented when this file was first written, are now both done.
