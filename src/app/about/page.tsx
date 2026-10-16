import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedTeam } from "@/server/modules/team/team.service";
import { teamMemberDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { Team } from "@/components/home/Team";
import { SheetHero } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { AboutMotion } from "@/components/about/AboutMotion";
import { StoryHeading, CultureBanner, MissionVision } from "@/components/about/AboutStory";
import { OurValues } from "@/components/about/OurValues";
import { GrowthApproach } from "@/components/about/GrowthApproach";
import { Culture } from "@/components/about/Culture";
import type { TeamMember } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

/**
 * "Our Team" is switched off for now (no published members to show yet). Set this to `true` to bring it back: the section, its
 * data fetch and the empty-state fallback below are all still here, and the spacing around Culture returns to what it was.
 */
const SHOW_TEAM = false;

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.ABOUT);
}

/**
 * About Us, redesigned in the Home page's language (same hero with drifting mist, rounded sheets that slide over one
 * another, scroll-paced motion — see HomeAnimations / AboutMotion). The narrative copy below (story, mission/vision,
 * values, process, culture) is the approved Figma copy ("Smash Website Design", frame "About Us") — there is no CMS
 * model for it, the same rule Careers' "Why Smash" reasons follow (see careers/page.tsx), and the words are unchanged
 * by the redesign. "Our Team" is real, published `TeamMember` data, styled like Home's team section; a page with
 * nothing published yet still shows the rest of the (approved, non-fabricated) page. Currently switched off (`SHOW_TEAM`).
 *
 * Rhythm: the hero is sticky and the Story sheet slides over it; then white → "Built to move" → dark Mission/Vision
 * sheet → blue Values sheet → white Growth sheet, each overlapping the one before with the same rounded top, then the
 * team and culture. Home's `HomeAnimations` supplies the generic `data-reveal` fade-ups; `AboutMotion` the rest.
 */
export default async function AboutPage() {
  const rows = SHOW_TEAM ? await listPublishedTeam(getDb()) : [];
  const team = publicizeMedia(rows.map(teamMemberDto), []) as TeamMember[];
  const teamData = {
    eyebrow: "Our Team",
    heading: "Meet the Team Behind the Work",
    description: null,
    cta: null,
    items: team.map((m, i) => ({ order: i + 1, ...m })),
  };

  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero
          id="about-heading"
          title="Who we are"
          description="SMASH is a full-service growth and marketing agency shaped by operators, strategists, creatives and technologists who understand that good work has to move the business forward."
          image="/media/aboutus-banner.png"
        />
        <StoryHeading />
      </div>

      <CultureBanner />
      <MissionVision />
      <OurValues />
      <GrowthApproach />

      {SHOW_TEAM ? (
        <div className="relative bg-white">
          {team.length ? (
            <Team data={teamData} />
          ) : (
            <section aria-label="Our team" className="py-16 lg:py-[100px]">
              <EmptyState message="Our team page is being finalized — check back soon." />
            </section>
          )}
        </div>
      ) : null}

      <Culture className={SHOW_TEAM ? "py-16 lg:py-[100px]" : "pb-16 lg:pb-[120px]"} />

      <HomeAnimations />
      <SheetMotion />
      <AboutMotion />
    </>
  );
}
