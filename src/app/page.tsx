import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { homeSchemas } from "@/server/seo/page-jsonld";
import { homeMetadata } from "@/server/seo/next-metadata";
import { getHomeResponse } from "@/server/seo/request-cache";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { HomeHero } from "@/components/home/HomeHero";
import { ProofSection } from "@/components/home/ProofSection";
import { BannerCta } from "@/components/home/BannerCta";
import { BrandStory } from "@/components/home/BrandStory";
import { ServiceGroups } from "@/components/home/ServiceGroups";
import { GrowthEngine } from "@/components/home/GrowthEngine";
import { CaseStudies } from "@/components/home/CaseStudies";
import { Industries } from "@/components/home/Industries";
import { OurStory } from "@/components/home/OurStory";
import { Team } from "@/components/home/Team";
import { TalkGrowth } from "@/components/home/TalkGrowth";

// Content is edited in the CMS and must show immediately, so nothing here is prerendered.
export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return homeMetadata();
}

/**
 * The Home page as designed in Figma ("Smash Website Design", frame "Homepage 1"), rendered from the same
 * payload `GET /api/home` serves (published content only). Layout, icons and the section rhythm (100px between the
 * first blocks, 120px between the later ones) live here; every word, list and picture comes from the CMS.
 * A section the CMS has nothing for is skipped, never filled with stand-in copy.
 */
export default async function HomePage() {
  const home = await getHomeResponse();
  if (!home) {
    // The header floats over the hero on "/", so without a hero it needs a dark band behind it to stay readable.
    return (
      <section className="flex min-h-[70vh] items-center justify-center bg-navy px-4 pt-32 text-center text-white">
        <p className="font-inter text-xl">This page is not available yet.</p>
      </section>
    );
  }
  const pills = home.whySmash?.reasons.map((r) => r.title) ?? [];
  return (
    <>
      <JsonLd data={await homeSchemas()} />
      {home.hero ? <HomeHero hero={home.hero} pills={pills} /> : null}
      {home.businessProof ? <ProofSection data={home.businessProof} className="mt-16 lg:mt-[100px]" /> : null}
      {home.bannerCta ? <BannerCta data={home.bannerCta} className="mt-16 lg:mt-[100px]" /> : null}
      {home.story ? <BrandStory data={home.story} className="mt-16 lg:mt-[100px]" /> : null}
      {home.services ? <ServiceGroups data={home.services} className="mt-16 lg:mt-[120px]" /> : null}
      {home.growthEngine ? <GrowthEngine data={home.growthEngine} className="mt-16 lg:mt-[120px]" /> : null}
      {home.selectedWork ? <CaseStudies data={home.selectedWork} className="mt-16 lg:mt-[120px]" /> : null}
      {home.industries ? <Industries data={home.industries} className="mt-16 lg:mt-[120px]" /> : null}
      {home.ourStory ? <OurStory data={home.ourStory} className="mt-16 lg:mt-[120px]" /> : null}
      {home.team ? <Team data={home.team} className="mt-16 lg:mt-[120px]" /> : null}
      {home.cta ? <TalkGrowth data={home.cta} /> : null}
      <HomeAnimations />
    </>
  );
}
