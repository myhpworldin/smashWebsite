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

## Server region

Vercel runs the server functions in **Mumbai (`bom1`)**, set in the Vercel project settings (there is no `vercel.json`). The MongoDB Atlas cluster is in AWS Hyderabad (`ap-south-2`), so each database call is a short hop instead of the ~230 ms round trip it was from the default `iad1` (Washington, D.C.). Keep the two close: a page makes several database calls in sequence. If the cluster ever moves, move the function region with it, and if Atlas network access is ever narrowed to fixed IPs, Vercel's region must stay reachable.

## Page caching

The public marketing pages are cached and regenerated (ISR; `src/server/seo/public-cache.ts`), not rendered on every request. What that means day to day:

- **The build reads the database.** `npm run build` prerenders Home, About, Services, every published service, offering and case study, FAQ, Contact, Careers, the legal pages and the sitemap, so `MONGODB_URI` (and `APP_ENV`, `NEXT_PUBLIC_SITE_URL`) must be available to the build, not only at runtime. A database outage during a build fails the build; the previous deployment keeps serving.
- **Admin edits show on the next visit.** Every successful write through the admin content API clears the page cache.
- **DB scripts and direct Atlas edits do not clear it.** Their changes appear within an hour, or straight away after `curl -X POST -H "Authorization: Bearer $ADMIN_API_TOKEN" https://smash.international/api/admin/revalidate`. Run that after any `npm run db:*` content script.
- **An outage during regeneration** keeps the last good page served; regeneration is retried on a later visit.
- **Not cached:** the Work and Insights listings (they read `?page=`), preview, admin, client portal and every `/api` route.
- **Checking a page:** `curl -sI https://smash.international/about | grep -i x-vercel-cache` shows `HIT`, `STALE` (served from cache while it regenerates) or `MISS`.

## Canonical domain & HTTPS

The application enforces its canonical domain through **configuration validation, not a runtime redirect**: `NEXT_PUBLIC_SITE_URL` must already be the single canonical origin in production (no `www.`, no `http://`, no trailing path), or the app refuses to boot. There is no code in `next.config.ts` or `src/proxy.ts` that redirects `www` → non-`www` or `http` → `https` at the application layer.

**This means the hosting/DNS/CDN layer is responsible for physically redirecting any non-canonical hostname or scheme (`http://`, `www.`) to the one canonical origin** before a request ever reaches this application. Most hosting platforms (Vercel, Cloudflare, etc.) provide this as a dashboard-level domain configuration — set it up there, pointing every alternate hostname at the exact value configured in `NEXT_PUBLIC_SITE_URL`.

**Decision (primary domain): `https://smash.international`, the apex, without `www`.** Every canonical, `og:url`, JSON-LD URL, sitemap `<loc>` and the `robots.txt` `Sitemap:` line is built from `NEXT_PUBLIC_SITE_URL` and so names the apex. The apex was chosen because the application's production validation already requires a bare, non-`www` origin and it is what the site already advertises. Changing to `www` would need changes to that validation and to `NEXT_PUBLIC_SITE_URL`.

Required Vercel configuration (Project → Settings → Domains):

| Host | Setting |
|---|---|
| `smash.international` | Serves the site directly. **No** redirect to `www`. |
| `www.smash.international` | Redirect to `smash.international`, 308. |
| `http://` for both | Redirected to `https://` (Vercel default). |

Production environment: `APP_ENV=production` and `NEXT_PUBLIC_SITE_URL=https://smash.international`, set at build time and at runtime.

If the Vercel domain redirect points the wrong way (apex → `www`), every canonical and sitemap URL points at a redirecting URL, even though the application is correct. Do not add a `www` → apex redirect to `src/proxy.ts` while the Vercel setting still redirects apex → `www`: the two would loop.

**Verify after any domain, redirect or env change** (read-only; it exits 1 on any failure):

```
npm run seo:check-domain -- https://smash.international
npm run seo:check-domain -- https://<preview-deployment>.vercel.app --expect=noindex
npm run seo:check-domain -- http://localhost:3000 --primary=https://smash.international   # a local production-mode `next start`
```

It traces every redirect hop for `http`/`https` × apex/`www`, checks `robots.txt`, validates the sitemap XML and requests every sitemap URL, and compares `canonical`, `og:url` and the robots meta of representative pages from each route group with the sitemap. Preview and staging deployments must be `noindex` with `Disallow: /` and an empty sitemap.

## Security headers & SEO compatibility

Security headers (`next.config.ts`) are already verified not to block legitimate crawling: `robots.txt`/`sitemap.xml` remain publicly fetchable, public pages are never blocked, and only `/api/**`, `/preview/**`, `/admin/**` carry `noindex` — covered by automated tests (`tests/indexing.test.ts`, `tests/seo.test.ts`). If a header is ever tightened further (e.g., a stricter CSP once nonce infrastructure exists — see [SECURITY.md](SECURITY.md)), re-run those tests before deploying, since a header that's too aggressive can silently break Google's ability to render or index the site.

## DNS & email authentication (SPF/DKIM/DMARC)

The site sends email through **Resend** (`src/server/email/send.ts`): the enquiry confirmation and team notification, and the client-portal emails. `EMAIL_FROM` uses the `smash.international` domain, which is verified in Resend. Mailboxes for `smash.international` are on **Google Workspace**. The public contact address is `smash@sysmantech.net` by the business's choice. DNS is at GoDaddy (`ns13/ns14.domaincontrol.com`).

State checked on 2026-10-23:

| Record | Status | Notes |
|---|---|---|
| MX `smash.international` | Google Workspace | `aspmx.l.google.com` and its alternates |
| SPF `smash.international` | In place | `include:dc-…._spfm.smash.international` (GoDaddy-managed), which includes `_spf.google.com`; `~all` |
| SPF/MX `send.smash.international` | In place | Resend's return-path: MX `feedback-smtp.ap-northeast-1.amazonses.com`, SPF `include:amazonses.com` |
| DKIM `resend._domainkey` | In place | Signs everything the site sends |
| DKIM Google Workspace | **Misplaced** | Google's DKIM key is published as a TXT record on the root domain instead of `google._domainkey.smash.international`, so mail sent from Gmail isn't DKIM-signed in a way receivers can check. Fix in GoDaddy: move the record to host `google._domainkey`, then press "Start authentication" in Google Admin → Gmail → Authenticate email |
| DMARC `_dmarc` | In place | `p=quarantine; adkim=r; aspf=r`, reports to GoDaddy's `onsecureserver.net` |

To recheck: `dig +short TXT smash.international`, `dig +short TXT _dmarc.smash.international`, `dig +short TXT resend._domainkey.smash.international` (or a DNS-over-HTTPS lookup if a local resolver is unreliable).

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
