import "server-only";
import type { Metadata } from "next";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { careerSource, caseStudySource, homeSource, insightSource, serviceSource } from "@/server/seo/adapters";
import { resolveMetadata, type SeoSource } from "@/server/seo/metadata";
import { toNextMetadata } from "@/server/seo/to-next-metadata";
import { toleratesOutages } from "@/server/seo/env-context";
import { getCareer, getCaseStudy, getHome, getInsight, getService, getSiteContext } from "@/server/seo/request-cache";
import { staticPageSource } from "@/server/seo/static-pages";

async function build(load: () => Promise<SeoSource>, onMissing: Metadata): Promise<Metadata> {
  try {
    const source = await load();
    return toNextMetadata(resolveMetadata(await getSiteContext(), source));
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") return onMissing;
    throw err;
  }
}

// Unknown slug: the page itself issues the 404/redirect, so emit nothing here.
export const serviceMetadata = (slug: string) => build(async () => serviceSource(await getService(slug)), {});
export const caseStudyMetadata = (slug: string) => build(async () => caseStudySource(await getCaseStudy(slug)), {});
export const insightMetadata = (slug: string) => build(async () => insightSource(await getInsight(slug)), {});
export const careerMetadata = (slug: string) => build(async () => careerSource(await getCareer(slug)), {});

/** For a static hub page (e.g. `/work`) whose SEO source has no database record — title/intent only, per SEO_ARCHITECTURE.md. */
export async function staticPageMetadata(path: string): Promise<Metadata> {
  const source = staticPageSource(path);
  if (!source) return {};
  return toNextMetadata(resolveMetadata(await getSiteContext(), source));
}

/**
 * Home is always a live page, so an unpublished/missing Home record must say
 * noindex explicitly (never fall through to "indexable by default"). Any other
 * failure (e.g. the database is unreachable) is an outage: production fails the
 * request (never a blank, indexable 200); other tiers log it and render the shell.
 */
export async function homeMetadata(): Promise<Metadata> {
  try {
    return await build(async () => {
      const home = await getHome();
      // A published Home that resolves its title/description from site-wide defaults is a content gap: say so, never hide it.
      if (!home.seo?.metaTitle || !home.seo?.metaDescription) logger.warn("Home is published without its own SEO title/description; using site-wide fallbacks", { missing: [!home.seo?.metaTitle && "metaTitle", !home.seo?.metaDescription && "metaDescription"].filter(Boolean) });
      return homeSource(home);
    }, { robots: { index: false, follow: false } });
  } catch (err) {
    if (!toleratesOutages()) throw err;
    logger.warn("Home metadata unavailable", { error: err instanceof Error ? err.message : String(err) });
    return {};
  }
}
