import type { TeamMember } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CardGrid } from "@/components/ui/CardGrid";
import { Media } from "@/components/ui/Media";
import sectionStyles from "./SectionIntro.module.css";
import cardStyles from "@/components/content/Card.module.css";

/** About page's "Our Team" — real, published `TeamMember` records only (PAGE_SPECIFICATIONS.md §3). Renders nothing when there are none yet. */
export function TeamSection({ members, headingId }: { members: TeamMember[]; headingId: string }) {
  if (!members.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={sectionStyles.heading}>Our Team</h2>
        <CardGrid>
          {members.map((m, i) => (
            <div key={`${m.name}-${i}`} className={cardStyles.card}>
              <Media media={m.photo} />
              <h3 className={cardStyles.title}>{m.name}</h3>
              <p className={cardStyles.meta}>{m.role}</p>
              {m.shortBio ? <p className={cardStyles.description}>{m.shortBio}</p> : null}
            </div>
          ))}
        </CardGrid>
      </Container>
    </Section>
  );
}
