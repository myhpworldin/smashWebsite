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
import { getDb } from "@/server/db/client";
import { listPublishedServiceCatalogue } from "@/server/modules/services/services.service";
import { ROUTES } from "@/lib/routes";
import { ServiceCategoryView } from "@/components/service/ServiceCategoryView";
import { ServiceEngagementTracker } from "@/components/analytics/ServiceEngagementTracker";
import { publishedSlugParams } from "@/server/seo/public-cache";

// Resolves published content by slug only. Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;
export const generateStaticParams = () => publishedSlugParams("service");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return serviceMetadata((await params).slug);
}

/**
 * A service category (`/services/growth`), in the same language as its offerings' pages: the dark hero with the
 * Three.js point field, then sheets sliding over one another. Its deliverables are the cards — each one that has its own
 * page links to it — followed by whichever of the problem / solution / process / tools / results / FAQ / CTA the service
 * actually has; a section with nothing to show is skipped, never faked.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("service", slug);
  const raw = await orNotFound(() => getService(slug));

  // Same composition GET /api/services/:slug uses (public-content.controller.ts) — the page and the API can never disagree.
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, serviceSource(raw)));
  const service = publicizeMedia(serviceDetailDto(raw, seo), ["hero"]) as ServiceDetail;

  // A deliverable links to its own page once it has one; the catalogue lists the same deliverables in the same order.
  const group = (await listPublishedServiceCatalogue(getDb())).find((g) => g.slug === slug);
  const cards = service.deliverables.map((d, i) => {
    const offering = group?.cards[i]?.offeringSlug;
    return { ...d, href: offering ? ROUTES.SERVICE_OFFERING(slug, offering) : null };
  });

  return (
    <>
      <JsonLd data={await serviceSchemas(slug)} />
      <ServiceEngagementTracker slug={slug} name={service.name} />
      <ServiceCategoryView service={service} cards={cards} />
    </>
  );
}
