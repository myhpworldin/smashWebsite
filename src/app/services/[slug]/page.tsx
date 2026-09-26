import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound, requirePublishedRoute } from "@/server/seo/page-resolver";
import { serviceMetadata } from "@/server/seo/next-metadata";
import { getService, getSiteContext } from "@/server/seo/request-cache";
import { serviceSchemas } from "@/server/seo/page-jsonld";
import { serviceDetailDto, toPublicSeo, type ServiceDetail } from "@/server/api/serializers";
import { serviceSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { buildBreadcrumbs } from "@/server/seo/breadcrumbs";
import { ROUTES } from "@/lib/routes";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Hero } from "@/components/sections/Hero";
import { TitledCopySection } from "@/components/sections/TitledCopySection";
import { DeliverablesSection } from "@/components/sections/DeliverablesSection";
import { ProcessSection } from "@/components/sections/ProcessSection";
import { ToolsSection } from "@/components/sections/ToolsSection";
import { RelatedCaseStudySection } from "@/components/sections/RelatedCaseStudySection";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { ServiceCtaSection } from "@/components/sections/ServiceCtaSection";
import { ServiceEngagementTracker } from "@/components/analytics/ServiceEngagementTracker";

// Resolves published content by slug only.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return serviceMetadata((await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("service", slug);
  const raw = await orNotFound(() => getService(slug));

  // Same composition GET /api/services/:slug uses (public-content.controller.ts)
  // — the page and the API can never disagree.
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, serviceSource(raw)));
  const service = publicizeMedia(serviceDetailDto(raw, seo), ["hero"]) as ServiceDetail;

  const crumbs = buildBreadcrumbs(ROUTES.SERVICE(slug), service.name);

  return (
    <>
      <JsonLd data={await serviceSchemas(slug)} />
      <ServiceEngagementTracker slug={slug} name={service.name} />
      <Container><Breadcrumbs crumbs={crumbs} /></Container>
      {/* Every indexable page needs exactly one H1; `hero` is optional content, `name` is not — fall back to it so a service with no hero configured is never headingless. */}
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
