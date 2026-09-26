import { z } from "zod";
import { contentStatusSchema, seoSchema, uuidListSchema } from "@/server/validation/common";
import {
  heroSchema,
  homeBannerCtaSchema,
  homeCtaSchema,
  homeGrowthEngineSchema,
  homeIndustriesSchema,
  homeMetricSectionSchema,
  homeOurStorySchema,
  homeStorySchema,
  homeTechnologySchema,
  homeWhySmashSchema,
  sectionIntroSchema,
} from "@/server/validation/content";

/**
 * Embedded sections carry page-specific copy. The five *Ids lists reference
 * reusable records, in display order, and are never copied into the page.
 */
export const homeInputSchema = z.object({
  hero: heroSchema.optional(),
  businessProof: homeMetricSectionSchema.optional(),
  story: homeStorySchema.optional(),
  servicesSection: sectionIntroSchema.optional(),
  growthEngine: homeGrowthEngineSchema.optional(),
  selectedWorkSection: sectionIntroSchema.optional(),
  results: homeMetricSectionSchema.optional(),
  whySmash: homeWhySmashSchema.optional(),
  testimonialsSection: sectionIntroSchema.optional(),
  technology: homeTechnologySchema.optional(),
  insightsSection: sectionIntroSchema.optional(),
  cta: homeCtaSchema.optional(),
  bannerCta: homeBannerCtaSchema.optional(),
  industries: homeIndustriesSchema.optional(),
  ourStory: homeOurStorySchema.optional(),
  teamSection: sectionIntroSchema.optional(),
  seo: seoSchema.optional(),
  status: contentStatusSchema.optional(),
  serviceIds: uuidListSchema.optional(),
  caseStudyIds: uuidListSchema.optional(),
  testimonialIds: uuidListSchema.optional(),
  insightIds: uuidListSchema.optional(),
  teamIds: uuidListSchema.optional(),
}).strict();
