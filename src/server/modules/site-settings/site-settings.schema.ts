import { z } from "zod";
import { ctaSchema, longText, mediaSchema, seoSchema, shortText } from "@/server/validation/common";
import { siteContactSchema, socialLinkSchema } from "@/server/validation/content";

export const siteSettingsInputSchema = z.object({
  siteName: shortText,
  siteDescription: longText.optional(),
  logo: mediaSchema.optional(),
  favicon: mediaSchema.optional(),
  socialLinks: z.array(socialLinkSchema).max(20).optional(),
  contact: siteContactSchema.optional(),
  defaultCta: ctaSchema.optional(),
  defaultSeo: seoSchema.optional(),
  defaultOgImage: mediaSchema.optional(),
}).strict();
export const siteSettingsUpdateSchema = siteSettingsInputSchema.partial();
