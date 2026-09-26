import { canonicalUrl } from "@/lib/routes";
import type { SiteSeoContext } from "@/server/seo/metadata";

export const SITEMAP_PATH = "/sitemap.xml";

export type RobotsConfig = {
  rules: { userAgent: string; allow?: string; disallow?: string }[];
  sitemap?: string;
};

/**
 * Crawl rules by tier.
 *  Production: everything is crawlable and the production sitemap is advertised.
 *    The API is kept out of the index with `X-Robots-Tag: noindex` instead of a
 *    disallow, because blocking crawlers from resources a page may load breaks
 *    rendering. `/preview/` (Stage 4, Phase 2 — draft preview, `server/api/preview.ts`)
 *    *is* explicitly disallowed here: it needs a real token to render anything, so
 *    this is belt-and-suspenders, not the actual access control, but there is no
 *    reason to invite a crawler to a route that can only ever 404 or noindex for it.
 *  Any other tier: crawling is disallowed and no sitemap is advertised, so a staging
 *    or development host can never promote its URLs. Pages there also carry noindex
 *    (meta and X-Robots-Tag) as a second layer.
 */
export function buildRobots(site: SiteSeoContext): RobotsConfig {
  if (!site.allowIndexing) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: "/preview/" }], sitemap: canonicalUrl(SITEMAP_PATH, site.siteUrl) };
}
