import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedServiceCatalogue } from "@/server/modules/services/services.service";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { ServicesCatalogue } from "@/components/services/ServicesCatalogue";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.SERVICES);
}

/** PAGE_SPECIFICATIONS.md §4: a listing, so no page-level schema; each card links to its published service. */
export default async function ServicesPage() {
  return <ServicesCatalogue groups={await listPublishedServiceCatalogue(getDb())} />;
}
