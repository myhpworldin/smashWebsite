# smash.international

Public website for SMASH International: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, MongoDB, zod.

## Setup

Requires Node.js 24+ and a MongoDB (local `mongod` or Atlas).

```bash
npm install
cp .env.example .env.local        # set MONGODB_URI; every variable is documented in .env.example
npm run db:migrate                # collections, validators and indexes (safe to re-run)
npm run dev                       # http://localhost:3000
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Development server, production build, production server |
| `npm run typecheck` / `lint` / `test` | Type check, ESLint, tests (a throwaway `mongod` is started by the test run) |
| `npm run db:migrate` | Create or refresh collections, validators and indexes in `MONGODB_URI` (never drops data) |
| `npm run db:seed` | `[SAMPLE]` placeholder content (development only) |
| `npm run db:import-home` | Approved Figma homepage and services content (development only) |
| `npm run db:import-careers` | Approved Figma careers list (development only) |
| `npm run db:dev` | Throwaway local MongoDB; flags `--seed`, `--design`, `--empty`, `--port=N` |
| `npm run seo:audit` | SEO, sitemap and internal-link checks against `MONGODB_URI` |

The seed and import commands write to whatever database `.env.local` points at, so check `MONGODB_URI` first.

## Structure

```
src/app/          pages and route handlers (api/ public, api/admin/ content management)
src/components/   UI, layout, page sections, forms
src/server/       backend logic: modules/<domain>, api, seo, db, validation
src/lib/          routes, shared options and validation, analytics config
tests/            unit and integration tests
```

Pages: Home, About, Services, Work, Insights, Careers, Contact and the legal pages. Content is managed through the admin API (`/api/admin/**`, bearer-token protected); the public API is under `/api/**`.

See [API.md](API.md) for the public endpoint reference (response contract, pagination, slugs, caching, rate limiting), [ARCHITECTURE.md](ARCHITECTURE.md) for how the backend is layered, and [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md) / [SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md) for the technical SEO system and per-route status.

For security, environments and production operations, see [SECURITY.md](SECURITY.md), [ENVIRONMENT.md](ENVIRONMENT.md), [OPERATIONS.md](OPERATIONS.md), [BACKUP.md](BACKUP.md) and [MONITORING.md](MONITORING.md).

## Building UI on the content API

The rules a page or component can rely on. Full shapes are in [API.md](API.md) and `src/server/api/serializers.ts` / `home.dto.ts`.

- **Same origin.** The API lives on the site's own domain (`/api/...`) and sends no CORS headers, so it cannot be called from a separately hosted frontend.
- **Summary vs detail.** List responses carry only what a card needs (title, slug, short description, image); detail responses carry the full content, published related items and `seo`. No response exposes database IDs, `status`, `createdAt` or internal foreign keys: related records arrive already resolved.
- **Slugs are the only identifier.** URLs are `/{type}/{slug}`, stable once published; an explicit slug change creates a redirect from the old URL. A malformed slug returns `400`, an unknown or unpublished one `404`. There is no lookup by ID, and none will be added.
- **SEO is server-side.** Titles, descriptions, canonicals, Open Graph/Twitter fallbacks, JSON-LD and indexability are all resolved by `src/server/seo` ([SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md)). A page only has to render content that matches them.
- **Images** are always `{ url, alt, width, height }`, with a meaningful `alt` and `width`/`height` present together or not at all. Render them with `next/image` (see `src/components/ui/Media.tsx`); format conversion and responsive sizes are already handled.
- **Only published content** is ever returned, listed in the sitemap or indexed, enforced in the database queries. Publishing has minimum-content gates, so sparse published content is real, not a bug. There is no scheduled publishing.
- **Errors** all share `{ success: false, message, error: { code, fields } }`. Branch on `error.code` only (`message` is display text); respect `Retry-After` on a `429`; never show a `500`'s details to visitors.
- **Empty is not an error.** An empty list is `data: []` with a zero total. Optional sections come back as `null` or `[]`, never a missing key, and every Home section can be `null` independently: hide what is empty instead of rendering a broken block.
- **Pagination** is page-based with `limit` capped at 50; a larger value fails with `422` rather than being cut short.
- **Public reads need no authentication**, so anything they return is public. Admin (`/api/admin/**`) and lead (`/api/leads`) endpoints are not for public pages, except the Contact form, which posts to `/api/leads`.
- **Undocumented fields may disappear**; documented ones change only by a deliberate contract change. A new layout should never need a backend change; genuinely new data does.
