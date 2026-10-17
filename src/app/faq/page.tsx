import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { faqPageSchemas } from "@/server/seo/page-jsonld";
import { getSiteSettings } from "@/server/seo/request-cache";
import { FAQ_CATEGORIES, FAQ_ITEMS, FAQ_PAGE } from "@/lib/faq-content";
import { ROUTES } from "@/lib/routes";
import { SheetHero } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { FaqExplorer } from "@/components/faq/FaqExplorer";

// generateMetadata, the structured data and the contact details all read SiteSettings, same as every other page.
export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.FAQ);
}

/**
 * Frequently Asked Questions, in the language of About, Contact and the Legal pages: the SheetHero, then a white sheet
 * that slides over it holding the questions (FaqExplorer — search, category navigation, accordions) and a closing card.
 * Every answer is in the server-rendered HTML (native <details>, so they also read without JavaScript), and the
 * FAQPage structured data is built from the very same list (src/lib/faq-content.ts), so the two never disagree.
 */
export default async function FaqPage() {
  const settings = await getSiteSettings().catch(() => null);
  return (
    <>
      <JsonLd data={await faqPageSchemas(FAQ_ITEMS)} />
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero id="faq-heading" title={FAQ_PAGE.title} description={FAQ_PAGE.intro} descriptionWidth="max-w-[680px]" image="/media/aboutus-banner.png" />
        <FaqExplorer categories={FAQ_CATEGORIES} email={settings?.contact?.email ?? null} phone={settings?.contact?.phone ?? null} />
      </div>
      <SheetMotion />
    </>
  );
}
