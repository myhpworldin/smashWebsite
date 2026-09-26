import { indexingFromEnv } from "@/server/seo/env-context";
import type { Db } from "@/server/db/helpers";
import type { Controller, WriteController } from "@/server/api/handler";
import { insightsQuerySchema, pageMeta, pageQuerySchema, parseQuery, parseSlug } from "@/server/api/query";
import { homeDto } from "@/server/api/home.dto";
import {
  careerDetailDto,
  careerSummaryDto,
  caseStudyDetailDto,
  caseStudySummaryDto,
  clientDto,
  insightDetailDto,
  insightSummaryDto,
  serviceDetailDto,
  serviceSummaryDto,
  siteSettingsDto,
  testimonialDto,
  toPublicSeo,
} from "@/server/api/serializers";
import { careerSource, caseStudySource, homeSource, insightSource, serviceSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { loadSiteSeoContext } from "@/server/seo/site-context";
import { getPublishedHome } from "@/server/modules/home/home.service";
import { getPublishedServiceBySlug, listPublishedServices } from "@/server/modules/services/services.service";
import { getPublishedCaseStudyBySlug, listPublishedCaseStudies } from "@/server/modules/work/work.service";
import { getPublishedInsightBySlug, listPublishedInsights } from "@/server/modules/insights/insights.service";
import { getPublishedCareerBySlug, listPublishedCareers } from "@/server/modules/careers/careers.service";
import { listPublishedTestimonials } from "@/server/modules/testimonials/testimonials.service";
import { listPublishedClients } from "@/server/modules/clients/clients.service";
import { getSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { createEnquiry } from "@/server/modules/enquiries/enquiries.service";

/**
 * Controllers: parse the request, call a content service, project to the public
 * DTO. No queries and no business rules here. SEO comes from the same
 * resolveMetadata used for page metadata, so the API and <head> cannot disagree.
 */
const siteContext = (db: Db) => loadSiteSeoContext(db, indexingFromEnv());

export const homeController: Controller = async ({ db }) => {
  // Independent reads run together: the Home payload (5 queries) and the site settings for SEO.
  const [home, site] = await Promise.all([getPublishedHome(db), siteContext(db)]);
  return { data: homeDto(home, toPublicSeo(resolveMetadata(site, homeSource(home)))), eagerMedia: ["hero"] };
};

export const listServicesController: Controller = async (ctx) => {
  const page = parseQuery(pageQuerySchema, ctx.url);
  const { items, total } = await listPublishedServices(ctx.db, page);
  return { data: items.map(serviceSummaryDto), meta: pageMeta(total, page.page, page.limit) };
};

export const getServiceController: Controller = async (ctx) => {
  const slug = parseSlug(ctx.params.slug);
  const service = await getPublishedServiceBySlug(ctx.db, slug);
  const site = await siteContext(ctx.db);
  return { data: serviceDetailDto(service, toPublicSeo(resolveMetadata(site, serviceSource(service)))), eagerMedia: ["hero"] };
};

export const listWorkController: Controller = async (ctx) => {
  const page = parseQuery(pageQuerySchema, ctx.url);
  const { items, total } = await listPublishedCaseStudies(ctx.db, page);
  return { data: items.map(caseStudySummaryDto), meta: pageMeta(total, page.page, page.limit) };
};

export const getWorkController: Controller = async (ctx) => {
  const slug = parseSlug(ctx.params.slug);
  const study = await getPublishedCaseStudyBySlug(ctx.db, slug);
  const site = await siteContext(ctx.db);
  return { data: caseStudyDetailDto(study, toPublicSeo(resolveMetadata(site, caseStudySource(study)))), eagerMedia: ["heroImage"] };
};

export const listInsightsController: Controller = async (ctx) => {
  const query = parseQuery(insightsQuerySchema, ctx.url);
  const { items, total } = await listPublishedInsights(ctx.db, query);
  return { data: items.map(insightSummaryDto), meta: { ...pageMeta(total, query.page, query.limit), ...(query.category ? { category: query.category } : {}) } };
};

export const getInsightController: Controller = async (ctx) => {
  const slug = parseSlug(ctx.params.slug);
  const insight = await getPublishedInsightBySlug(ctx.db, slug);
  const site = await siteContext(ctx.db);
  return { data: insightDetailDto(insight, toPublicSeo(resolveMetadata(site, insightSource(insight)))), eagerMedia: ["image"] };
};

export const listCareersController: Controller = async ({ db }) => {
  const items = await listPublishedCareers(db);
  return { data: items.map(careerSummaryDto), meta: { total: items.length } };
};

export const getCareerController: Controller = async (ctx) => {
  const slug = parseSlug(ctx.params.slug);
  const career = await getPublishedCareerBySlug(ctx.db, slug);
  const site = await siteContext(ctx.db);
  return { data: careerDetailDto(career, toPublicSeo(resolveMetadata(site, careerSource(career)))) };
};

export const listTestimonialsController: Controller = async ({ db }) => {
  const items = await listPublishedTestimonials(db);
  return { data: items.map(testimonialDto), meta: { total: items.length } };
};

export const listClientsController: Controller = async ({ db }) => {
  const items = await listPublishedClients(db);
  return { data: items.map(clientDto), meta: { total: items.length } };
};

export const siteSettingsController: Controller = async ({ db }) => ({ data: siteSettingsDto(await getSiteSettings(db)) });

/** Public write: the contact form (Stage 3, Phase 7). Never echoes back what was submitted. */
export const submitEnquiryController: WriteController = async ({ db, body }) => {
  await createEnquiry(db, body);
  return { data: { received: true } };
};
