import type { CareerWorkMode } from "@/lib/career-options";
import { ROUTES } from "@/lib/routes";
import { omit } from "@/server/db/helpers";
import { ctaDto, itemDto, heroDto } from "@/server/api/sections";
import type { ResolvedMetadata } from "@/server/seo/metadata";
import type { Cta, Media, Metric, TitledItem } from "@/server/validation/common";
import type { FaqItem, HeroContent, TitledCopy, Tool } from "@/server/validation/content";
import type { Publicize } from "@/server/api/publicize-type";

/**
 * The public representation of content. Nothing is serialised straight from a
 * database row: every field is chosen here, so a new column can never leak by
 * accident. Internal ids, display order, status and metric `source` notes are
 * never exposed; related content is referenced by slug and path only.
 */

type Ref = { slug: string; path: string };
const ref = <T extends { slug: string }>(build: (slug: string) => string, item: T): Ref => ({ slug: item.slug, path: build(item.slug) });

export const toPublicSeo = (meta: ResolvedMetadata) => omit(meta, "path");
export type PublicSeo = ReturnType<typeof toPublicSeo>;

/** Verification `source` is an internal editorial note. */
export const toPublicMetric = (m: Metric) => omit(m, "source");
const clientCard = (name: string | null, logo: Media | null) => (name ? { name, logo } : null);

/** A Service's `problem`/`solution` block — optional title, optional copy. */
const titledCopyDto = (t: TitledCopy | null | undefined) => (t ? { title: t.title ?? null, description: t.description ?? null } : null);
const toolDto = (t: Tool) => ({ name: t.name, logo: t.logo ?? null, description: t.description ?? null, url: t.url ?? null });
const faqDto = (f: FaqItem) => ({ question: f.question, answer: f.answer });

/* ── services ─────────────────────────────────────────────── */

export const serviceSummaryDto = (s: { name: string; slug: string; shortDescription: string; image: Media | null }) => ({
  name: s.name,
  ...ref(ROUTES.SERVICE, s),
  shortDescription: s.shortDescription,
  image: s.image,
});

export const serviceDetailDto = (
  s: {
    name: string; slug: string; shortDescription: string; description: string | null; hero: HeroContent | null;
    problem: TitledCopy | null; solution: TitledCopy | null; deliverables: TitledItem[]; process: TitledItem[]; tools: Tool[]; faqs: FaqItem[];
    cta: Cta | null; publishedAt: Date | null; updatedAt: Date;
    relatedCaseStudies: { title: string; slug: string; summary: string; heroImage: Media | null }[];
    relatedInsights: { title: string; slug: string; excerpt: string }[];
  },
  seo: PublicSeo,
) => ({
  name: s.name,
  ...ref(ROUTES.SERVICE, s),
  shortDescription: s.shortDescription,
  description: s.description,
  hero: heroDto(s.hero),
  problem: titledCopyDto(s.problem),
  solution: titledCopyDto(s.solution),
  deliverables: s.deliverables.map(itemDto),
  process: s.process.map(itemDto),
  tools: s.tools.map(toolDto),
  faqs: s.faqs.map(faqDto),
  cta: ctaDto(s.cta),
  relatedCaseStudies: s.relatedCaseStudies.map((c) => ({ title: c.title, ...ref(ROUTES.CASE_STUDY, c), summary: c.summary, image: c.heroImage })),
  relatedInsights: s.relatedInsights.map((i) => ({ title: i.title, ...ref(ROUTES.INSIGHT, i), excerpt: i.excerpt })),
  publishedAt: s.publishedAt,
  updatedAt: s.updatedAt,
  seo,
});

/* ── case studies ─────────────────────────────────────────── */

