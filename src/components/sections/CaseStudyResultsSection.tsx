import type { CaseStudyDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CardGrid } from "@/components/ui/CardGrid";
import { MetricCard } from "@/components/content/MetricCard";
import styles from "@/components/sections/SectionIntro.module.css";

/** Case study "Results" section — every metric already carries a verified `source` before publish (enforced server-side, never exposed). */
export function CaseStudyResultsSection({ items, headingId }: { items: CaseStudyDetail["results"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={styles.heading}>Results</h2>
        <CardGrid>
          {items.map((metric, i) => <MetricCard key={i} metric={metric} />)}
        </CardGrid>
      </Container>
    </Section>
  );
}
