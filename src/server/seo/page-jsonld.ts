import "server-only";
import { AppError } from "@/server/lib/errors";
import { toleratesOutages } from "@/server/seo/env-context";
import { ROUTES } from "@/lib/routes";
import { careerPageJsonLd, caseStudyPageJsonLd, homeJsonLd, insightPageJsonLd, servicePageJsonLd, breadcrumbJsonLd, type JsonLd } from "@/server/seo/schema";
import { HOME_LABEL } from "@/server/seo/static-pages";
import { getCareer, getCaseStudy, getHome, getInsight, getService, getServiceOffering, getSiteContext } from "@/server/seo/request-cache";

export async function serviceSchemas(slug: string): Promise<JsonLd[]> {
  const [service, site] = await Promise.all([getService(slug), getSiteContext()]);
  return servicePageJsonLd(site, service, { breadcrumbs: true });
}

/**
 * Stage 1, Phase 1 — an individual offering's breadcrumbs (Home → category → offering), built directly rather than
 * through `buildBreadcrumbs()`/`caseStudyPageJsonLd`-style helpers: those assume a one-level `/prefix/slug` content
 * path (Phase 0 audit §19's flagged routing risk), and extending them to a variable depth would touch shared
 * infrastructure every other content type also relies on. No `Service`/`CreativeWork` schema is emitted for the
 * offering itself — schema.org has no type that genuinely fits "one deliverable within a service category" without
 * inventing one (phase brief rule set §12/§16), matching how case studies already emit breadcrumbs only.
 */
export async function serviceOfferingSchemas(categorySlug: string, slug: string): Promise<JsonLd[]> {
  const [offering, site] = await Promise.all([getServiceOffering(categorySlug, slug), getSiteContext()]);
  const crumbs = [
    { name: HOME_LABEL, path: ROUTES.HOME },
    { name: offering.category.name, path: ROUTES.SERVICE(offering.category.slug) },
    { name: offering.title, path: ROUTES.SERVICE_OFFERING(offering.category.slug, offering.slug) },
  ];
  const ld = breadcrumbJsonLd(site, crumbs);
  return ld ? [ld] : [];
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
