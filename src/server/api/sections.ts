import type { Cta, TitledItem } from "@/server/validation/common";
import type { HeroContent } from "@/server/validation/content";
import type { Publicize } from "@/server/api/publicize-type";

/**
 * Small semantic mappers shared by the Home page and service pages. Absent
 * scalars are `null` (never omitted) so the frontend can rely on a fixed shape.
 * Nothing here knows about layout.
 */

/** `external` tells the frontend whether to use its router (internal path) or a plain link (https URL). */
export const ctaDto = (c: Cta | null | undefined) => (c ? { label: c.label, target: c.target, external: c.target.startsWith("https://") } : null);

/** 1-based `order` makes sequence explicit for any layout. */
export const itemDto = (item: TitledItem, index: number) => ({
  order: index + 1,
  title: item.title,
  description: item.description ?? null,
  icon: item.icon ?? null,
});

/** Public shape of one Growth Engine step / Why SMASH reason / Story supporting point, media fields projected. */
export type TitledItemPublic = Publicize<ReturnType<typeof itemDto>>;
/** Public shape of a resolved `Cta`. */
export type CtaPublic = ReturnType<typeof ctaDto>;

/**
 * The one Hero shape (Home and service pages). `heading` is the page's primary
 * heading and the only one; other section `heading`s are secondary headings.
 */
export const heroDto = (h: HeroContent | null | undefined) =>
  h
    ? {
        eyebrow: h.label ?? null,
        heading: h.heading,
        supportingText: h.supportingCopy ?? null,
        primaryCta: ctaDto(h.ctas?.[0]),
        secondaryCta: ctaDto(h.ctas?.[1]),
        image: h.media ?? null,
        video: h.video ?? null,
      }
    : null;

/** Public shape of a Hero section (Home or a Service page), media fields projected. */
export type HeroSection = Publicize<ReturnType<typeof heroDto>>;