type CaseSummary = {
  title: string; slug: string; summary: string; industry: string | null; heroImage: Media | null; publishedAt: Date | null;
  clientName: string | null; clientLogo: Media | null; keyResult: Metric | null;
};
export const caseStudySummaryDto = (c: CaseSummary) => ({
  title: c.title,
  ...ref(ROUTES.CASE_STUDY, c),
  summary: c.summary,
  industry: c.industry,
  image: c.heroImage,
  client: clientCard(c.clientName, c.clientLogo),
  /** The headline verified result, if the case study has one. */
  keyResult: c.keyResult ? { label: c.keyResult.label, value: c.keyResult.value, description: c.keyResult.description ?? null } : null,
  publishedAt: c.publishedAt,
});

export const testimonialDto = (t: { quote: string; personName: string; personRole: string | null; companyName: string | null; photo: Media | null }) => ({
  quote: t.quote,
  personName: t.personName,
  personRole: t.personRole,
  companyName: t.companyName,
  photo: t.photo,
});

export const clientDto = (c: { name: string; description: string | null; website: string | null; industry: string | null; logo: Media | null }) => ({
  name: c.name,
  description: c.description,
  website: c.website,
  industry: c.industry,
  logo: c.logo,
});

export const caseStudyDetailDto = (
  c: {
    title: string; slug: string; summary: string; industry: string | null; challenge: string | null; strategy: string | null; execution: string | null;
    results: Metric[]; heroImage: Media | null; media: Media[]; publishedAt: Date | null; updatedAt: Date;
    client: Parameters<typeof clientDto>[0] | null;
    testimonial: Parameters<typeof testimonialDto>[0] | null;
    relatedServices: { name: string; slug: string; shortDescription: string }[];
    relatedInsights: { title: string; slug: string; excerpt: string }[];
  },
  seo: PublicSeo,
) => ({
  title: c.title,
  ...ref(ROUTES.CASE_STUDY, c),
  summary: c.summary,
  industry: c.industry,
  challenge: c.challenge,
  strategy: c.strategy,
  execution: c.execution,
  results: c.results.map(toPublicMetric),
  heroImage: c.heroImage,
  media: c.media,
  client: c.client ? clientDto(c.client) : null,
  testimonial: c.testimonial ? testimonialDto(c.testimonial) : null,
  relatedServices: c.relatedServices.map((s) => ({ name: s.name, ...ref(ROUTES.SERVICE, s), shortDescription: s.shortDescription })),
  relatedInsights: c.relatedInsights.map((i) => ({ title: i.title, ...ref(ROUTES.INSIGHT, i), excerpt: i.excerpt })),
  publishedAt: c.publishedAt,
  updatedAt: c.updatedAt,
  seo,
});

/* ── insights ─────────────────────────────────────────────── */

type InsightSummarySource = {
  title: string; slug: string; excerpt: string; featuredImage: Media | null; category: string | null; tags: string[];
  publishedAt: Date | null; updatedAt: Date; authorName: string | null; authorRole: string | null;
};
export const insightSummaryDto = (i: InsightSummarySource) => ({
  title: i.title,
  ...ref(ROUTES.INSIGHT, i),
  excerpt: i.excerpt,
  image: i.featuredImage,
  category: i.category,
  tags: i.tags,
  author: i.authorName ? { name: i.authorName, role: i.authorRole } : null,
  publishedAt: i.publishedAt,
  updatedAt: i.updatedAt,
});

export const insightDetailDto = (
  i: {
    title: string; slug: string; excerpt: string; content: string; featuredImage: Media | null; category: string | null; tags: string[];
    publishedAt: Date | null; updatedAt: Date; author: { name: string; role: string; photo: Media | null } | null;
    relatedServices: { name: string; slug: string }[]; relatedCaseStudies: { title: string; slug: string }[];
  },
  seo: PublicSeo,
) => ({
  title: i.title,
  ...ref(ROUTES.INSIGHT, i),
  excerpt: i.excerpt,
  content: i.content,
  image: i.featuredImage,
  category: i.category,
  tags: i.tags,
  author: i.author ? { name: i.author.name, role: i.author.role, photo: i.author.photo } : null,
  relatedServices: i.relatedServices.map((s) => ({ name: s.name, ...ref(ROUTES.SERVICE, s) })),
  relatedCaseStudies: i.relatedCaseStudies.map((c) => ({ title: c.title, ...ref(ROUTES.CASE_STUDY, c) })),
  publishedAt: i.publishedAt,
  updatedAt: i.updatedAt,
  seo,
});

