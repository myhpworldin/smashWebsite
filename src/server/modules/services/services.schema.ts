import { z } from "zod";
import {
  contentStatusSchema,
  ctaSchema,
  faqListSchema,
  longText,
  mediaSchema,
  seoSchema,
  shortText,
  slugSchema,
  titledCopySchema,
  titledItemSchema,
  uuidListSchema,
} from "@/server/validation/common";
import { heroSchema, sectionIntroSchema, toolSchema } from "@/server/validation/content";

/**
 * Stage 1, Phase 1 — Service Detail Foundation (Figma node 165:306). A deliverable's own detail page, entirely
 * optional and additive: existing deliverables with no `offering` are unaffected, keep rendering on the category
 * page exactly as before, and simply have no individual route yet. A deliverable becomes individually routable
 * (`/services/[category-slug]/[offering.slug]`) the moment an editor gives it a slug — no separate "published"
 * flag is needed, matching how the rest of this field is already all-optional.
 * Reuses `sectionIntroSchema` (eyebrow/heading/description) for every text block and `titledItemSchema` for every
 * card/list item, rather than inventing a parallel set of content shapes (Phase 0 audit §22 "do not over-engineer").
 */
export const serviceOfferingSchema = z.object({
  slug: slugSchema.optional(),
  headline: shortText.optional(),
  /** "Service Introduction" — two-column: eyebrow/heading/description (left) + an optional visual (right). Never a fabricated dashboard mockup (phase brief §29) — a real image/screenshot only. */
  introduction: sectionIntroSchema.extend({ visual: mediaSchema.optional() }).optional(),
  /** "Why This Service Matters" — mirrored two-column, plus optional numbered takeaway points. */
  importance: sectionIntroSchema.extend({ visual: mediaSchema.optional(), takeaways: z.array(titledItemSchema).max(6).optional() }).optional(),
  /** The six-card (default) capability/benefit grid. Count is whatever the array holds — not hardcoded to 6. */
  capabilities: sectionIntroSchema.extend({ items: z.array(titledItemSchema).max(9).optional() }).optional(),
  /** The navy "Useful Outputs" process band — three stages (default), each a title + description. */
  process: sectionIntroSchema.extend({ stages: z.array(titledItemSchema).max(6).optional() }).optional(),
  /** The closing "Outcome" section — an optional highlighted principle statement plus a smaller card grid. */
  outcome: sectionIntroSchema.extend({ highlight: shortText.optional(), items: z.array(titledItemSchema).max(6).optional() }).optional(),
  /** Sibling services within the same category — a simple slug list, not a recommendation engine. */
  relatedServiceSlugs: z.array(shortText).max(6).optional(),
  relatedCaseStudyIds: uuidListSchema.optional(),
  faqs: faqListSchema(20).optional(),
  cta: ctaSchema.optional(),
  seo: seoSchema.optional(),
}).strict();
export type ServiceOffering = z.infer<typeof serviceOfferingSchema>;

/** A deliverable, optionally with the shorter `shortTitle` the Services page shows on its card (the Home list keeps using `title`), and optionally its own detail page (`offering`). */
export const serviceDeliverableSchema = titledItemSchema.extend({ shortTitle: shortText.optional(), offering: serviceOfferingSchema.optional() });
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
