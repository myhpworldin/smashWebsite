# Component guide — Stage 3, Phase 1

Every component that exists, what it does, what data it expects, and where it lives. Read this before adding a new component — if something here already does the job, extend it; don't create a second one with the same responsibility (phase brief §29).

## Folder structure

```
src/components/
  JsonLd.tsx           existing — the one sanctioned dangerouslySetInnerHTML, escapes JSON-LD (Stage 1)
  ui/                  presentational primitives, no content-type knowledge
    Button, Container, Section, Stack, Media, EmptyState, Skeleton
  content/             components that know a specific backend content shape
    ServiceCard, CaseStudyCard, InsightCard, TestimonialCard, MetricCard, CtaButton, FormField
  layout/              global chrome, one instance per page
    Header, Footer, MobileNavToggle
  sections/            reusable page-section shells used by the detail pages (services, work, insights)
    Hero, FaqSection, MediaGallery, ...
  home/                the Figma homepage, one component per section; each takes its section of the `GET /api/home` payload
```

Each `.tsx` pairs 1:1 with a `.module.css` of the same name where it needs styling (`ui/Button.tsx` ↔ `ui/Button.module.css`).

## `ui/` — presentational primitives

| Component | Props | Notes |
|---|---|---|
| `Button` | `href`+`external?` (link) **or** standard button props (action) + `variant: primary\|secondary\|ghost\|link`, `loading?` | The only button implementation site-wide. `href` always renders a real `<a>`/`Link`; omitting it renders a real `<button>`. Never use a raw `<button>` or `<a>` for a CTA — go through this. |
| `Container` | `as?`, `children`, `className?` | Width cap + inline padding. Every section's content should sit inside one. |
| `Section` | `spacing?: default\|tight`, `ariaLabelledBy?` | Vertical rhythm only — no internal layout opinion. |
| `Stack` | `direction`, `gap` (spacing-scale token, 1–9), `align`, `justify`, `wrap` | Flex layout primitive; `gap` always references `--space-N`, never a literal. |
| `Media` | `media: PublicMedia \| null` | The only place a backend `Media` object becomes an `<Image>`. Never write `<img src={...}>` in a page/content component. Returns `null` if `media` is `null` — safe to call unconditionally. |
| `EmptyState` | `message?` | Default copy is neutral ("Nothing to show here yet.") — pass real approved wording once content/design defines it; never invent marketing copy here. |
| `Skeleton` | `width?`, `height?` | Generic loading placeholder; respects `prefers-reduced-motion`. |

## `content/` — components that know a backend shape

Every one of these takes its data as a prop typed against the actual frozen response type (`src/server/api/serializers.ts`, re-exported for convenience from `src/types/content.ts`) — never a hardcoded string, never partial/loose typing.

| Component | Data prop | Backend source |
|---|---|---|
| `ServiceCard` | `service: ServiceSummary` | `GET /api/services`, Home "services" |
| `CaseStudyCard` | `caseStudy: CaseStudySummary` | `GET /api/work`, Home "selectedWork" |
| `InsightCard` | `insight: InsightSummary` | `GET /api/insights`, Home "insights" |
| `TestimonialCard` | `testimonial: Testimonial` | `GET /api/testimonials`, Home "testimonials" |
| `MetricCard` | `metric: {label, value, description?, link?}` | Home "businessProof"/"results" items |
| `CtaButton` | `cta: {label, target, external} \| null`, `variant?` | Any `Cta`-shaped field anywhere (hero, sections, cards) |
| `FormField` | `label`, `error?`, `textarea?`, plus native input/textarea props | Future Contact form only — no write endpoint exists yet (`CMS_CONTENT_MAP.md` §3) |

A card renders whatever it's given; it never fetches, never knows about pagination, and never decides what counts as "featured" — that's the page's job.

## `layout/` — global chrome

| Component | Notes |
|---|---|
| `Header` | Server component. Reads `getPrimaryNav()` (`src/lib/nav.ts`); only renders links whose page file exists (`available: true`). |
| `MobileNavToggle` | The one client component in the header (`"use client"`); plain `useState` disclosure, no animation library. |
| `Footer` | Server component (`async`). Reads real `SiteSettings` via `getSiteSettings()`. **Never throws** — any failure (missing settings, DB outage) logs a warning and renders without that column, because the footer appears on every page including error/404 pages and must never be the reason a page fails (see `FRONTEND_ARCHITECTURE.md` §14). |

## `sections/` — reusable section shells

| Component | Notes |
|---|---|
| `Hero` | Takes a `HeroSection` (the exact shape Home and Service pages both already produce via `heroDto`). Renders eyebrow/heading/supportingText/image/CTAs. This is architecture, not the finished Home page — assembling it into an actual styled Home hero is Stage 3, Phase 2. |

## Design system → code naming

| Figma (when it exists) | Code |
|---|---|
| Button | `Button` |
| Service Card | `ServiceCard` |
| Case Study Card | `CaseStudyCard` |
| Insight Card | `InsightCard` |
| Testimonial | `TestimonialCard` |
| Metric | `MetricCard` |
| Hero | `Hero` |
| CTA block | Navigation | `Header` (+ `MobileNavToggle`) |
| Footer | `Footer` |
| Form field | `FormField` |

Names are chosen now, before any Figma file exists, specifically so that when the designer's file arrives, the correspondence is immediate (phase brief §6) — no renaming pass should be needed.

## Rules for adding a new component

1. Check this table first. If an existing component's responsibility overlaps, extend it (add a prop) instead of creating a new one.
2. Style only with tokens from `src/app/globals.css` — no literal color/spacing/font-size in a `.module.css`.
3. Type content props against the real backend type (`src/types/content.ts` or `src/server/api/serializers.ts`) — never `any`, never a hand-rolled shape that might drift from the API.
4. A component that renders navigation must use a real `<a>`/`Link`, never a `<button>` styled to look like one (phase brief §18).
5. If it needs interactivity, isolate `"use client"` to the smallest component possible — the current 100% server-rendered tree (except `MobileNavToggle` and `FormField`) is deliberate.
6. Every image goes through `Media`. Every button/link goes through `Button` or `CtaButton`.
