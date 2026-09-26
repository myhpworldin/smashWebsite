import type { Metadata } from "next";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { LegalPageBody } from "@/components/content/LegalPageBody";

// generateMetadata reads SiteSettings (staticPageMetadata → getSiteContext), same as every other page.
export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.PRIVACY_POLICY);
}

export default function PrivacyPolicyPage() {
  return <LegalPageBody title="Privacy Policy" />;
}
