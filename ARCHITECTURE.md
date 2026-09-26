# Architecture: smash.international (public website)

Describes what exists. Rationale for choices is included; open decisions are listed in §9.

## 1. Stack and decisions

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router, TypeScript (strict) | SEO-friendly server rendering; the spec's routes (`/api/services/[slug]`) are Next.js conventions; one deployable for pages and API |
| Backend | Route Handlers as a thin HTTP layer over `src/server` | No separate server to operate |
| Database | MongoDB (official `mongodb` driver), collection validators and unique indexes created by `npm run db:migrate` | Document content with embedded page copy, id references, and unique slugs |
| Validation | zod everywhere (environment, requests, content) | One library |
| Tests | Vitest against a throwaway `mongod` started by the run, validators and indexes applied | Real database behaviour, no shared server |
| CMS | None. Content lives in MongoDB behind module services. Sanity/Strapi/Directus remain candidates (§9) | Decision deferred |
| Deployment | Not configured; the app is host-agnostic | No hosting decision yet |

Toolchain pins: TypeScript 5.x (typescript-eslint does not support 7) and ESLint 9.x (eslint-plugin-react breaks on 10). Revisit when upstream catches up.

History: the workspace was empty at the start of Stage 1, so nothing pre-existing was preserved; the sibling folder `smashInternational` was never audited by decision of the project owner.

## 2. Layering

```
request → src/proxy.ts (405 for writes on /api; URL normalisation for pages)
        → route file (src/app/**/route.ts or page.tsx)
        → publicGet (size check, rate limit, envelope, cache headers)
        → controller           parse params/query, call a service, project to a public DTO
        → module service       queries + business rules (published-only filters live here)
        → MongoDB driver / MongoDB
```

Rules that hold in the code: routes contain no business logic; services never touch `Request`/`Response`; every public read goes through `isPublished`/`publishedAnd`; public responses are built field by field (`api/serializers.ts`, `api/home.dto.ts`), never from raw rows; all of `src/server/**` imports `server-only` where it touches configuration; server components call the same services in-process, and the HTTP API serves the progressive frontend and external consumers.

## 3. Folder structure

```
src/
  app/                    pages (placeholders owned by the frontend track), api/**/route.ts, sitemap.ts, robots.ts
  components/JsonLd.tsx   the only component that injects a script (escaped JSON-LD)
  lib/                    routes.ts (route table, URL normalisation, canonicalUrl), media.ts, site-url.ts, media-config.ts
  proxy.ts                405 guard for /api, lowercase/trailing-slash redirects for pages
  server/
    config/env.ts         validated environment (the only reader of process.env besides next.config/site-url/media-config)
    lib/                  errors, response (the one place errors become responses), logger (redacting)
    api/                  handler, controllers, serializers, sections, home.dto, query, rate-limit
    db/                   schema.ts, helpers.ts, client.ts, seed.ts
    modules/              home, services, work, insights, testimonials, clients, team, careers, site-settings
                          (each: <domain>.service.ts + <domain>.schema.ts)
    validation/           common, content, media, publish
    seo/                  slug, metadata, adapters, static-pages, breadcrumbs, schema, page-jsonld, resolve, redirects,
                          sitemap, robots, validate, links-audit, site-context, env-context, request-cache, next-metadata,
                          to-next-metadata, page-resolver
    media/public.ts       public media projection
scripts/                  migrate, seed, seo-audit, dev-db
tests/                    9 files: content, seo, seo-metadata, api, security, media, indexing, home, verification
```

## 4. Content and data

Nine entities (SiteSettings, HomePage, Service, CaseStudy, Insight, TeamMember, Testimonial, Client, Career) and their relationships, publishing rules, validation and indexes: [CONTENT_ARCHITECTURE.md](CONTENT_ARCHITECTURE.md). Page-specific copy is embedded; reusable content is referenced by id through link collections. Media is a validated reference, not a file: [MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md).

