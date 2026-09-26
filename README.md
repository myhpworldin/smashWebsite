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
