import { z } from "zod";
import { CAREER_WORK_MODES } from "@/lib/career-options";
import { contentStatusSchema, longText, seoSchema, shortText, slugSchema } from "@/server/validation/common";

export const careerInputSchema = z.object({
  title: shortText,
  slug: slugSchema,
  summary: longText,
  description: longText.optional(),
  requirements: z.array(shortText).max(50).optional(),
  responsibilities: z.array(shortText).max(50).optional(),
  location: shortText.optional(),
  /** The team the role belongs to (shown as a badge on the Careers page). */
  department: shortText.optional(),
  workMode: z.enum(CAREER_WORK_MODES).optional(),
  employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
  seo: seoSchema.optional(),
  status: contentStatusSchema.optional(),
}).strict();
export const careerUpdateSchema = careerInputSchema.partial();
