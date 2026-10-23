import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { getDb } from "@/server/db/client";
import { listPublishedServiceCatalogue } from "@/server/modules/services/services.service";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { listingPageSchemas } from "@/server/seo/page-jsonld";
import { ROUTES } from "@/lib/routes";
import { ServicesCatalogue } from "@/components/services/ServicesCatalogue";

// Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.SERVICES);
}

/** PAGE_SPECIFICATIONS.md §4: a listing, so no Service schema of its own (only Home → Services breadcrumbs); each card links to its published service. */
export default async function ServicesPage() {
  return (
    <>
      <JsonLd data={await listingPageSchemas(ROUTES.SERVICES)} />
      <ServicesCatalogue groups={await listPublishedServiceCatalogue(getDb())} />
    </>
  );
}
