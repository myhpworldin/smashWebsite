import { z } from "zod";
import {
  boundedText,
  contentStatusSchema,
  longText,
  mediaSchema,
  seoSchema,
  shortText,
  slugSchema,
  uuidListSchema,
} from "@/server/validation/common";

export const insightInputSchema = z.object({
  title: shortText,
  slug: slugSchema,
  excerpt: longText,
  /** Markdown. */
  content: boundedText(200000),
  authorId: z.uuid().nullable().optional(),
  featuredImage: mediaSchema.optional(),
  category: shortText.optional(),
  tags: z.array(shortText).max(20).optional(),
  seo: seoSchema.optional(),
  status: contentStatusSchema.optional(),
  relatedServiceIds: uuidListSchema.optional(),
  relatedCaseStudyIds: uuidListSchema.optional(),
}).strict();
export const insightUpdateSchema = insightInputSchema.partial();
