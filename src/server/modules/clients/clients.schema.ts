import { z } from "zod";
import { contentStatusSchema, longText, mediaSchema, shortText } from "@/server/validation/common";

export const clientInputSchema = z.object({
  name: shortText,
  description: longText.optional(),
  website: z.url({ protocol: /^https?$/ }).optional(),
  industry: shortText.optional(),
  logo: mediaSchema.optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
}).strict();
export const clientUpdateSchema = clientInputSchema.partial();
