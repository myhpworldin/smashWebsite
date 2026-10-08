import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { homeSchemas } from "@/server/seo/page-jsonld";
import { homeMetadata } from "@/server/seo/next-metadata";
import { getHomeResponse } from "@/server/seo/request-cache";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { ShowcaseSection } from "@/components/home/ShowcaseSection";
import { ManifestoSection } from "@/components/home/ManifestoSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { CaseStudiesSection } from "@/components/home/CaseStudiesSection";
import { BannerCta } from "@/components/home/BannerCta";
import { GrowthEngine } from "@/components/home/GrowthEngine";
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
 * The Home page, rendered from the same payload `GET /api/home` serves (published content only). The top of the
 * page follows the redesign (Figma "Smash Redesign" → New Homepage): hero, About, showcase band, manifesto,
 * Our Services and case studies. The sections the redesign has not reached yet keep the previous design below
 * them until it does. Every word, list and CMS picture comes from the CMS; a section with nothing to show is skipped.
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
  return (
    <>
      <JsonLd data={await homeSchemas()} />
      {home.hero ? <HeroSection hero={home.hero} /> : null}
      {home.businessProof ? <AboutSection data={home.businessProof} /> : null}
      <ShowcaseSection />
      {home.story ? <ManifestoSection data={home.story} /> : null}
      {home.services ? <ServicesSection data={home.services} /> : null}
      {home.selectedWork ? <CaseStudiesSection data={home.selectedWork} /> : null}
      {home.bannerCta ? <BannerCta data={home.bannerCta} /> : null}
      {home.growthEngine ? <GrowthEngine data={home.growthEngine} className="mt-16 lg:mt-[120px]" /> : null}
      {home.industries ? <Industries data={home.industries} className="mt-16 lg:mt-[120px]" /> : null}
      {home.ourStory ? <OurStory data={home.ourStory} className="mt-16 lg:mt-[120px]" /> : null}
      {home.team ? <Team data={home.team} className="mt-16 lg:mt-[120px]" /> : null}
      {home.cta ? <TalkGrowth data={home.cta} /> : null}
      <HomeAnimations />
    </>
  );
}
