import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound, requirePublishedRoute } from "@/server/seo/page-resolver";
import { caseStudyMetadata } from "@/server/seo/next-metadata";
import { getCaseStudy, getSiteContext } from "@/server/seo/request-cache";
import { caseStudySchemas } from "@/server/seo/page-jsonld";
import { caseStudyDetailDto, toPublicSeo, type CaseStudyDetail } from "@/server/api/serializers";
import { caseStudySource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { buildBreadcrumbs } from "@/server/seo/breadcrumbs";
import { ROUTES } from "@/lib/routes";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { CaseStudyHeader } from "@/components/sections/CaseStudyHeader";
import { NarrativeSection } from "@/components/sections/NarrativeSection";
import { CaseStudyResultsSection } from "@/components/sections/CaseStudyResultsSection";
import { MediaGallery } from "@/components/sections/MediaGallery";
import { CaseStudyTestimonialSection } from "@/components/sections/CaseStudyTestimonialSection";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { CaseStudyViewTracker } from "@/components/analytics/CaseStudyViewTracker";

// Resolves published content by slug only.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return caseStudyMetadata((await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("caseStudy", slug);
  const raw = await orNotFound(() => getCaseStudy(slug));

  // Same composition GET /api/work/:slug uses (public-content.controller.ts)
  // — the page and the API can never disagree.
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, caseStudySource(raw)));
  const caseStudy = publicizeMedia(caseStudyDetailDto(raw, seo), ["heroImage"]) as CaseStudyDetail;

  const crumbs = buildBreadcrumbs(ROUTES.CASE_STUDY(slug), caseStudy.title);

  return (
    <>
      <JsonLd data={await caseStudySchemas(slug)} />
      <CaseStudyViewTracker slug={slug} title={caseStudy.title} industry={caseStudy.industry} />
      <Container><Breadcrumbs crumbs={crumbs} /></Container>
      <CaseStudyHeader caseStudy={caseStudy} />
      <NarrativeSection heading="The Challenge" body={caseStudy.challenge} headingId="challenge-heading" />
      <NarrativeSection heading="Our Strategy" body={caseStudy.strategy} headingId="strategy-heading" />
      <NarrativeSection heading="Execution" body={caseStudy.execution} headingId="execution-heading" />
      <CaseStudyResultsSection items={caseStudy.results} headingId="results-heading" />
      <MediaGallery items={caseStudy.media} />
      <CaseStudyTestimonialSection testimonial={caseStudy.testimonial} />
      <RelatedContentSection
        heading="Related Services"
        headingId="related-services-heading"
        items={caseStudy.relatedServices.map((s) => ({ title: s.name, slug: s.slug, path: s.path, description: s.shortDescription }))}
        sourceType="case_study"
      />
      <RelatedContentSection
        heading="Related Insights"
        headingId="related-insights-heading"
        items={caseStudy.relatedInsights.map((i) => ({ title: i.title, slug: i.slug, path: i.path, description: i.excerpt }))}
        sourceType="case_study"
      />
      {/* PAGE_CONTENT_BLUEPRINT.md §3: a fixed navigational CTA, not backend content — every case study links back to the full listing. */}
      <Section spacing="tight">
        <Container><Button href={ROUTES.WORK} variant="secondary">Explore More Work</Button></Container>
      </Section>
    </>
  );
}
