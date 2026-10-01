import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound } from "@/server/seo/page-resolver";
import { serviceOfferingMetadata } from "@/server/seo/next-metadata";
import { getServiceOffering, getSiteContext } from "@/server/seo/request-cache";
import { serviceOfferingSchemas } from "@/server/seo/page-jsonld";
import { serviceOfferingDetailDto, toPublicSeo, type ServiceOfferingDetail } from "@/server/api/serializers";
import { serviceOfferingSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { PageHero } from "@/components/layout/PageHero";
import { ServiceSplitSection } from "@/components/sections/ServiceSplitSection";
import { ServiceCapabilitiesSection } from "@/components/sections/ServiceCapabilitiesSection";
import { ServiceProcessSection } from "@/components/sections/ServiceProcessSection";
import { ServiceOutcomeSection } from "@/components/sections/ServiceOutcomeSection";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";
import { RelatedCaseStudySection } from "@/components/sections/RelatedCaseStudySection";
import { FaqSection } from "@/components/sections/FaqSection";
import { ServiceCtaSection } from "@/components/sections/ServiceCtaSection";

/**
 * Stage 1, Phase 1 — Service Detail Foundation (Figma node 165:306), reusable across all 19 future services.
 * Nested under its category (`/services/[slug]/[offeringSlug]`, e.g. `/services/growth/meta-ads`) rather than
 * flat: the flat `/services/[slug]` route already means "category" in this codebase, and reusing it here would
 * risk a real slug collision with the 4 existing category routes sharing this same `services` collection (Phase 0
 * audit §19's flagged routing risk). The outer segment is named `[slug]`, not `[category]`, because Next.js
 * requires every dynamic segment at the same route level to share one name — it already conflicted with the
 * sibling `services/[slug]/page.tsx` category route until renamed to match (found live in this phase: `next dev`
 * refused to start at all with two differently-named segments in the same position). `requirePublishedRoute`'s
 * redirect-aware resolver isn't used here (it assumes a one-level content path); `orNotFound` alone is sufficient,
 * since `getPublishedServiceOffering` already throws NOT_FOUND for an unpublished category or an offering with no slug.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; offeringSlug: string }> }): Promise<Metadata> {
  const { slug, offeringSlug } = await params;
  return serviceOfferingMetadata(slug, offeringSlug);
}

export default async function Page({ params }: { params: Promise<{ slug: string; offeringSlug: string }> }) {
  const { slug: categorySlug, offeringSlug } = await params;
  const raw = await orNotFound(() => getServiceOffering(categorySlug, offeringSlug));

  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, serviceOfferingSource({
    title: raw.title, slug: raw.slug, categorySlug: raw.category.slug, headline: raw.headline,
    shortDescription: raw.shortDescription, visual: raw.offering.introduction?.visual, seo: raw.offering.seo, updatedAt: raw.updatedAt,
  })));
  const offering = publicizeMedia(serviceOfferingDetailDto(raw, seo), ["introduction", "importance", "heroImage"]) as ServiceOfferingDetail;

  return (
    <>
      {/* No visible breadcrumb trail: the approved Figma hero (node 165:306) is nav + centred title only —
          confirmed against the actual design after an earlier attempt to fit breadcrumbs inside the hero
          deviated from it. The BreadcrumbList structured data below is unaffected; it's invisible markup and
          still gives search engines the same Home → Category → Service hierarchy. */}
      <JsonLd data={await serviceOfferingSchemas(categorySlug, offeringSlug)} />
      <PageHero id="service-offering-heading" title={offering.headline} image={offering.heroImage ?? undefined} />
      <ServiceSplitSection data={offering.introduction} headingId="introduction-heading" />
      <ServiceSplitSection data={offering.importance} headingId="importance-heading" reverse takeaways={offering.importance?.takeaways} />
      <ServiceCapabilitiesSection data={offering.capabilities} headingId="capabilities-heading" />
      <ServiceProcessSection data={offering.process} headingId="process-heading" />
      <ServiceOutcomeSection data={offering.outcome} headingId="outcome-heading" />
      <RelatedContentSection
        heading="Related Services"
        headingId="related-services-heading"
        items={offering.relatedServices.map((s) => ({ title: s.title, slug: s.slug, path: s.path }))}
        sourceType="service"
      />
      <RelatedCaseStudySection items={offering.relatedCaseStudies} headingId="related-work-heading" />
      <FaqSection items={offering.faqs} headingId="faq-heading" />
      <ServiceCtaSection cta={offering.cta} headingId="cta-heading" />
    </>
  );
}
