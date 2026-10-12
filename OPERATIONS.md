# Operations

How this application is expected to run day to day, and what's a hosting/infrastructure responsibility rather than something the codebase does for you.

## Deployment tiers

Three tiers exist, distinguished by `APP_ENV` — see [ENVIRONMENT.md](ENVIRONMENT.md) for full variable detail:

- **Development**: local machine, `npm run dev`, relaxed validation, never indexable.
- **Staging**: requires its own `MONGODB_URI` and a real https `NEXT_PUBLIC_SITE_URL`; never indexable (robots/sitemap code treats it the same as development for that purpose) — a safe place to verify a release before it reaches production.
- **Production**: requires the exact canonical bare origin as `NEXT_PUBLIC_SITE_URL` (enforced at boot — a misconfigured value fails fast instead of silently serving the wrong canonical domain); the only tier that is indexable and that serves `Strict-Transport-Security`.

**Staging must never point at the production database, reuse production secrets, or write to production CMS content.** Nothing in the codebase prevents this by itself — it is enforced entirely by giving staging its own `MONGODB_URI` and its own `ADMIN_API_TOKEN`/`CMS_EDITOR_API_TOKEN`/`ADMIN_SESSION_SECRET` when provisioning that environment. There is no transactional email sending anywhere in this codebase (confirmed by a full search), so there is no risk of staging triggering a production notification — that failure mode simply doesn't exist here.

## Build & deploy commands

| Command | Purpose |
|---|---|
| `npm run build` | Production build — must pass before any deploy |
| `npm run start` | Serve the production build |
| `npm run typecheck` / `npm run lint` / `npm run test` | Must all pass before merging or deploying |
| `npm run db:migrate` | Create/refresh collections, validators and indexes against `MONGODB_URI` — safe to re-run, never drops data |
| `npm run seo:audit` | SEO/sitemap/internal-link consistency check against `MONGODB_URI` |

Run `db:migrate` against each environment's own database before first deploying to it, and again after any schema change (new field, new index) ships.

## Canonical domain & HTTPS

The application enforces its canonical domain through **configuration validation, not a runtime redirect**: `NEXT_PUBLIC_SITE_URL` must already be the single canonical origin in production (no `www.`, no `http://`, no trailing path), or the app refuses to boot. There is no code in `next.config.ts` or `src/proxy.ts` that redirects `www` → non-`www` or `http` → `https` at the application layer.

**This means the hosting/DNS/CDN layer is responsible for physically redirecting any non-canonical hostname or scheme (`http://`, `www.`) to the one canonical origin** before a request ever reaches this application. Most hosting platforms (Vercel, Cloudflare, etc.) provide this as a dashboard-level domain configuration — set it up there, pointing every alternate hostname at the exact value configured in `NEXT_PUBLIC_SITE_URL`.

## Security headers & SEO compatibility

Security headers (`next.config.ts`) are already verified not to block legitimate crawling: `robots.txt`/`sitemap.xml` remain publicly fetchable, public pages are never blocked, and only `/api/**`, `/preview/**`, `/admin/**` carry `noindex` — covered by automated tests (`tests/indexing.test.ts`, `tests/seo.test.ts`). If a header is ever tightened further (e.g., a stricter CSP once nonce infrastructure exists — see [SECURITY.md](SECURITY.md)), re-run those tests before deploying, since a header that's too aggressive can silently break Google's ability to render or index the site.

## DNS & email authentication (SPF/DKIM/DMARC)

**There is no transactional email-sending code anywhere in this application** — the contact form only writes to MongoDB, it does not send a notification email. Because of this, SPF/DKIM/DMARC records are **not currently a technical requirement for this application to function**, and there is nothing in this codebase to configure for them.

If/when email sending is added (e.g., a "new enquiry" notification), the following becomes a DNS-provider task, not a code task — document it here once email sending exists:

| Record | Status | Notes |
|---|---|---|
| SPF | Not applicable — no email sending exists | Add once an email-sending provider is chosen, authorizing that provider's sending IPs/domain |
| DKIM | Not applicable — no email sending exists | Add once a provider is chosen; the provider typically supplies the exact DNS record to add |
| DMARC | Not applicable — no email sending exists | Add after SPF/DKIM are verified working, starting with a monitor-only policy before enforcing rejection |

Do not add these DNS records speculatively — they protect a sending capability that doesn't exist yet, and an unused SPF/DMARC record pointing at nothing is itself a minor misconfiguration to avoid.

## Dependency maintenance

- Run `npm audit` periodically (and before each production deploy). Apply non-breaking fixes (`npm audit fix`) promptly.
- Do not run `npm audit fix --force` or bump a major version without: checking the changelog for breaking changes, running the full test suite, running a production build, and manually re-verifying the affected area.
- `npm outdated` shows version drift; a package being behind is not itself an incident — prioritize packages with an actual known vulnerability over a bare version-number gap.

## Database operations

See [SECURITY.md](SECURITY.md) for connection safety (pool size, timeouts) and [BACKUP.md](BACKUP.md) for backup status — both are operational prerequisites, not optional reading, before relying on this application in production.

## Incident checklist (what to check first)

1. `GET /api/health` — is the app process itself up?
2. Application logs — filter by the `X-Request-Id` from a user-reported failure, or by `level: "error"` for unhandled exceptions.
3. Database reachability — a connection failure surfaces as a generic 500 to users (by design, never a raw driver error) and as a redacted `"Unhandled error"` log entry server-side.
4. Rate-limit logs (`level: "warn"`, `"Rate limit exceeded"`) — rule out a legitimate traffic spike or abuse before assuming an outage.

## Pending infrastructure (cannot be completed from this repository)

- Uptime monitoring provider — see [MONITORING.md](MONITORING.md).
- Error-tracking provider — see [MONITORING.md](MONITORING.md).
- Database backup provider configuration — see [BACKUP.md](BACKUP.md).
- Hosting-platform domain/redirect configuration for canonical www/https enforcement (above).
- DNS email-authentication records — only once email-sending is actually added (above).
