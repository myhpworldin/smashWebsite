import type { Metadata } from "next";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { cookieDoc } from "@/lib/legal-content";
import { LegalDocument } from "@/components/legal/LegalDocument";

// generateMetadata and the company details in the copy both read SiteSettings, same as every other page.
// Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.COOKIE_POLICY);
}

export default function CookiePolicyPage() {
  return <LegalDocument build={cookieDoc} />;
}
