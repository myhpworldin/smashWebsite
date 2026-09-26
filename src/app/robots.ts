import type { MetadataRoute } from "next";
import { indexingFromEnv } from "@/server/seo/env-context";
import { buildRobots } from "@/server/seo/robots";

// Environment-aware at request time: production advertises the sitemap, every other tier disallows crawling.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl, allowIndexing } = indexingFromEnv();
  return buildRobots({ siteUrl, siteName: "", allowIndexing });
}
