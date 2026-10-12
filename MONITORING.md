# Monitoring

What's active today vs. what requires an external provider to be wired up. See [BACKUP.md](BACKUP.md) for the parallel "pending infrastructure" caveat applied to backups.

## Health check — ACTIVE

`GET /api/health` (`src/app/api/health/route.ts`) returns `{"success":true,"data":{"status":"ok"}}` with no database query and no secret/environment/internal-configuration exposure. Suitable as the target URL for any uptime-monitoring provider's HTTP check. It does not currently verify database connectivity — it reports application liveness only, by design (a database hiccup should show up as elevated error rates/5xxs on content endpoints, not as a health-check failure that could page someone for a transient blip unrelated to the app process itself).

## Application logging — ACTIVE

Structured JSON logs (`src/server/lib/logger.ts`) to stdout, redacted (see [SECURITY.md](SECURITY.md)). Every request handled through the shared API wrappers (`src/server/api/handler.ts`) carries a per-request `X-Request-Id`, included in its log lines — a specific failing request can be found in logs by that ID. Log levels used: `info` (rejected requests — 400/422/409), `warn` (rate-limit rejections, auth failures), `error` (unhandled exceptions, with redacted stack trace).

**What "ACTIVE" means here**: logs are produced and structured correctly. Whether they are actually *collected and retained* anywhere queryable depends entirely on the hosting platform (e.g., Vercel's log drain, a container platform's log aggregation) — this codebase produces correct logs but does not ship a log-shipping/aggregation integration, since that is a hosting-layer decision, not an application one.

## Error monitoring — PENDING (external provider)

No error-tracking SDK (Sentry or similar) is currently integrated into the codebase. Today, "error monitoring" means: unhandled exceptions are logged (see above) with a redacted stack trace, but nothing actively alerts a human when they occur — someone has to be watching logs.

**To make this active**: wire up an error-tracking provider at the hosting/platform layer, or add a minimal SDK call inside `src/server/lib/response.ts`'s `fail()` function (the single place every unhandled error already passes through) once a provider is chosen. This is intentionally not pre-built — installing a monitoring SDK without a chosen provider/account would be exactly the kind of "install a large monitoring stack without a real requirement" this phase was told to avoid.

## Uptime monitoring — PENDING (external provider)

No uptime-monitoring provider is configured from code (there is nothing in a Next.js app that could configure this — it is entirely an external, provider-side setup).

**To make this active**, once production is live:
- **URL to monitor**: `https://smash.international/api/health` (or the production domain's equivalent).
- **Expected response**: `200` with `{"success":true,"data":{"status":"ok"}}` — treat any non-200, timeout, or malformed body as downtime.
- **Suggested check interval**: whatever the chosen provider defaults to (commonly 1-5 minutes) — no special requirement here.
- **Where alerts should go**: not yet decided — assign an on-call contact/channel when the provider is chosen.
- Pick any standard uptime provider (UptimeRobot, Better Uptime, Pingdom, a hosting platform's built-in checks, etc.) — none is mandated by the codebase.

## Database monitoring — PENDING (external provider)

Whichever MongoDB deployment is used in production (see [BACKUP.md](BACKUP.md)) should have its own provider-level monitoring enabled (Atlas has built-in cluster metrics/alerts; a self-hosted instance needs its own). This is not something the application code can provide — it has no visibility into the database server's own health beyond "did my query succeed or fail."

## Rate-limit visibility

Rate-limit rejections are logged (`logger.warn`, first rejection per window only, to avoid log flooding) with path and method — useful as an early signal of either abuse or a misbehaving client, visible in whatever log aggregation is set up per the "Application logging" section above.

## Summary

| Capability | Status |
|---|---|
| Health check endpoint | **ACTIVE** |
| Structured, redacted logging | **ACTIVE** |
| Per-request correlation ID | **ACTIVE** |
| Log aggregation/retention | **PENDING** — hosting-platform decision |
| Error tracking/alerting | **PENDING** — provider not yet chosen |
| Uptime monitoring | **PENDING** — provider not yet chosen |
| Database monitoring | **PENDING** — depends on chosen DB provider |
