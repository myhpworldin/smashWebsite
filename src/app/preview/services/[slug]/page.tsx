import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requirePreviewAccess } from "@/server/api/preview";
import { getPublishedServiceBySlug } from "@/server/modules/services/services.service";
import { getSiteContext } from "@/server/seo/request-cache";
import { serviceDetailDto, toPublicSeo, type ServiceDetail } from "@/server/api/serializers";
import { serviceSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { Container } from "@/components/ui/Container";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import { Hero } from "@/components/sections/Hero";
import { TitledCopySection } from "@/components/sections/TitledCopySection";
import { DeliverablesSection } from "@/components/sections/DeliverablesSection";
import { ProcessSection } from "@/components/sections/ProcessSection";
import { ToolsSection } from "@/components/sections/ToolsSection";
import { RelatedCaseStudySection } from "@/components/sections/RelatedCaseStudySection";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { ServiceCtaSection } from "@/components/sections/ServiceCtaSection";

export const dynamic = "force-dynamic";

/** Never indexable, regardless of tier — this route never goes through the normal SEO resolver at all. */
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

/**
 * Draft preview of `/services/[slug]` (Stage 4, Phase 2, phase brief §25).
 * Reuses the exact same section components as the real page — only the data
 * source differs (`includeDrafts: true`, no request-cache memoization since
 * this is a one-off admin action, not a page every visitor hits) — so what an
 * editor sees here is the real intended rendering, not an approximation.
 */
export default async function ServicePreviewPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);
  requirePreviewAccess(token);

  const raw = await getPublishedServiceBySlug(getDb(), slug, { includeDrafts: true });
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, serviceSource(raw)));
  const service = publicizeMedia(serviceDetailDto(raw, seo), ["hero"]) as ServiceDetail;

  return (
    <>
      <PreviewBanner />
      {service.hero ? <Hero hero={service.hero} /> : <Container><h1>{service.name}</h1></Container>}
      <TitledCopySection data={service.problem} heading="The Business Problem" headingId="problem-heading" />
      <TitledCopySection data={service.solution} heading="How SMASH Solves It" headingId="solution-heading" />
      <DeliverablesSection items={service.deliverables} headingId="deliverables-heading" />
      <ProcessSection items={service.process} headingId="process-heading" />
      <ToolsSection items={service.tools} headingId="tools-heading" />
      <RelatedCaseStudySection items={service.relatedCaseStudies} headingId="results-heading" />
      <RelatedContentSection
        heading="Related Insights"
        headingId="related-insights-heading"
        items={service.relatedInsights.map((i) => ({ title: i.title, slug: i.slug, path: i.path, description: i.excerpt }))}
        sourceType="service"
      />
      <FaqSection items={service.faqs} headingId="faq-heading" />
      <ServiceCtaSection cta={service.cta} headingId="cta-heading" />
    </>
  );
}
