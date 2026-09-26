import type { MetadataRoute } from "next";
import { getDb } from "@/server/db/client";
import { logger } from "@/server/lib/logger";
import { indexingFromEnv } from "@/server/seo/env-context";
import { SITEMAP_MAX_URLS, buildSitemap } from "@/server/seo/sitemap";

// Generated per request from published content, so new pages appear without code changes.
// A database failure surfaces as an error (crawlers retry) rather than an empty sitemap that would signal pages vanished.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl, allowIndexing } = indexingFromEnv();
  const entries = await buildSitemap(getDb(), { siteUrl, siteName: "", allowIndexing });
  if (entries.length > SITEMAP_MAX_URLS) {
    logger.warn("Sitemap exceeds the 50,000 URL limit and was truncated; split it with generateSitemaps()", { total: entries.length });
    return entries.slice(0, SITEMAP_MAX_URLS);
  }
  return entries;
}
