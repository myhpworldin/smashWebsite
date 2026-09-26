import { z } from "zod";
import { contentStatusSchema, longText, mediaSchema, shortText } from "@/server/validation/common";

/** Public-facing fields only. No email, phone, or internal notes exist in this model. */
export const teamMemberInputSchema = z.object({
  name: shortText,
  role: shortText,
  /** Optional label the Home page groups members under (e.g. "Founders & Partners"). */
  group: shortText.optional(),
  shortBio: longText.optional(),
  photo: mediaSchema.optional(),
  displayOrder: z.number().int().optional(),
  status: contentStatusSchema.optional(),
}).strict();
export const teamMemberUpdateSchema = teamMemberInputSchema.partial();
