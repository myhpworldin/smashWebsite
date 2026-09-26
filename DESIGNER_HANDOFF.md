# Designer handoff — Stage 2, Phase 1

Everything needed to design each page without inventing content structure. Full section-level detail for Home is in [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md) (this file summarizes it); full heading structure for every page is in [PAGE_CONTENT_BLUEPRINT.md](PAGE_CONTENT_BLUEPRINT.md). No visual design, layout, or styling direction is given here — that's the designer's job; this is the content contract the design must satisfy.

**Stage 2, Phase 4 note:** [PAGE_SPECIFICATIONS.md](PAGE_SPECIFICATIONS.md) is now the consolidated, frozen per-page record (SEO fields, headings, metadata, schema, CTA, readiness status) built from this file plus every other Stage 2 document. Use this file for the section-by-section design brief; use `PAGE_SPECIFICATIONS.md` as the single source of truth for a page's current status before starting design work on it.

## How to read this

For each page: purpose, URL, H1, required sections (in no particular visual order — the backend does not dictate layout, per `HOME_PAGE_CONTRACT.md` rule 10 in "Progressive delivery"), CTA, supporting/related content, media requirements, SEO requirements, and internal links. A section can be omitted from the visual design only if its data is legitimately empty (`null`) — never omitted because it seems redundant; that's a content decision, not a design one.

---

### Home (`/`)
- **Purpose:** Brand entry point, routes visitors to services/work/insights.
- **H1:** `hero.heading`.
- **Required sections:** Hero, Business Proof, SMASH Story, Services, Growth Engine, Selected Work, Results, Why SMASH, Testimonials, Technology, Insights, CTA — each renders only if non-null (12 sections total, see HOME_PAGE_CONTRACT.md).
- **CTA:** hero primary/secondary + closing CTA section.
- **Media:** hero image is the only "eager"-loaded image; everything else lazy.
- **SEO:** one H1 only (hero.heading); every other section heading is H2.
- **Internal links:** to every published Service, Case Study, Insight referenced by the editor; to hub pages via `links.*` (only render if `available: true`).

### About (`/about`)
- **Purpose:** Brand story, team, credibility.
- **H1:** "About SMASH" (placeholder — final copy pending).
- **Required sections:** Story, Team (from `TeamMember` records, already modelled), Careers CTA.
- **CTA:** link to Careers.
- **Supporting content:** team member photo, name, role, short bio.
- **SEO:** navigational intent — do not force a commercial keyword onto this page.
- **Internal links:** → `/careers`.
- **Status:** no page file yet; content model exists for the Team section, no approved body copy exists for the story section.

### Services hub (`/services`)
- **Purpose:** List all services, route to detail pages.
- **H1:** "Services".
- **Required sections:** intro copy (optional), card grid (`GET /api/services`).
- **CTA:** each card → its service detail page.
- **Media:** each service card image.
- **SEO:** commercial-investigation intent.
- **Status:** no page file yet.

### Service detail (`/services/[slug]`)
- **Purpose:** Sell one specific service; primary conversion page.
- **H1:** service name.
- **Required sections:** Hero, Problem, Solution, Deliverables, Process, Tools/Platforms, Case Study, FAQ, CTA — see full field mapping in `PAGE_CONTENT_BLUEPRINT.md` §2.
- **CTA:** primary (contact/quote), plus a "read the case study" link where a related case study exists.
- **Media:** hero image/video, tool logos.
- **SEO requirements:** unique title/description per service; FAQPage schema is emitted only once the FAQ section is actually rendered (currently gated off — do not build a page that silently disables schema the backend is ready to emit).
- **Internal links:** related case study, related insight (only when the API returns one).
- **Status:** implemented in code; needs real (non-placeholder) service names and content before it should go live.

### Work hub (`/work`) and Case study (`/work/[slug]`)
- **Purpose:** Proof of results; supports commercial intent elsewhere.
- **H1:** "Work" (hub) / case study title (detail).
- **Required sections (detail):** Challenge, Strategy, Execution, Results (each result has a verified source, internal-only), Client, Testimonial, Related Services.
- **Media:** hero image, media gallery (`caseStudy.media[]`).
- **SEO:** results must be genuine and sourced — never present a number without its backing verification (already enforced server-side before publish).
- **Internal links:** → related service(s), optionally → related insight(s).
- **Status:** detail implemented; hub has no page file yet.

### Insights hub (`/insights`) and Article (`/insights/[slug]`)
- **Purpose:** Informational content, topical authority.
- **H1:** "Insights" (hub) / article title (detail).
- **Required sections (hub):** intro (optional), card grid, optional category filter (`Insight.category`).
- **Required sections (detail):** article body (Markdown-rendered), related services, related case studies.
- **Media:** featured image, author photo.
- **SEO:** each article's title/description must be unique; article schema (headline, dates, author) already emits automatically once headline + publish date exist.
- **Status:** detail implemented; hub has no page file yet.

### Careers hub (`/careers`) and Career posting (`/careers/[slug]`)
- **Purpose:** Recruiting.
- **H1:** "Careers at SMASH" (hub) / role title (detail).
- **Required sections (hub):** intro, list of open roles (title, location, employment type) → detail page.
- **Required sections (detail):** role summary, description, requirements[], responsibilities[], location, employment type, apply CTA.
- **Status:** **hub has no page file at all — this is the one missing link in the whole site graph** (see `SEO_SITE_ARCHITECTURE.md` §1). Detail page exists but is currently unreachable by navigation until the hub is built.

### Contact (`/contact`)
- **Purpose:** Conversion — get in touch.
- **H1:** "Contact SMASH".
- **Required sections:** contact details (from `SiteSettings.contact`, already modelled), and/or a contact form (no write API exists yet — see `DEVELOPER_CONTENT_CONTRACT.md`).
- **Status:** no page file yet; no form-submission backend exists (CRM/lead capture is explicitly out of scope for this stage).

### Legal pages (`/privacy-policy`, `/terms`, `/cookie-policy`) — built, Stage 4 Phase 7
- **Purpose:** Compliance.
- **H1:** "Privacy Policy" / "Terms of Use" / "Cookie Policy".
- **Required sections:** single-column legal body text — no marketing sections, no CTA beyond a link back to Contact.
- **Status:** routes are final and the pages render today, but with a plain "awaiting approved content" notice in place of body copy — no legal text exists to lay out yet. The designer can style this shell now (it won't change shape once real copy lands, just the body text), but a full legal-body layout still needs the actual approved copy first.

---

## Design constraints that apply everywhere

- One H1 per page, always the content's actual title/heading — never a design-only heading.
- Never hide a section that has real data solely because a layout looks better without it; if a section should sometimes be optional by design, the content model must return `null` for it, which every page above already supports.
- No CTA to a page that isn't `available` yet (check `links.*.available` where it exists; for pages without that flag — the Careers hub — do not link to them from Home/About until they exist). Legal pages now exist and are linked from the Footer.
