import { z } from "zod";
import { contentStatusSchema, longText, mediaSchema, shortText } from "@/server/validation/common";

export const testimonialInputSchema = z.object({
  quote: longText,
  personName: shortText,
  personRole: shortText.optional(),
  companyName: shortText.optional(),
  clientId: z.uuid().nullable().optional(),
  photo: mediaSchema.optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
}).strict();
export const testimonialUpdateSchema = testimonialInputSchema.partial();
