import { z } from "zod";
import {
  contentStatusSchema,
  ctaSchema,
  faqListSchema,
  longText,
  seoSchema,
  shortText,
  slugSchema,
  titledCopySchema,
  titledItemSchema,
  uuidListSchema,
} from "@/server/validation/common";
import { heroSchema, toolSchema } from "@/server/validation/content";

/** A deliverable, optionally with the shorter `shortTitle` the Services page shows on its card (the Home list keeps using `title`). */
export const serviceDeliverableSchema = titledItemSchema.extend({ shortTitle: shortText.optional() });
export type ServiceDeliverable = z.infer<typeof serviceDeliverableSchema>;

export const serviceInputSchema = z.object({
  name: shortText,
  slug: slugSchema,
  shortDescription: longText,
  description: longText.optional(),
  hero: heroSchema.optional(),
  problem: titledCopySchema.optional(),
  solution: titledCopySchema.optional(),
  deliverables: z.array(serviceDeliverableSchema).max(50).optional(),
  process: z.array(titledItemSchema).max(50).optional(),
  tools: z.array(toolSchema).max(60).optional(),
  faqs: faqListSchema(50).optional(),
  cta: ctaSchema.optional(),
  seo: seoSchema.optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
  relatedCaseStudyIds: uuidListSchema.optional(),
}).strict();
export const serviceUpdateSchema = serviceInputSchema.partial();
