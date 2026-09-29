import { ROUTES } from "@/lib/routes";
import type { SeoSource } from "@/server/seo/metadata";
import type { ContentStatus, Media, Seo } from "@/server/validation/common";

/**
 * Thin per-type adapters: they only say *where* each SEO input lives on a
 * record. All behaviour (fallbacks, robots, canonical) is in resolveMetadata.
 * Public DTOs carry no `status` because they are already published; raw rows do.
 */
type Common = { seo?: Seo | null; status?: ContentStatus; updatedAt?: Date | null };

export const homeSource = (h: Common & { hero?: { media?: Media } | null }): SeoSource => ({
  path: ROUTES.HOME,
  status: h.status ?? "published",
  title: "",
  isHome: true,
  image: h.hero?.media,
  seo: h.seo,
});

export const serviceSource = (s: Common & { name: string; slug: string; shortDescription: string; hero?: { media?: Media } | null }): SeoSource => ({
  path: ROUTES.SERVICE(s.slug),
  status: s.status ?? "published",
  title: s.name,
  summary: s.shortDescription,
  image: s.hero?.media,
  seo: s.seo,
});

/** Stage 1, Phase 1 — an individual service offering's own page (`/services/[category]/[slug]`). */
export const serviceOfferingSource = (
  o: Common & { title: string; slug: string; categorySlug: string; headline: string; shortDescription: string | null; visual?: Media | null },
): SeoSource => ({
  path: ROUTES.SERVICE_OFFERING(o.categorySlug, o.slug),
  status: o.status ?? "published",
  title: o.headline || o.title,
  summary: o.shortDescription ?? undefined,
  image: o.visual,
  seo: o.seo,
});

export const caseStudySource = (c: Common & { title: string; slug: string; summary: string; heroImage?: Media | null }): SeoSource => ({
  path: ROUTES.CASE_STUDY(c.slug),
  status: c.status ?? "published",
  title: c.title,
  summary: c.summary,
  image: c.heroImage,
  seo: c.seo,
});

export const insightSource = (
  i: Common & { title: string; slug: string; excerpt: string; featuredImage?: Media | null; publishedAt?: Date | null },
): SeoSource => ({
  path: ROUTES.INSIGHT(i.slug),
  type: "article",
  status: i.status ?? "published",
  title: i.title,
  summary: i.excerpt,
  image: i.featuredImage,
  seo: i.seo,
  publishedAt: i.publishedAt,
  updatedAt: i.updatedAt,
});

export const careerSource = (c: Common & { title: string; slug: string; summary: string }): SeoSource => ({
  path: ROUTES.CAREER(c.slug),
  status: c.status ?? "published",
  title: c.title,
  summary: c.summary,
  seo: c.seo,
});
