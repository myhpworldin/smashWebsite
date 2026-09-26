# URL conventions

Implemented in [src/lib/routes.ts](src/lib/routes.ts), [src/proxy.ts](src/proxy.ts) and `trailingSlash: false` in [next.config.ts](next.config.ts).

| Rule | Behaviour |
|---|---|
| Case | Lowercase only. A request with uppercase letters gets a **308** to the lowercase path (query string preserved) |
| Separators | Hyphens. Slugs match `^[a-z0-9]+(-[a-z0-9]+)*$` |
| Trailing slash | None (except `/`). `/services/` → 308 → `/services` |
| Duplicate slashes | Collapsed by `normalizePathname` (used by the resolver and canonical helper) |
| Query strings | Public pages need none. Any query is tolerated, not redirected, and never part of the canonical URL |
| Identifiers | No database ids or random strings in public URLs. Numeric-only, UUID-shaped and `service-1` style slugs are rejected |
| Depth | Hub → detail only (`/services/<slug>`); deeper paths are not-found |
| Host | One primary host, from `NEXT_PUBLIC_SITE_URL`. `canonicalUrl(path, siteUrl)` builds absolute canonicals. **Redirecting non-primary hosts (www, http) is a hosting/DNS task and is not implemented here** |
| Prefixes | `/services`, `/work`, `/insights`, `/careers` are stable and owned by `CONTENT_ROUTES` |

Public detail URLs resolve only through published content (`resolvePublicRoute`). Unknown, draft, wrong-type and id-based paths all yield the framework 404 (`notFound()`); no database detail is exposed. When `MONGODB_URI` is unset the detail pages return a generic 500, not a 404.

Not implemented: non-canonical host redirects, hreflang, redirect middleware wiring (see redirects in SLUG_STRATEGY.md).
