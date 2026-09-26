import { z } from "zod";
import {
  ctaSchema,
  faqSchema,
  linkTarget,
  longText,
  mediaSchema,
  videoSchema,
  metricSchema,
  shortText,
  titledCopySchema,
  titledItemSchema,
} from "@/server/validation/common";

/* Embedded content shapes shared by Service and HomePage. Semantic content only. */

export const heroSchema = z.object({
  heading: shortText,
  supportingCopy: longText.optional(),
  label: shortText.optional(),
  /** [0] is the primary action, [1] the optional secondary one. */
  ctas: z.array(ctaSchema).max(2).default([]),
  media: mediaSchema.optional(),
  video: videoSchema.optional(),
});
export type HeroContent = z.infer<typeof heroSchema>;

export const toolSchema = z.object({
  name: shortText,
  logo: mediaSchema.optional(),
  description: longText.optional(),
  /** The platform's own website, if it is useful to link to. */
  url: z.url({ protocol: /^https$/ }).optional(),
});
export type Tool = z.infer<typeof toolSchema>;

export type TitledCopy = z.infer<typeof titledCopySchema>;
export type FaqItem = z.infer<typeof faqSchema>;

/* Home page sections (order in the document is not stored; the frontend owns layout). */

/** Eyebrow, heading and copy shared by every Home section; `cta` is the optional section-level action (e.g. "View all"). */
export const sectionIntroSchema = z.object({ eyebrow: shortText.optional(), heading: shortText.optional(), description: longText.optional(), cta: ctaSchema.optional() });
export type HomeSectionIntro = z.infer<typeof sectionIntroSchema>;

export const homeMetricSectionSchema = sectionIntroSchema.extend({ items: z.array(metricSchema).max(24).default([]) });
export type HomeMetricSection = z.infer<typeof homeMetricSectionSchema>;

export const homeStorySchema = sectionIntroSchema.extend({
  media: mediaSchema.optional(),
  video: videoSchema.optional(),
  points: z.array(titledItemSchema).max(24).default([]),
  cta: ctaSchema.optional(),
});
export type HomeStory = z.infer<typeof homeStorySchema>;

export const homeGrowthEngineSchema = sectionIntroSchema.extend({ steps: z.array(titledItemSchema).max(24).default([]) });
export type HomeGrowthEngine = z.infer<typeof homeGrowthEngineSchema>;

export const homeWhySmashSchema = sectionIntroSchema.extend({ items: z.array(titledItemSchema).max(24).default([]) });
export type HomeWhySmash = z.infer<typeof homeWhySmashSchema>;

export const homeTechnologySchema = sectionIntroSchema.extend({ items: z.array(toolSchema).max(60).default([]) });
export type HomeTechnology = z.infer<typeof homeTechnologySchema>;

/** Second story block ("Our Story"): the story shape plus a short lead line shown above the body. */
export const homeOurStorySchema = homeStorySchema.extend({ lead: shortText.optional() });
export type HomeOurStory = z.infer<typeof homeOurStorySchema>;

/** Sectors the business serves: plain names, in display order. */
export const homeIndustriesSchema = sectionIntroSchema.extend({ items: z.array(z.object({ name: shortText })).max(40).default([]) });
export type HomeIndustries = z.infer<typeof homeIndustriesSchema>;

/** `cta` is the primary action; `secondaryCta` is optional. */
export const homeCtaSchema = z.object({ eyebrow: shortText.optional(), heading: shortText, description: longText.optional(), cta: ctaSchema, secondaryCta: ctaSchema.optional() });
export type HomeCtaSection = z.infer<typeof homeCtaSchema>;

/** A call to action with its own photo (the mid-page banner). */
export const homeBannerCtaSchema = homeCtaSchema.extend({ media: mediaSchema.optional() });
export type HomeBannerCta = z.infer<typeof homeBannerCtaSchema>;

/* Site settings */

export const socialLinkSchema = z.object({ platform: shortText, url: linkTarget });
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const siteContactSchema = z.object({
  email: z.email().optional(),
  phone: shortText.optional(),
  /**
   * Stage 6, Phase 4: official WhatsApp click-to-chat, explicitly authorized by
   * this phase (unlike earlier phases, which correctly declined to invent this
   * field speculatively — see CONTENT_GAP_REPORT.md §8, unchanged since Stage 3
   * Phase 7). Stored as an ordinary phone number (any human-readable format);
   * `lib/whatsapp.ts` strips everything but digits to build the actual `wa.me`
   * link, so an editor never has to enter a pre-formatted URL.
   */
  whatsapp: shortText.optional(),
  address: longText.optional(),
});
export type SiteContact = z.infer<typeof siteContactSchema>;
