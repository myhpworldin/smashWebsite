# Environment configuration

Source of truth: [.env.example](.env.example). Validation: [src/server/config/env.ts](src/server/config/env.ts) (zod, server-only, fails fast with variable names only — never values).

## Tiers

| Tier | `APP_ENV` | Where values live |
|---|---|---|
| Development | `development` | `.env.local` (git-ignored) |
| Staging | `staging` | Hosting provider's environment settings (staging scope) |
| Production | `production` | Hosting provider's environment settings (production scope) |

`APP_ENV` is the deployment tier; `NODE_ENV` is set by Next.js (`development`/`production`) and is not used to distinguish staging.

## Variables

Class: **PUBLIC** (sent to browsers), **SERVER-ONLY** (never bundled; not sensitive), **SECRET** (server-only and must never be logged, committed or documented with a real value).

| Variable | Class | Required | Purpose |
|---|---|---|---|
| `APP_ENV` | SERVER-ONLY | no (default `development`) | Deployment tier |
| `NEXT_PUBLIC_SITE_URL` | PUBLIC | no (default localhost); **required in production** | Base of every canonical/OG URL. Production fails validation unless it is an https, non-localhost origin |
| `LOG_LEVEL` | SERVER-ONLY | no (default `info`) | Log verbosity |
| `MONGODB_DB` | SERVER-ONLY | no | Database name; defaults to the one in the `MONGODB_URI` path |
| `MONGODB_URI` | SECRET | **yes in staging and production** (startup fails naming it); needed for DB access, `db:migrate`, `db:seed` | MongoDB connection string (`mongodb://…` or `mongodb+srv://…`); staging and production must use separate databases |
| `MEDIA_ALLOWED_HOSTS` | SERVER-ONLY | no | Comma-separated hostnames allowed to serve media (see [MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md)). Unset: production allows only this site's own media. Also read at build time for the image optimizer |
| `ADMIN_API_TOKEN` | SECRET | no | Bearer token gating `/api/admin/**` and `/preview/**` (Stage 4, Phase 2 — see [CMS_GUIDE.md](CMS_GUIDE.md)). The **administrator** role: full access. Unset disables both entirely (a safe 500/404, never "open"). At least 32 characters; generate with e.g. `openssl rand -base64 32`. Never reuse the same value across environments |
| `CMS_EDITOR_API_TOKEN` | SECRET | no | A second, optional bearer token for the **Content Editor** role (Stage 5, Phase 1): create/edit any content, but cannot publish/unpublish it or touch `/api/admin/site-settings`. Requires `ADMIN_API_TOKEN` to also be set, and must differ from it (env-validated). Unset means only the administrator role exists |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_CONTAINER_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CONVERSION_LABEL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | PUBLIC | no | Analytics/measurement identifiers (Stage 4, Phase 5 — see [ANALYTICS_EVENTS.md](ANALYTICS_EVENTS.md)). Each is independent and unset by default; that provider simply doesn't load. None are secrets — see `analytics-config.ts` |

## Rules

- Only `NEXT_PUBLIC_*` variables may reach the browser. Everything else is read exclusively in `src/server/**`, which imports `server-only` so a client import fails the build.
- Never commit `.env*` files other than `.env.example`; never put real values in it.
- Staging must use its own database credentials, never production's.
- Add each new variable to `.env.example`, the zod schema, and this table together.

`APP_ENV=production` is the only tier that serves indexable pages; development and staging emit `noindex, nofollow` everywhere (meta, `X-Robots-Tag`, `robots.txt` disallow, empty sitemap). **Set `APP_ENV` at build time too**: the security/robots headers are compiled into the build.

`NEXT_PUBLIC_SITE_URL` is the one authoritative site origin (canonicals, sitemap, robots, OG). Production: exactly the bare `https://smash.international` origin; `www.`, `staging.`, `preview.`, `http`, localhost and paths are rejected. Staging: https; point it at the production origin so canonicals resolve to production (see [SEO_INDEXING.md](SEO_INDEXING.md)).

## Fail-fast behaviour

Configuration is validated on first use. An invalid or incomplete environment (unknown `APP_ENV`, missing `MONGODB_URI` outside development, a `www.`/staging/http production origin) makes `GET /api/health` return a safe 500 and writes `Invalid environment configuration: <VARIABLE>` (names only, never values) to the log, so a bad deploy fails its health check instead of serving errors. The health check does not touch the database, so a database outage does not take it down.
