import type { MetadataRoute } from "next";
import { getDb } from "@/server/db/client";
import { logger } from "@/server/lib/logger";
import { indexingFromEnv } from "@/server/seo/env-context";
import { SITEMAP_MAX_URLS, buildSitemap } from "@/server/seo/sitemap";

// Generated from published content, so new pages appear without code changes; cached and regenerated like the pages
// (src/server/seo/public-cache.ts), and cleared with them after a content edit. A database failure at build fails the
// build, and during regeneration keeps the last good sitemap: never an empty one that would signal pages vanished.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl, allowIndexing } = indexingFromEnv();
  const entries = await buildSitemap(getDb(), { siteUrl, siteName: "", allowIndexing });
  if (entries.length > SITEMAP_MAX_URLS) {
    logger.warn("Sitemap exceeds the 50,000 URL limit and was truncated; split it with generateSitemaps()", { total: entries.length });
    return entries.slice(0, SITEMAP_MAX_URLS);
  }
  return entries;
}
