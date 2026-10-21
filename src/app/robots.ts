import type { MetadataRoute } from "next";
import { indexingFromEnv } from "@/server/seo/env-context";
import { buildRobots } from "@/server/seo/robots";

// Environment-aware: production advertises the sitemap, every other tier disallows crawling. Built once per deployment
// (static): it reads only APP_ENV and NEXT_PUBLIC_SITE_URL, which are fixed for a deployment and already required at build.

export default function robots(): MetadataRoute.Robots {
  const { siteUrl, allowIndexing } = indexingFromEnv();
  return buildRobots({ siteUrl, siteName: "", allowIndexing });
}
