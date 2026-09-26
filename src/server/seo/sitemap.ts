import { careers, caseStudies, homePage, insights, services, SINGLETON_ID } from "@/server/db/schema";
import { findPicked, isPublished, type Db } from "@/server/db/helpers";
import { CONTENT_ROUTES, LIVE_STATIC_ROUTES, ROUTES, canonicalUrl, normalizePathname, type ContentRouteType } from "@/lib/routes";
import { resolveCanonical, resolveRobots, type SiteSeoContext } from "@/server/seo/metadata";
import { resolvePublicRoute } from "@/server/seo/resolve";
import { staticPageSource } from "@/server/seo/static-pages";
import { auditPublishedSeo } from "@/server/seo/validate";
import type { Seo } from "@/server/validation/common";

export type SitemapEntry = { url: string; lastModified?: Date };

/** Protocol limit for a single sitemap file. */
export const SITEMAP_MAX_URLS = 50_000;

const TABLES: Record<ContentRouteType, typeof careers | typeof caseStudies | typeof insights | typeof services> = { service: services, caseStudy: caseStudies, insight: insights, career: careers };

/**
 * A page belongs in the sitemap exactly when it is published, indexable
 * (robots.index) and its canonical is itself. It uses the same resolveRobots and
 * resolveCanonical as the page metadata, so sitemap and noindex cannot drift.
 */
export function sitemapEligible(site: SiteSeoContext, path: string, seo?: Seo | null): boolean {
  return resolveRobots(site, "published", seo).index && resolveCanonical(site, path, seo) === canonicalUrl(path, site.siteUrl);
}

/**
 * Sitemap entries from published content. Lean: four small queries reading only
 * slug, updatedAt and seo. Not indexable tiers (development, staging) yield no
 * entries, so their URLs are never advertised. Order is deterministic.
 */
export async function buildSitemap(db: Db, site: SiteSeoContext): Promise<SitemapEntry[]> {
  if (!site.allowIndexing) return [];
  const entries = new Map<string, SitemapEntry>();
  const add = (path: string, seo: Seo | null | undefined, lastModified?: Date) => {
    if (!sitemapEligible(site, path, seo)) return;
    const url = canonicalUrl(path, site.siteUrl);
    if (!entries.has(url)) entries.set(url, { url, ...(lastModified ? { lastModified } : {}) });
  };

  const home = (await findPicked(db, homePage, { _id: SINGLETON_ID as never }, ["status", "seo", "updatedAt"] as const))[0] as { status: string; seo: Seo | null; updatedAt: Date } | undefined;
  if (home?.status === "published") add(ROUTES.HOME, home.seo, home.updatedAt);

  // Each static route's own seo (e.g. the Legal pages' noindex, static-pages.ts) governs
  // sitemap eligibility here too, so a page's <meta name="robots"> and its sitemap
  // presence can never drift apart (the exact defect auditSitemap checks for below).
  for (const route of LIVE_STATIC_ROUTES) if (route !== ROUTES.HOME) add(route, staticPageSource(route)?.seo ?? null);

  for (const type of Object.keys(TABLES) as ContentRouteType[]) {
    const t = TABLES[type];
    const rows = (await findPicked(db, t, isPublished(), ["slug", "updatedAt", "seo"] as const, { sort: { slug: 1 } })) as { slug: string; updatedAt: Date; seo: Seo | null }[];
    for (const r of rows) add(CONTENT_ROUTES[type].build(r.slug), r.seo, r.updatedAt);
  }
  return [...entries.values()].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0)); // stable, home first
}

export type SitemapIssue = { url: string; problem: string };

/**
 * QA for the sitemap and canonicals (used by tests and `npm run seo:audit`; pass `candidate` entries to check a sitemap from elsewhere):
 * origin/https/query/fragment/duplicate checks, that every URL resolves to live
 * content, that nothing noindex or non-canonical is listed, and that explicit
 * canonical overrides point at pages that exist.
 */
export async function auditSitemap(
  db: Db,
  site: SiteSeoContext,
  candidate?: SitemapEntry[],
): Promise<{ entries: SitemapEntry[]; issues: SitemapIssue[] }> {
  const entries = candidate ?? (await buildSitemap(db, site));
  const issues: SitemapIssue[] = [];
  const problem = (url: string, message: string) => issues.push({ url, problem: message });
  const origin = new URL(site.siteUrl).origin;
  const seen = new Set<string>();

  const audit = await auditPublishedSeo(db, site);
  const byUrl = new Map(audit.entries.map((e) => [canonicalUrl(e.path, site.siteUrl), e]));

  for (const { url } of entries) {
    const u = new URL(url);
    if (u.protocol !== "https:" && site.allowIndexing && !/^localhost/.test(u.hostname)) problem(url, "not https");
    if (u.origin !== origin) problem(url, `not on the site origin ${origin}`);
    if (u.search || u.hash) problem(url, "contains a query string or fragment");
    if (url !== canonicalUrl(normalizePathname(u.pathname), site.siteUrl)) problem(url, "not in canonical form");
    if (seen.has(url)) problem(url, "duplicate URL");
    seen.add(url);

    const route = await resolvePublicRoute(db, u.pathname);
    const live = route.kind === "content" || (route.kind === "static" && LIVE_STATIC_ROUTES.includes(route.path));
    if (!live) problem(url, `does not resolve to a live page (${route.kind})`);

    const page = byUrl.get(url);
    if (page && !page.indexable) problem(url, "page is noindex but listed in the sitemap");
    if (page && page.meta.canonical !== url) problem(url, "page canonical differs from its sitemap URL");
  }

  const byPath = new Map(audit.entries.map((e) => [e.path, e]));
  for (const e of audit.entries) {
    const self = canonicalUrl(e.path, site.siteUrl);
    if (e.meta.canonical === self) continue;
    const targetPath = normalizePathname(new URL(e.meta.canonical).pathname);
    const target = await resolvePublicRoute(db, targetPath);
    if (target.kind !== "content" && !(target.kind === "static" && LIVE_STATIC_ROUTES.includes(target.path))) {
      problem(e.path, `canonical ${e.meta.canonical} points to a page that does not exist`);
      continue;
    }
    // A canonical target must itself be canonical: A → B → C (or A ⇄ B) gives search engines no preferred URL.
    const next = byPath.get(targetPath);
    if (next && next.meta.canonical !== canonicalUrl(next.path, site.siteUrl)) {
      problem(e.path, `canonical chain: ${e.meta.canonical} itself canonicalises to ${next.meta.canonical}`);
    }
  }
  return { entries, issues };
}
