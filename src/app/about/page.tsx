import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedTeam } from "@/server/modules/team/team.service";
import { teamMemberDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { PageHero } from "@/components/layout/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { Team } from "@/components/home/Team";
import { StoryHeading, CultureBanner, MissionVision } from "@/components/about/AboutStory";
import { OurValues } from "@/components/about/OurValues";
import { GrowthApproach } from "@/components/about/GrowthApproach";
import { Culture } from "@/components/about/Culture";
import type { TeamMember } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.ABOUT);
}

/**
 * About Us (Figma "Smash Website Design", frame "About Us"). The narrative copy below (story, mission/vision,
 * values, process, culture) is the approved Figma copy — there is no CMS model for it, the same rule Careers'
 * "Why Smash" reasons follow (see careers/page.tsx). "Our Team" is real, published `TeamMember` data, styled like
 * Home's team section; a page with nothing published yet still shows the rest of the (approved, non-fabricated) page.
 */
export default async function AboutPage() {
  const rows = await listPublishedTeam(getDb());
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
      <PageHero
        id="about-heading"
        title="Who we are"
        description="SMASH is a full-service growth and marketing agency shaped by operators, strategists, creatives and technologists who understand that good work has to move the business forward."
        descriptionWidth="max-w-[760px]"
        image={{ url: "/media/aboutus-banner.png", alt: "" }}
        centerGlow={false}
      />

      <StoryHeading className="mt-16 lg:mt-[100px]" />
      <CultureBanner className="mt-10 lg:mt-[60px]" />
      <MissionVision className="mt-6 lg:mt-8" />

      <OurValues className="mt-16 lg:mt-[100px]" />

      <GrowthApproach className="py-16 lg:py-[100px]" />

      {team.length ? (
        <Team data={teamData} className="bg-linear-to-b from-neutral-100/50 to-neutral-400/10" />
      ) : (
        <section aria-label="Our team" className="py-16 lg:py-[100px]">
          <EmptyState message="Our team page is being finalized — check back soon." />
        </section>
      )}

      <Culture className="py-16 lg:py-[100px]" />
    </>
  );
}