/* ── team ─────────────────────────────────────────────────── */

export const teamMemberDto = (t: { name: string; role: string; group: string | null; shortBio: string | null; photo: Media | null }) => ({
  name: t.name,
  role: t.role,
  group: t.group,
  shortBio: t.shortBio,
  photo: t.photo,
});

/* ── site settings and home ───────────────────────────────── */

export const siteSettingsDto = (s: {
  siteName: string; siteDescription: string | null; logo: Media | null; favicon: Media | null; socialLinks: unknown[]; contact: unknown;
  defaultCta: unknown; defaultSeo: unknown; defaultOgImage: Media | null; updatedAt: Date;
}) => ({
  siteName: s.siteName,
  siteDescription: s.siteDescription,
  logo: s.logo,
  favicon: s.favicon,
  socialLinks: s.socialLinks,
  contact: s.contact,
  defaultCta: s.defaultCta,
  defaultSeo: s.defaultSeo,
  defaultOgImage: s.defaultOgImage,
  updatedAt: s.updatedAt,
});

/* ── careers ──────────────────────────────────────────────── */

export const careerSummaryDto = (c: { title: string; slug: string; summary: string; location: string | null; department: string | null; workMode: CareerWorkMode | null; employmentType: string | null; publishedAt: Date | null }) => ({
  title: c.title,
  ...ref(ROUTES.CAREER, c),
  summary: c.summary,
  location: c.location,
  department: c.department,
  workMode: c.workMode,
  employmentType: c.employmentType,
  publishedAt: c.publishedAt,
});

export const careerDetailDto = (
  c: {
    title: string; slug: string; summary: string; description: string | null; requirements: string[]; responsibilities: string[];
    location: string | null; employmentType: string | null; publishedAt: Date | null; updatedAt: Date;
  },
  seo: PublicSeo,
) => ({
  title: c.title,
  ...ref(ROUTES.CAREER, c),
  summary: c.summary,
  description: c.description,
  requirements: c.requirements,
  responsibilities: c.responsibilities,
  location: c.location,
  employmentType: c.employmentType,
  publishedAt: c.publishedAt,
  updatedAt: c.updatedAt,
  seo,
});

/**
 * Public response types, one per DTO, so a frontend consumer (or this same
 * codebase's server components) can type against the actual serialised shape
 * instead of re-declaring it. These are structural mirrors of the DTO
 * functions above, not a second source of truth: changing a *dto function
 * changes its type automatically. See CONTENT_CONTRACTS.md.
 */
export type ServiceSummary = Publicize<ReturnType<typeof serviceSummaryDto>>;
export type ServiceDetail = Publicize<ReturnType<typeof serviceDetailDto>>;
export type ServiceTitledCopy = Publicize<ReturnType<typeof titledCopyDto>>;
export type ServiceTool = Publicize<ReturnType<typeof toolDto>>;
export type ServiceFaq = ReturnType<typeof faqDto>;
export type CaseStudySummary = Publicize<ReturnType<typeof caseStudySummaryDto>>;
export type CaseStudyDetail = Publicize<ReturnType<typeof caseStudyDetailDto>>;
export type InsightSummary = Publicize<ReturnType<typeof insightSummaryDto>>;
export type InsightDetail = Publicize<ReturnType<typeof insightDetailDto>>;
export type Testimonial = Publicize<ReturnType<typeof testimonialDto>>;
export type Client = Publicize<ReturnType<typeof clientDto>>;
export type TeamMember = Publicize<ReturnType<typeof teamMemberDto>>;
export type SiteSettingsPublic = Publicize<ReturnType<typeof siteSettingsDto>>;
export type CareerSummary = Publicize<ReturnType<typeof careerSummaryDto>>;
export type CareerDetail = Publicize<ReturnType<typeof careerDetailDto>>;
