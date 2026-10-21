import type { Metadata } from "next";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { termsDoc } from "@/lib/legal-content";
import { LegalDocument } from "@/components/legal/LegalDocument";

// generateMetadata and the company details in the copy both read SiteSettings, same as every other page.
// Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.TERMS);
}

export default function TermsPage() {
  return <LegalDocument build={termsDoc} />;
}
