# smash.international: public website

Next.js 16 (App Router) + TypeScript, MongoDB (official driver), zod validation. This repository is the full public website: content models, public APIs, SEO infrastructure, the frontend (Home, About, Services, Work, Insights, Careers, Contact), a minimal admin content-management API (Stage 4, Phase 2 — see [CMS_GUIDE.md](CMS_GUIDE.md)), and an analytics/event-tracking architecture (Stage 4, Phase 5 — see [ANALYTICS_EVENTS.md](ANALYTICS_EVENTS.md); no real GA4/GTM/Meta/Ads account is configured yet, so nothing loads in production today). No approved visual design exists yet, so every visual value is a placeholder token (`src/app/globals.css`) — see [DESIGN_SYSTEM_MAPPING.md](DESIGN_SYSTEM_MAPPING.md). CRM is out of scope and absent.

Stage 1 status and evidence: [STAGE1_VERIFICATION.md](STAGE1_VERIFICATION.md).

## Prerequisites

Node.js 24+ (developed on 26) and npm. MongoDB 6+ for a real database (a local `mongod` or MongoDB Atlas). For local work, `npm run db:dev` starts a throwaway `mongod` (needs the MongoDB server binary on PATH, e.g. `brew install mongodb-community`, or set `MONGOD_BINARY`).

## Quick start

```bash
npm install
cp .env.example .env.local        # then set MONGODB_URI (below)
npm run db:dev -- --seed          # terminal 1: throwaway MongoDB on :27018 with sample content (lost on exit)
# .env.local:  MONGODB_URI=mongodb://127.0.0.1:27018/smash
npm run dev                       # terminal 2: http://localhost:3000
```

Try `http://localhost:3000/api/home`, `/api/services`, `/sitemap.xml`. Sample data is all marked `[SAMPLE]`.

With your own MongoDB: set `MONGODB_URI` (and optionally `MONGODB_DB`), then `npm run db:migrate` (creates the collections, validators and indexes; safe to re-run) and, for development only, `npm run db:seed`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js development server, production build, production server |
| `npm run typecheck` / `lint` | TypeScript (strict) and ESLint |
| `npm test` | 290 tests against a throwaway `mongod` started by the test run (needs the `mongod` binary on PATH); no `.env` needed |
| `npm run db:migrate` | Create/refresh collections, validators and indexes in `MONGODB_URI` (idempotent; never drops data) |
| `npm run db:seed` | Development sample content (refuses `APP_ENV=production`) |
| `npm run db:import-home` | Loads the approved Figma homepage copy into a database that has no Home record yet (refuses production); `db:dev` takes `--design` for the same |
| `npm run db:dev` | Throwaway local MongoDB; flags `--seed` or `--design`, `--empty` (no schema, to try `db:migrate`), `--port=N` |
| `npm run seo:audit` | Against `MONGODB_URI`: per-page SEO issues, duplicate titles/descriptions/canonicals, sitemap audit, internal-link health. Exits 1 on sitemap issues |

## Configuration

Variables, tiers and rules: [ENVIRONMENT.md](ENVIRONMENT.md). In short: `APP_ENV` (`development` | `staging` | `production`), `NEXT_PUBLIC_SITE_URL` (the one canonical origin), `MONGODB_URI` (secret; required in staging and production; startup fails naming the variable if missing), optional `MEDIA_ALLOWED_HOSTS`, `LOG_LEVEL`, optional `ADMIN_API_TOKEN` (secret; enables `/api/admin/**` and `/preview/**` as the administrator role — see [CMS_GUIDE.md](CMS_GUIDE.md); unset disables both, safely), and optional `CMS_EDITOR_API_TOKEN` (secret; a second, lower-privilege "Content Editor" role — Stage 5, Phase 1). Only production is indexable; set `APP_ENV` at **build** time as well as run time.

## Where things are

```
src/app/            pages, route handlers under api/ (public + admin/), preview/, sitemap.ts, robots.ts
src/components/     UI/content/section/layout/form components (CSS Modules, no CSS framework)
src/server/         all backend logic (server-only)
  modules/<domain>/   services (queries + rules) and zod input schemas
  api/                controllers, admin controllers, response projections, Home contract, query parsing, rate limiting, admin auth, preview
  seo/                slugs, canonical/robots/metadata, sitemap, JSON-LD, audits
  db/                 MongoDB collections/validators/indexes (`schema.ts`), helpers (published-only filters, admin listing), seed
  validation/         shared schemas (slug, media, CTA, SEO)
src/lib/            isomorphic route table, media facts, analytics config
src/components/analytics/  Analytics bootstrap, page-view/click/case-study/service-engagement trackers
tests/              unit, integration and sign-off verification tests
```

## Documentation map

### Stage 1 — backend, SEO and API foundation

