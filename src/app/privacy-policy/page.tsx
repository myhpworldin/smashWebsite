import type { Metadata } from "next";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { privacyDoc } from "@/lib/legal-content";
import { LegalDocument } from "@/components/legal/LegalDocument";

// generateMetadata and the company details in the copy both read SiteSettings, same as every other page.
export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.PRIVACY_POLICY);
}

export default function PrivacyPolicyPage() {
  return <LegalDocument build={privacyDoc} />;
}
