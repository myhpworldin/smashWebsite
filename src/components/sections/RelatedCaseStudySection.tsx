import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CardGrid } from "@/components/ui/CardGrid";
import styles from "./SectionIntro.module.css";
import cardStyles from "@/components/content/Card.module.css";
import { Media } from "@/components/ui/Media";
import Link from "next/link";

/**
 * Service page "Results / Case Study" section. `relatedCaseStudies` is already
 * a compact summary from the API (title/slug/path/summary/image) — never the
 * full case study payload (phase brief §16); the real proof lives at
 * `/work/[slug]`, which this links to.
 */
export function RelatedCaseStudySection({ items, headingId }: { items: ServiceDetail["relatedCaseStudies"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={styles.heading}>Results</h2>
        <CardGrid>
          {items.map((item) => (
            <Link key={item.slug} href={item.path} className={cardStyles.card}>
              <Media media={item.image} />
              <h3 className={cardStyles.title}>{item.title}</h3>
              <p className={cardStyles.description}>{item.summary}</p>
            </Link>
          ))}
        </CardGrid>
      </Container>
    </Section>
  );
}
