import "server-only";
import { AppError } from "@/server/lib/errors";
import { toleratesOutages } from "@/server/seo/env-context";
import { careerPageJsonLd, caseStudyPageJsonLd, homeJsonLd, insightPageJsonLd, servicePageJsonLd, type JsonLd } from "@/server/seo/schema";
import { getCareer, getCaseStudy, getHome, getInsight, getService, getSiteContext } from "@/server/seo/request-cache";

export async function serviceSchemas(slug: string): Promise<JsonLd[]> {
  const [service, site] = await Promise.all([getService(slug), getSiteContext()]);
  return servicePageJsonLd(site, service, { breadcrumbs: true });
}

export async function caseStudySchemas(slug: string): Promise<JsonLd[]> {
  const [study, site] = await Promise.all([getCaseStudy(slug), getSiteContext()]);
  return caseStudyPageJsonLd(site, study, { breadcrumbs: true });
}

export async function insightSchemas(slug: string): Promise<JsonLd[]> {
  const [insight, site] = await Promise.all([getInsight(slug), getSiteContext()]);
  return insightPageJsonLd(site, insight, { breadcrumbs: true }); // Stage 3, Phase 6: the page now renders breadcrumbs
}

export async function careerSchemas(slug: string): Promise<JsonLd[]> {
  const [career, site] = await Promise.all([getCareer(slug), getSiteContext()]);
  return careerPageJsonLd(site, career, { breadcrumbs: true }); // Stage 3, Phase 7: the page now renders breadcrumbs
}

/** Organization data on the Home page, only while Home is published; never breaks rendering. */
export async function homeSchemas(): Promise<JsonLd[]> {
  try {
    await getHome();
    return homeJsonLd(await getSiteContext());
  } catch (err) {
    if (!(err instanceof AppError && err.code === "NOT_FOUND") && !toleratesOutages()) throw err; // outage in production: fail, never emit a partial page
    return []; // Home unpublished (or a tolerated outage): emit nothing rather than guess
  }
}
