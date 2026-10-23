# Backend Architecture

## Layering

```
Route handler (src/app/api/**/route.ts)
      ↓
publicGet/publicPost wrapper (src/server/api/handler.ts) — rate limiting, caching headers, error envelope
      ↓
Controller (src/server/api/public-content.controller.ts) — parses/validates request params, calls one service function
      ↓
Service (src/server/modules/<domain>/<domain>.service.ts) — business rules, publish-state filtering, relationship resolution
      ↓
Data access (src/server/db/helpers.ts) — thin query/aggregation helpers shared by every module
      ↓
MongoDB
```

Route files are one-line wrappers (`export const GET = publicGet(controller)`); they contain no query logic, validation, or response shaping. All of that lives in the controller/service layers so it's testable without an HTTP request and reusable between the public API and the preview routes.

## Content modules

Each content type (`services`, `work` (case studies), `insights`, `careers`, `clients`, `testimonials`, `team`, `site-settings`, `home`) is a self-contained module under `src/server/modules/<name>/`:

- `<name>.schema.ts` — Zod input/update schemas (the server-side validation layer; the frontend's own validation is not trusted).
- `<name>.service.ts` — create/update (admin-only) and the public `listPublished*`/`getPublished*BySlug` reads.

The MongoDB collection shapes, defaults, nullable columns, indexes and `$jsonSchema` validators are centralized in `src/server/db/schema.ts` — the single source of truth for what a "row" looks like, so adding a field never requires touching more than one schema module plus that file.

## Relationships

Many-to-many relationships (e.g. a service's related case studies, a Home page's referenced testimonials) live in their own small link collections (`service_case_studies`, `insight_services`, `home_testimonials`, …) rather than being embedded as copied content. Every write that references another collection by id is checked with `assertExist` before the write commits, so a dangling reference can never be created. There is currently no delete capability anywhere in the CMS, so link-table cleanup-on-delete doesn't apply yet — add it if/when deletion is introduced.

## Public vs. admin surface

- `/api/**` (except `/api/admin/**` and `/api/leads`) is public, read-only except `/api/contact`, and always filters to `status: "published"` at the query layer — never by trusting a request parameter.
- `/api/admin/**` is bearer-token protected and is the only place drafts/mutations are reachable.
- `/preview/**` pages can render a single draft record for review, gated by a signed token (`src/server/api/preview.ts`), never exposed through the public JSON API.

## Why this shape

The frontend is being redesigned independently of this backend. Routes return semantic content (`title`, `slug`, `description`, `media: {url, alt, width, height}`, …) with no layout, color, spacing, or component-name assumptions baked in — see `API.md` for the exact response shapes. A new UI should be able to consume the existing endpoints unchanged; only add or reshape an endpoint when the *data* requirement changes, not when the *presentation* does.