| Read this for | File |
|---|---|
| How the system is layered and why | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Content models, relationships, publishing, validation, indexes | [CONTENT_ARCHITECTURE.md](CONTENT_ARCHITECTURE.md) |
| Every public endpoint, envelope, errors, pagination, caching | [API.md](API.md) |
| The Home page data contract for the frontend and designer | [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md) |
| Routes, URL policy, slug rules | [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md), [URL_CONVENTIONS.md](URL_CONVENTIONS.md), [SLUG_STRATEGY.md](SLUG_STRATEGY.md) |
| Metadata, canonicals, sitemap, robots, JSON-LD | [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md), [SEO_INDEXING.md](SEO_INDEXING.md) |
| Media references, alt text, delivery, caching | [MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md) |
| CMS-to-website data flow, rendering strategy, cache/revalidation behavior | [CONTENT_DELIVERY.md](CONTENT_DELIVERY.md) |
| Security, validation, rate limits, headers, limitations | [SECURITY.md](SECURITY.md) |
| Environment variables and tiers | [ENVIRONMENT.md](ENVIRONMENT.md) |
| What was verified and what remains | [STAGE1_VERIFICATION.md](STAGE1_VERIFICATION.md) |

### Stage 2 — SEO/content architecture and frontend-readiness (Phases 1–5)

| Read this for | File |
|---|---|
| Full public page inventory and hierarchy | [SEO_SITE_ARCHITECTURE.md](SEO_SITE_ARCHITECTURE.md) |
| Search intent and keyword/topic mapping (semantic only, not verified research) | [SEO_KEYWORD_INTENT_MAP.md](SEO_KEYWORD_INTENT_MAP.md) |
| Section-by-section content structure per page | [PAGE_CONTENT_BLUEPRINT.md](PAGE_CONTENT_BLUEPRINT.md), [PAGE_CONTENT_MATRIX.md](PAGE_CONTENT_MATRIX.md) |
| SEO/URL/H1/metadata/schema alignment per page | [SEO_CONTENT_MAP.md](SEO_CONTENT_MAP.md) |
| Content-type-to-CMS mapping and frontend data contracts | [CMS_CONTENT_MAP.md](CMS_CONTENT_MAP.md) |
| Internal linking rules and relationships | [INTERNAL_LINK_MAP.md](INTERNAL_LINK_MAP.md) |
| Index/robots/canonical/sitemap decisions per page type | [INDEXABILITY_MATRIX.md](INDEXABILITY_MATRIX.md) |
| What content is missing, unverified, or needs approval | [CONTENT_GAP_REPORT.md](CONTENT_GAP_REPORT.md) |
| Frozen public response contracts and their exported types | [CONTENT_CONTRACTS.md](CONTENT_CONTRACTS.md) |
| How to consume the API/types as a frontend developer | [FRONTEND_INTEGRATION.md](FRONTEND_INTEGRATION.md) |
| The single per-page specification (SEO + content + status) | [PAGE_SPECIFICATIONS.md](PAGE_SPECIFICATIONS.md) |
| What the designer/developer have available right now | [DESIGNER_HANDOFF.md](DESIGNER_HANDOFF.md), [DEVELOPER_CONTENT_CONTRACT.md](DEVELOPER_CONTENT_CONTRACT.md) |
| Verified, current development-readiness state per page | [DEVELOPMENT_READINESS.md](DEVELOPMENT_READINESS.md) |

### Stage 3 — frontend implementation (Phases 1–10)

| Read this for | File |
|---|---|
| Frontend foundation, design tokens, component architecture, real defects found/fixed | [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) |
| Component naming/usage reference | [COMPONENT_GUIDE.md](COMPONENT_GUIDE.md) |
| What the designer has supplied vs. placeholder (nothing, as of writing) | [DESIGN_SYSTEM_MAPPING.md](DESIGN_SYSTEM_MAPPING.md) |
| Final per-page specification, including About/Careers/Contact/Insights build status | [PAGE_SPECIFICATIONS.md](PAGE_SPECIFICATIONS.md) |

### Stage 4 — integration, content management and analytics (Phases 1–5)

| Read this for | File |
|---|---|
| How an authorized editor manages content (non-developer-oriented) | [CMS_GUIDE.md](CMS_GUIDE.md) |
| The admin API contract, alongside the public one | [API.md](API.md) |
| Every analytics event, provider config, SEO/privacy/performance safety | [ANALYTICS_EVENTS.md](ANALYTICS_EVENTS.md) |

## Verifying a change

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

For an end-to-end check against a real server: `npm run db:dev -- --seed`, build with `APP_ENV=production NEXT_PUBLIC_SITE_URL=https://smash.international`, start it with `MONGODB_URI` set, then request `/robots.txt`, `/sitemap.xml`, each sitemap URL and `/api/home`. The sign-off run and its results are in STAGE1_VERIFICATION.md.

## Not built yet

The Services hub (`/services`); Industries (`/industries` — deliberately not building, see `PAGE_SPECIFICATIONS.md` §8); a deployment pipeline/CI; a media storage provider or CDN; an approved visual design (every visual value is a placeholder token); any analytics/tracking (unset by default; see `ANALYTICS_EVENTS.md`). WhatsApp click-to-chat is built (Stage 6, Phase 4 — `SiteSettings.contact.whatsapp`), but renders nothing until a real number is configured. Legal (`/privacy-policy`, `/terms`, `/cookie-policy`) is built but noindex and content-empty until legal review supplies real copy — not a gap in engineering, a gap in approved copy. Content management is now real but deliberately minimal (`/api/admin/**`, one shared bearer token — see [CMS_GUIDE.md](CMS_GUIDE.md)), not a multi-user CMS or CRM.
