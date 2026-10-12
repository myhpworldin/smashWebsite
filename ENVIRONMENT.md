# Environment Configuration

Three deployment tiers, distinguished by `APP_ENV` (not `NODE_ENV`): `development`, `staging`, `production`. Validated centrally in `src/server/config/env.ts` via `getEnv()` — any code path that touches it fails fast with a named-field error if configuration is invalid, rather than continuing silently.

## Variables

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `APP_ENV` | server-only | optional, default `development` | `development \| staging \| production` |
| `NEXT_PUBLIC_SITE_URL` | **public** (browser-visible) | optional, default `http://localhost:3000` | Must be https, non-localhost in staging; must additionally be a bare canonical origin (no `www.`/`staging.`/`stage.`/`dev.`/`test.`/`preview.` prefix, no path/query) in production |
| `LOG_LEVEL` | server-only | optional, default `info` | |
| `MONGODB_URI` | server-only, **secret** | **required** in staging/production | `mongodb://` (local/self-hosted) or `mongodb+srv://` (Atlas) — the driver and app code are provider-agnostic |
| `MONGODB_DB` | server-only | optional | Overrides the database name in the URI path |
| `MEDIA_ALLOWED_HOSTS` | server-only | optional | Additional external hosts Next's image optimizer may fetch from; empty by default (no external media host in use today) |
| `ADMIN_API_TOKEN` | server-only, **secret** | optional | CMS admin bearer token, min 32 chars |
| `CMS_EDITOR_API_TOKEN` | server-only, **secret** | optional, requires `ADMIN_API_TOKEN` to also be set | Must differ from it; min 32 chars |
| `ADMIN_SESSION_SECRET` | server-only, **secret** | optional | CRM admin session signing secret, min 32 chars |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | server-only, **secret** (password) | optional, must be set together | Seed-script only (`scripts/seed-admin.ts`) — not read by the running application |
| 6 analytics `NEXT_PUBLIC_*` vars (GA4, GTM, Meta Pixel, Google Ads ID + conversion label, Site Verification) | **public** | optional | Read in `src/lib/analytics-config.ts`; none are secrets by nature (they're client-side tracking IDs, meant to be public) |

No server secret uses the `NEXT_PUBLIC_` prefix — verified both by manual review and by an automated test (`tests/security.test.ts`) that enforces only the reviewed `NEXT_PUBLIC_*` variables above appear anywhere in source, and that `process.env` is read only from a fixed, reviewed list of files (`env.ts`, `site-url.ts`, `media-config.ts`, `analytics-config.ts`, `next.config.ts`, `scripts/lib/mongod.ts`).

## Separation between tiers

- **Development**: `MONGODB_URI` optional (code can run against nothing configured, e.g. for scripts that don't touch the DB); `NEXT_PUBLIC_SITE_URL` defaults to localhost; indexing is always off.
- **Staging**: `MONGODB_URI` required; `NEXT_PUBLIC_SITE_URL` must be a real https origin (but may use a staging hostname); SEO code (`robots.ts`, `sitemap.ts`, `metadata.ts`) treats staging as non-indexable, same as development.
- **Production**: `MONGODB_URI` required; `NEXT_PUBLIC_SITE_URL` must be the exact canonical bare origin — no `www`/`staging`/`dev`/`preview` prefix, no path. This is enforced by `envSchema`'s `superRefine`, so a misconfigured production deploy fails to boot rather than silently serving the wrong canonical domain.

Each tier is expected to be given **its own `MONGODB_URI`** (its own database/cluster) — nothing in the codebase prevents pointing two tiers at the same database, so this must be enforced operationally when provisioning each environment's secrets, not by the application.

## Local setup

```bash
cp .env.example .env.local   # .env.local is git-ignored; fill in your own local MONGODB_URI etc.
```

`.env.example` contains variable names and empty/placeholder values only — confirmed by an automated test that both scans the file for real-looking credentials and checks `.gitignore` excludes every deployment-tier env file (`.env`, `.env.production`, `.env.staging`, …) while still allowing `.env.example` to be tracked.

## Secret rotation

If any of `ADMIN_API_TOKEN`, `CMS_EDITOR_API_TOKEN`, `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD`, or `MONGODB_URI` is ever suspected of exposure, rotate it by setting a new value in the hosting platform's environment configuration and redeploying — there is no in-app rotation mechanism, by design (these are deployment-time secrets, not runtime-managed ones).
