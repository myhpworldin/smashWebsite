import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requirePreviewAccess } from "@/server/api/preview";
import { getPublishedServiceBySlug } from "@/server/modules/services/services.service";
import { getSiteContext } from "@/server/seo/request-cache";
import { serviceDetailDto, toPublicSeo, type ServiceDetail } from "@/server/api/serializers";
import { serviceSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import { ServiceCategoryView } from "@/components/service/ServiceCategoryView";
import { listPublishedServiceCatalogue } from "@/server/modules/services/services.service";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Never indexable, regardless of tier — this route never goes through the normal SEO resolver at all. */
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

/**
 * Draft preview of `/services/[slug]` (Stage 4, Phase 2, phase brief §25).
 * Reuses the exact same view as the real page (`ServiceCategoryView`) — only the data
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

  // A deliverable links to its own page once it has one (published services only: a draft has no catalogue entry yet).
  const group = (await listPublishedServiceCatalogue(getDb())).find((g) => g.slug === slug);
  const cards = service.deliverables.map((d, i) => {
    const offering = group?.cards[i]?.offeringSlug;
    return { ...d, href: offering ? ROUTES.SERVICE_OFFERING(slug, offering) : null };
  });

  return (
    <>
      <PreviewBanner />
      <ServiceCategoryView service={service} cards={cards} />
    </>
  );
}
