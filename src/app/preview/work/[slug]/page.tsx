import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requirePreviewAccess } from "@/server/api/preview";
import { getPublishedCaseStudyBySlug } from "@/server/modules/work/work.service";
import { getSiteContext } from "@/server/seo/request-cache";
import { caseStudyDetailDto, toPublicSeo, type CaseStudyDetail } from "@/server/api/serializers";
import { caseStudySource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import { CaseStudyHeader } from "@/components/sections/CaseStudyHeader";
import { NarrativeSection } from "@/components/sections/NarrativeSection";
import { CaseStudyResultsSection } from "@/components/sections/CaseStudyResultsSection";
import { MediaGallery } from "@/components/sections/MediaGallery";
import { CaseStudyTestimonialSection } from "@/components/sections/CaseStudyTestimonialSection";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

/** Draft preview of `/work/[slug]` — see `preview/services/[slug]/page.tsx` for the mechanism. */
export default async function CaseStudyPreviewPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);
  requirePreviewAccess(token);

  const raw = await getPublishedCaseStudyBySlug(getDb(), slug, { includeDrafts: true });
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, caseStudySource(raw)));
  const caseStudy = publicizeMedia(caseStudyDetailDto(raw, seo), ["heroImage"]) as CaseStudyDetail;

  return (
    <>
      <PreviewBanner />
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
    </>
  );
}
