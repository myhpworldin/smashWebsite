import "server-only";
import { getEnv } from "@/server/config/env";

/**
 * Outside production a data outage should not stop a developer or designer from
 * rendering the page shell. In production it must: a blank 200 during an outage
 * could be crawled and indexed, whereas a 5xx makes crawlers retry.
 */
export const toleratesOutages = () => !indexingFromEnv().allowIndexing;

/**
 * The only place the site origin and the "may this tier be indexed" decision
 * come from: configuration, never a request header. Production is the sole
 * indexable tier; development and staging are always noindex.
 */
export function indexingFromEnv() {
  const env = getEnv();
  return { siteUrl: env.NEXT_PUBLIC_SITE_URL, allowIndexing: env.APP_ENV === "production" };
}
