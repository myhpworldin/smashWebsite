import type { z } from "zod";
import { LIVE_STATIC_ROUTES, ROUTES } from "@/lib/routes";
import { logger } from "@/server/lib/logger";
import { zodFields } from "@/server/lib/response";
import { ctaDto, heroDto, itemDto } from "@/server/api/sections";
import {
  caseStudySummaryDto,
  insightSummaryDto,
  serviceSummaryDto,
  teamMemberDto,
  testimonialDto,
  type PublicSeo,
} from "@/server/api/serializers";
import type { Cta, Metric } from "@/server/validation/common";
import type { Publicize } from "@/server/api/publicize-type";
import {
  heroSchema,
  homeBannerCtaSchema,
  homeCtaSchema,
  homeGrowthEngineSchema,
  homeIndustriesSchema,
  homeMetricSectionSchema,
  homeOurStorySchema,
  homeStorySchema,
  homeTechnologySchema,
  homeWhySmashSchema,
  sectionIntroSchema,
} from "@/server/validation/content";

/**
 * The Home page data contract (documented in HOME_PAGE_CONTRACT.md).
 *
 *  - One key per section, always present; a section with nothing to show is `null`.
 *  - Reusable content (services, work, testimonials, insights) arrives as
 *    card-level summaries by reference, never as copies, with canonical `path`s.
 *  - Stored section JSON is re-validated here. A section whose stored content is
 *    invalid becomes `null` (and is logged by section name) instead of breaking the page.
 *  - Field names are content names, not layout: nothing here says how to arrange anything.
 */
const parse = <S extends z.ZodType>(schema: S, value: unknown, section: string): z.output<S> | null => {
  if (value === null || value === undefined) return null;
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  logger.warn("Home section ignored: stored content is invalid", { section, fields: Object.keys(zodFields(result.error)) });
  return null;
};

type Intro = { eyebrow?: string; heading?: string; description?: string; cta?: Cta };
const intro = (s: Intro | null | undefined) => ({ eyebrow: s?.eyebrow ?? null, heading: s?.heading ?? null, description: s?.description ?? null, cta: ctaDto(s?.cta) });
const hasIntro = (s: Intro | null | undefined) => !!(s?.eyebrow || s?.heading || s?.description || s?.cta);

const metricItem = (m: Metric, i: number) => ({
  order: i + 1,
  label: m.label,
  value: m.value,
  description: m.description ?? null,
  context: m.context ?? null,
  link: m.link ?? null, // `source` is an internal verification note and is never exposed
});

const withItems = <I>(section: Intro | null | undefined, items: I[]) => (items.length ? { ...intro(section), items } : null);

const link = (path: string) => ({ path, available: LIVE_STATIC_ROUTES.includes(path) });

export type HomeSource = Awaited<ReturnType<typeof import("@/server/modules/home/home.service").getPublishedHome>>;

export function homeDto(h: HomeSource, seo: PublicSeo) {
  const hero = parse(heroSchema, h.hero, "hero");
  const businessProof = parse(homeMetricSectionSchema, h.businessProof, "businessProof");
  const story = parse(homeStorySchema, h.story, "story");
  const growth = parse(homeGrowthEngineSchema, h.growthEngine, "growthEngine");
  const results = parse(homeMetricSectionSchema, h.results, "results");
  const why = parse(homeWhySmashSchema, h.whySmash, "whySmash");
  const technology = parse(homeTechnologySchema, h.technology, "technology");
  const cta = parse(homeCtaSchema, h.cta, "cta");
  const bannerCta = parse(homeBannerCtaSchema, h.bannerCta, "bannerCta");
  const industries = parse(homeIndustriesSchema, h.industries, "industries");
  const ourStory = parse(homeOurStorySchema, h.ourStory, "ourStory");
  const teamIntro = parse(sectionIntroSchema, h.teamSection, "teamSection");
  const servicesIntro = parse(sectionIntroSchema, h.servicesSection, "servicesSection");
  const workIntro = parse(sectionIntroSchema, h.selectedWorkSection, "selectedWorkSection");
  const testimonialsIntro = parse(sectionIntroSchema, h.testimonialsSection, "testimonialsSection");
  const insightsIntro = parse(sectionIntroSchema, h.insightsSection, "insightsSection");

  return {
    seo,
    hero: heroDto(hero),
    businessProof: withItems(businessProof, (businessProof?.items ?? []).map(metricItem)),
    story:
      story && (hasIntro(story) || story.media || story.video || story.points.length || story.cta)
        ? {
            ...intro(story),
            supportingPoints: story.points.map(itemDto),
            image: story.media ?? null,
            video: story.video ?? null,
            cta: ctaDto(story.cta),
          }
        : null,
    services: withItems(servicesIntro, h.services.map((s) => ({ ...serviceSummaryDto(s), highlights: s.highlights }))),
    growthEngine: growth && (hasIntro(growth) || growth.steps.length) ? { ...intro(growth), steps: growth.steps.map(itemDto) } : null,
    selectedWork: withItems(workIntro, h.caseStudies.map(caseStudySummaryDto)),
    results: withItems(results, (results?.items ?? []).map(metricItem)),
    whySmash: why && (hasIntro(why) || why.items.length) ? { ...intro(why), reasons: why.items.map(itemDto) } : null,
    testimonials: withItems(testimonialsIntro, h.testimonials.map(testimonialDto)),
    technology: withItems(
      technology,
      (technology?.items ?? []).map((t, i) => ({ order: i + 1, name: t.name, logo: t.logo ?? null, description: t.description ?? null, url: t.url ?? null })),
    ),
    insights: withItems(insightsIntro, h.insights.map(insightSummaryDto)),
    bannerCta: bannerCta ? { heading: bannerCta.heading, description: bannerCta.description ?? null, image: bannerCta.media ?? null, primaryCta: ctaDto(bannerCta.cta), secondaryCta: ctaDto(bannerCta.secondaryCta) } : null,
    industries: withItems(industries, (industries?.items ?? []).map((t, i) => ({ order: i + 1, name: t.name }))),
    ourStory:
      ourStory && (hasIntro(ourStory) || ourStory.lead || ourStory.media || ourStory.points.length)
        ? { ...intro(ourStory), lead: ourStory.lead ?? null, image: ourStory.media ?? null, video: ourStory.video ?? null, supportingPoints: ourStory.points.map(itemDto) }
        : null,
    team: withItems(teamIntro, h.team.map((m, i) => ({ order: i + 1, ...teamMemberDto(m) }))),
    cta: cta ? { eyebrow: cta.eyebrow ?? null, heading: cta.heading, description: cta.description ?? null, primaryCta: ctaDto(cta.cta), secondaryCta: ctaDto(cta.secondaryCta) } : null,
    /** Canonical internal destinations. `available: false` means the page is not built yet; do not link to it. */
    links: {
      services: link(ROUTES.SERVICES),
      work: link(ROUTES.WORK),
      insights: link(ROUTES.INSIGHTS),
      about: link(ROUTES.ABOUT),
      contact: link(ROUTES.CONTACT),
    },
    publishedAt: h.publishedAt,
    updatedAt: h.updatedAt,
  };
}

/** Public response type for `GET /api/home`; mirrors `homeDto`'s actual return shape, media fields projected (see Publicize). */
export type HomeResponse = Publicize<ReturnType<typeof homeDto>>;
