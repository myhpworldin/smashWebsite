import { z } from "zod";
import {
  contentStatusSchema,
  longText,
  mediaSchema,
  metricSchema,
  seoSchema,
  shortText,
  slugSchema,
  uuidListSchema,
} from "@/server/validation/common";

export const caseStudyInputSchema = z.object({
  title: shortText,
  slug: slugSchema,
  summary: longText,
  clientId: z.uuid().nullable().optional(),
  industry: shortText.optional(),
  challenge: longText.optional(),
  strategy: longText.optional(),
  execution: longText.optional(),
  results: z.array(metricSchema).max(24).optional(),
  heroImage: mediaSchema.optional(),
  media: z.array(mediaSchema).max(30).optional(),
  testimonialId: z.uuid().nullable().optional(),
  seo: seoSchema.optional(),
  status: contentStatusSchema.optional(),
  relatedServiceIds: uuidListSchema.optional(),
}).strict();
export const caseStudyUpdateSchema = caseStudyInputSchema.partial();
