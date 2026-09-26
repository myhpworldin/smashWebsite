import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedTeam } from "@/server/modules/team/team.service";
import { teamMemberDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamSection } from "@/components/sections/TeamSection";
import type { TeamMember } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.ABOUT);
}

/**
 * PAGE_SPECIFICATIONS.md §3: About's H2s are "Our Story / Our Team / Careers
 * CTA". "Our Story" (company history/mission/culture narrative) has no
 * content model and no approved copy yet — Development Status there reads
 * "Missing Data... TeamMember alone is insufficient" — so that section is
 * genuinely not built, not merely hidden; inventing company-history copy
 * would violate the project's anti-fabrication rule (phase brief §6). "Our
 * Team" uses real, published `TeamMember` records (a content type that does
 * exist), and the Careers CTA is the fixed navigational CTA the spec calls for.
 */
export default async function AboutPage() {
  const rows = await listPublishedTeam(getDb());
  const team = publicizeMedia(rows.map(teamMemberDto), []) as TeamMember[];

  return (
    <>
      <Section>
        <Container>
          <h1>About SMASH</h1>
          {team.length ? null : <EmptyState message="Our company story is being finalized — check back soon." />}
        </Container>
      </Section>
      <TeamSection members={team} headingId="team-heading" />
      {/* Fixed navigational CTAs (PAGE_CONTENT_BLUEPRINT.md §3), matching the spec's Primary/Secondary CTA. */}
      <Section spacing="tight">
        <Container>
          <Button href={ROUTES.WORK}>Explore Our Work</Button>{" "}
          <Button href={ROUTES.CAREERS} variant="secondary">View Careers</Button>
        </Container>
      </Section>
    </>
  );
}
