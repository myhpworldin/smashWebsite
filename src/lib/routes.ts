/**
 * Single source of truth for public URLs. Safe to import from server and client.
 * Never hardcode these strings elsewhere; build links with ROUTES.
 */
export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  SERVICES: "/services",
  SERVICE: (slug: string) => `/services/${slug}`,
  /** Stage 1, Phase 1: an individual offering within a category, e.g. `/services/growth/meta-ads`. Deliberately nested rather than flat — avoids any slug collision with the 4 category routes above, which share this same `services` collection. */
  SERVICE_OFFERING: (categorySlug: string, slug: string) => `/services/${categorySlug}/${slug}`,
  WORK: "/work",
  CASE_STUDY: (slug: string) => `/work/${slug}`,
  INSIGHTS: "/insights",
  INSIGHT: (slug: string) => `/insights/${slug}`,
  CAREERS: "/careers",
  CAREER: (slug: string) => `/careers/${slug}`,
  CONTACT: "/contact",
  PRIVACY_POLICY: "/privacy-policy",
  TERMS: "/terms",
  COOKIE_POLICY: "/cookie-policy",
} as const;

/** Content types that own a slug and a `/<prefix>/<slug>` detail route. */
export const CONTENT_ROUTES = {
  service: { prefix: "/services", build: ROUTES.SERVICE },
  caseStudy: { prefix: "/work", build: ROUTES.CASE_STUDY },
  insight: { prefix: "/insights", build: ROUTES.INSIGHT },
  career: { prefix: "/careers", build: ROUTES.CAREER },
} as const;
export type ContentRouteType = keyof typeof CONTENT_ROUTES;

export const STATIC_ROUTES: readonly string[] = [
  ROUTES.HOME,
  ROUTES.ABOUT,
  ROUTES.SERVICES,
  ROUTES.WORK,
  ROUTES.INSIGHTS,
  ROUTES.CAREERS,
  ROUTES.CONTACT,
  ROUTES.PRIVACY_POLICY,
  ROUTES.TERMS,
  ROUTES.COOKIE_POLICY,
];

/**
 * Static routes that have a page file today; the rest are defined URLs whose pages
 * are not built yet (they would 404). tests/indexing.test.ts fails if this list and
 * the page files under src/app disagree, so building a page (e.g. /about) forces
 * this list to be updated. Being live does not by itself make a route sitemap-eligible
 * — `buildSitemap` also checks each static page's own indexability (`static-pages.ts`),
 * which is how the Legal pages below can be built (real page, no 404) while still
 * held out of the sitemap until their content is approved.
 */
export const LIVE_STATIC_ROUTES: readonly string[] = [
  ROUTES.HOME,
  ROUTES.SERVICES,
  ROUTES.WORK,
  ROUTES.INSIGHTS,
  ROUTES.ABOUT,
  ROUTES.CAREERS,
  ROUTES.CONTACT,
  ROUTES.PRIVACY_POLICY,
  ROUTES.TERMS,
  ROUTES.COOKIE_POLICY,
];

/**
 * True for a canonical internal path: one of the defined static routes, or
 * "/<content-prefix>/<slug>". It checks form only (the target may not be published yet).
 * Rejects queries, fragments, uppercase, trailing slashes and ids-as-slugs shapes are left to slug rules.
 */
export function isPublicRoutePath(path: string): boolean {
  if (path !== normalizePathname(path) || /[?#]/.test(path)) return false;
  if (STATIC_ROUTES.includes(path)) return true;
  return Object.values(CONTENT_ROUTES).some(({ prefix }) => new RegExp(`^${prefix}/[a-z0-9]+(-[a-z0-9]+)*$`).test(path));
}

/** First path segments owned by the application; slugs may not reuse them. */
export const TOP_LEVEL_SEGMENTS: readonly string[] = [
  ...new Set([...STATIC_ROUTES.filter((r) => r !== "/").map((r) => r.split("/")[1]), "api"]),
];

/**
 * URL policy: lowercase, no trailing slash (except "/"), no duplicate slashes,
 * no query string or fragment in the canonical form. Query strings are not
 * redirected, they are simply ignored by canonical URLs.
 */
export function normalizePathname(input: string): string {
  // Backslashes are path separators to URL parsers, so treat them as such (else "/\\host" would parse as "//host").
  const path = input.split(/[?#]/, 1)[0].toLowerCase().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.length > 1 ? withLeading.replace(/\/+$/, "") || "/" : withLeading;
}

/** Absolute canonical URL for a public path on the configured primary host. */
export function canonicalUrl(path: string, siteUrl: string): string {
  const origin = new URL(siteUrl).origin;
  const url = new URL(normalizePathname(path), origin);
  if (url.origin !== origin) throw new Error("canonicalUrl left the site origin"); // invariant: never an off-site URL
  return url.toString();
}