## 5. Public API

Read-only, JSON, envelope `{success, data, meta?}` / `{success:false, message, error:{code, fields?}}`. Endpoints, statuses, pagination, caching: [API.md](API.md). Home is a design-independent contract: [HOME_PAGE_CONTRACT.md](HOME_PAGE_CONTRACT.md).

## 6. SEO architecture

One resolver (`seo/metadata.ts`) produces title, description, canonical, robots, Open Graph and Twitter for every page type through thin adapters; the sitemap and page robots share `resolveRobots`/`resolveCanonical`, so they cannot disagree. Routes are slug-based and stable; renamed slugs are recorded in `redirects` and 308 to the new URL. The site origin comes only from `NEXT_PUBLIC_SITE_URL`. Only production is indexable. Details: [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md), [SLUG_STRATEGY.md](SLUG_STRATEGY.md), [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md), [SEO_INDEXING.md](SEO_INDEXING.md). No keyword research has been performed and none is claimed.

## 7. Security baseline

Summary table in [SECURITY.md](SECURITY.md): strict zod allow-lists on writes, validated query/slug parsing, safe error envelope with redacted server-side logging, security headers (partial CSP by design), best-effort in-memory rate limiting (requests with no client address are not limited), no CORS (same origin), environment validation that fails fast, credential scan test.

## 8. Environments

`APP_ENV` selects the tier; see [ENVIRONMENT.md](ENVIRONMENT.md). Development and staging are noindex everywhere (meta, `X-Robots-Tag`, `robots.txt`, empty sitemap); staging should set `NEXT_PUBLIC_SITE_URL` to the production origin so canonicals resolve to production. `APP_ENV` must be set at build time.

## 9. Open decisions and risks

1. **Content authoring:** a minimal admin write API now exists (`/api/admin/**`, Stage 4 Phase 2 — see [API.md](API.md), [CMS_GUIDE.md](CMS_GUIDE.md)), gated by shared bearer tokens — `ADMIN_API_TOKEN` (administrator, full access) and an optional `CMS_EDITOR_API_TOKEN` (editor: can create/edit content, cannot publish or touch Site Settings — Stage 5, Phase 1's minimum role separation) — not a multi-user/session auth system. It delegates to the same module service functions content always entered through, so a future real CMS/admin UI (or multi-user auth) would sit in front of the same functions without changing them.
2. **Hosting, media storage and CDN:** undecided; nothing claims otherwise. `MEDIA_ALLOWED_HOSTS` and one function in `lib/media.ts` are the seams.
3. **Hosted MongoDB:** everything has run against a local `mongod`; never against a hosted deployment (e.g. Atlas). There are no multi-document transactions (a standalone `mongod` has none), so link replacement is delete-then-insert and not atomic.
4. **No CI or dependency automation.** `npm audit`: production dependencies 0 vulnerabilities; re-run `npm audit` after the MongoDB migration (drizzle-kit, the source of the earlier dev-only advisories, was removed).
5. **Frontend pages:** Home, About, Service detail, Work hub/Case Study, Insights hub/detail, Careers hub/detail and Contact are built (Stage 3). Legal (`/privacy-policy`, `/terms`, `/cookie-policy`) is built (Stage 4, Phase 7) as routed, noindex placeholder pages — content is still pending legal review, so the pages honestly say so rather than 404ing or inventing policy text; flip `robotsIndex` in `static-pages.ts` once real copy lands. The Services hub (`/services`) still doesn't exist; Industries was evaluated and deliberately not built (`PAGE_SPECIFICATIONS.md` §8). The sitemap and Home `links` block reflect the real, current set. No approved visual design exists for any page yet.
6. **Toolchain pins** (TS 5, ESLint 9) may block upgrades.
7. **No foreign keys:** MongoDB does not enforce references. Services check them on write (`assertExist`); reads only expose published records, so a record deleted behind the application's back simply drops out of lists (tested).
