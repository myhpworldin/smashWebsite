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
import { SheetHero } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { ServiceHeroField } from "@/components/service/ServiceHeroField";
import { ServiceMotion } from "@/components/service/ServiceMotion";
import { ServiceIntro, ServiceCapabilities, ServiceProcess, ServiceOutcome, ServiceRelated, ServiceCases } from "@/components/service/ServiceSections";
import { ServiceFaq } from "@/components/service/ServiceFaq";
import { publishedOfferingParams } from "@/server/seo/public-cache";

/**
 * An individual service (`/services/[slug]/[offeringSlug]`, e.g. `/services/growth/meta-ads`), in the Home page's
 * language: the dark hero with drifting glows and a Three.js point field, then sheets that slide over one another —
 * introduction, why it matters, capabilities, what you receive (a rail that fills as you scroll), outcomes, related
 * services, results and FAQ — each with its own GSAP motion (ServiceMotion / SheetMotion).
 * Every word still comes from the offering's content; nothing here is invented.
 *
 * Nested under its category rather than flat: the flat `/services/[slug]` route already means "category" and reusing
 * it would risk a real slug collision. The outer segment is named `[slug]`, not `[category]`, because Next.js
 * requires every dynamic segment at the same route level to share one name. `orNotFound` alone is enough here:
 * `getPublishedServiceOffering` already throws NOT_FOUND for an unpublished category or an offering with no slug.
 * There is no visible breadcrumb trail (the design is nav + title only); the BreadcrumbList structured data is unaffected.
 */
// Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;
export const generateStaticParams = () => publishedOfferingParams();

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
      <JsonLd data={await serviceOfferingSchemas(categorySlug, offeringSlug)} />
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero
          id="service-offering-heading"
          title={offering.headline}
          description={offering.shortDescription}
          image={offering.heroImage?.url}
          backdrop={<ServiceHeroField />}
          descriptionWidth="max-w-[720px]"
        />
        <ServiceIntro data={offering.introduction} headingId="introduction-heading" first />
      </div>
      <ServiceIntro data={offering.importance} headingId="importance-heading" reverse tone="grey" takeaways={offering.importance?.takeaways} />
      <ServiceCapabilities data={offering.capabilities} headingId="capabilities-heading" />
      <ServiceProcess data={offering.process} headingId="process-heading" />
      <ServiceOutcome data={offering.outcome} headingId="outcome-heading" />
      <ServiceRelated heading="Related Services" headingId="related-services-heading" items={offering.relatedServices.map((s) => ({ title: s.title, slug: s.slug, path: s.path }))} />
      <ServiceCases items={offering.relatedCaseStudies} headingId="related-work-heading" />
      <ServiceFaq items={offering.faqs} headingId="faq-heading" />
      <SheetMotion />
      <ServiceMotion />
    </>
  );
}
