# Frontend integration guide — Stage 2, Phase 3

How to build pages against the frozen contracts in [CONTENT_CONTRACTS.md](CONTENT_CONTRACTS.md) and [API.md](API.md) without reading the database layer. This app is a single Next.js codebase, so "frontend" means both server components (`src/app/**/page.tsx`, which call the service functions in-process) and any future client-side fetch against `/api/**` — both consume the exact same shapes.

## 1. Two ways to get data, one contract

```
Server component (current pattern, e.g. src/app/services/[slug]/page.tsx)
  → calls a request-cached service function directly (src/server/seo/request-cache.ts)
  → gets back the exact type the API would also return (same DTO function)

Client-side / external fetch
  → GET /api/services/:slug
  → { success: true, data: ServiceDetail }  — parse and trust the `ServiceDetail` type
```

Both paths run the same publishing rules and produce the same shape — a page never needs two different mental models depending on how it fetched the data.

## 2. Importing the types

```ts
import type { ServiceDetail, ServiceSummary, CaseStudyDetail, Testimonial, Client, SiteSettingsPublic } from "@/server/api/serializers";
import type { HomeResponse } from "@/server/api/home.dto";
import type { ApiSuccess, ApiFailure, PaginationMeta } from "@/server/lib/response";
```

A component that renders a service card should take `ServiceSummary`, not `ServiceDetail` — this is enforced by which endpoint/service-function actually returns which type; there is no single "Service" god-type to misuse.

## 3. Request → loading → empty → error, per page

| Concern | Home | Service/Case Study/Insight/Career detail | Hubs (list) | Testimonials/Clients |
|---|---|---|---|---|
| Loading | Server-rendered (`force-dynamic`); no client loading state needed today | Same | Same | Same |
| Empty | A section is `null` — render nothing for that section (see `HOME_PAGE_CONTRACT.md` rule 1) | N/A (single record) | `data: []`, `meta.total: 0` — render an empty-state message, not an error | `data: []` — same |
| Not found | Home 404s only if unpublished entirely | 404, `RESOURCE_NOT_FOUND` — render Next's not-found UI | N/A | N/A |
| Draft | Never reaches the frontend (query-layer filter) | Same — 404, indistinguishable from unknown | Same — never listed | Same |
| Error (5xx) | Production: hard 5xx (crawlers should retry, never show a blank indexable page); non-production: page shell renders, error logged | Standard error envelope, `error.code` present | Same | Same |

**Rule: never render a "no content" UI as if it were an error, and never render an error as if it were empty content.** The envelope already distinguishes them (`success: false` vs. `success: true, data: []`) — a frontend that conflates the two is misreading a contract that already exists.

## 4. Building each page from documented contracts

### Home (`/`)
```tsx
const home: HomeResponse = await getPublishedHome(...) /* mapped through homeDto, or via GET /api/home */;
// home.hero, home.businessProof, ... — render only sections that are non-null.
// home.links.services.available === false ⇒ do not render a link to /services yet.
```
Full section shapes: `HOME_PAGE_CONTRACT.md`.

### Service detail (`/services/[slug]`)
```tsx
export async function generateMetadata({ params }) { return serviceMetadata((await params).slug); } // already implemented
const service: ServiceDetail = await getService(slug); // 404s via requirePublishedRoute if unpublished/unknown
```
`service.relatedCaseStudies`/`relatedInsights` are already compact summaries (`{title, slug, path, ...}`), never full nested records — no risk of building an infinitely-nested payload (phase brief §21).

### Case study / Insight detail
Same pattern; see `service.relatedServices` shape mirrored as `caseStudy.relatedServices` / `insight.relatedServices` — all compact summaries.

### Hubs (Services/Work/Insights — page files not yet built)
```tsx
const { data, meta }: { data: ServiceSummary[]; meta: PaginationMeta } = await fetch("/api/services?page=1&limit=12");
```
Always read `meta.totalPages` to render pagination controls; never assume a fixed page size beyond what `meta.limit` reports.

### Testimonials / Clients (site-wide, uncounted)
```tsx
const { data, meta }: { data: Testimonial[]; meta: { total: number } } = await fetch("/api/testimonials");
```
No `page`/`limit` — these are capped at 100 server-side (`API.md`), so a full list is always returned.

## 5. What the frontend must NOT do

- Must not construct a URL from an id — every card/summary already carries `path`; use it directly (`API.md` "Public paths, not ids").
- Must not assume a section exists — check for `null` first (Home) or a 404 (detail pages).
- Must not retry a request to work around a validation error (422) — it means the request itself is malformed (e.g. a repeated query parameter); fix the request.
- Must not read `error.message` to branch logic — branch on `error.code` (a stable, documented enum); `message` is for display only and its wording is not part of the contract.
- Must not cache API responses more aggressively than the `Cache-Control` header the server already sends (`public, s-maxage=60, max-age=60`) without a documented reason.

## 6. Designer collaboration (phase brief §33)

Every Home section, and every service/case-study/insight sub-section, is independent content the designer can lay out in any visual arrangement — 3 cards or 4, horizontal or vertical, grid or carousel — without a backend change, because the API returns arrays and objects, never a fixed visual count or order beyond the array's own order. The one thing that *would* require a backend change is adding a genuinely new piece of content (a new field), which is explicitly a content-model decision (`CMS_CONTENT_MAP.md` §3 lists the ones already identified), not a styling one.

## 7. Verifying you're building against the frozen contract

Before writing a component, ask (per phase brief §36):
1. Can I get this page's data from a documented type in `CONTENT_CONTRACTS.md` §3, with no direct database import? — if not, the contract has a gap; check `DEVELOPER_CONTENT_CONTRACT.md` for whether it's a known one (e.g. Careers hub listing).
2. Am I building any URL from something other than a `path`/`slug` field already in the response? — if yes, stop; that field doesn't belong in a component.
3. Does this component render its own `<title>`/meta tags, or does it rely on `generateMetadata`? — it must rely on the latter; never hardcode SEO fields already present in `seo`.
