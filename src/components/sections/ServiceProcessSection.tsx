import type { ServiceOfferingDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { TitledItemList } from "@/components/content/TitledItemList";
import styles from "./ServiceProcessSection.module.css";

/**
 * Stage 1, Phase 1 — the navy "Useful Outputs at every stage" process band (Figma node 165:306). Reuses
 * `TitledItemList`'s existing `variant="glass"` frosted-card treatment (already built for Home's Growth Engine
 * band) rather than a second numbered-card component — the same visual language, a different page. Three stages
 * by default; the count is however many `stages` the offering provides.
 */
export function ServiceProcessSection({ data, headingId }: { data: ServiceOfferingDetail["process"]; headingId: string }) {
  if (!data?.stages?.length) return null;
  return (
    <Section ariaLabelledBy={headingId} className={styles.band}>
      <Container>
        <div className={styles.intro}>
          {data.eyebrow ? <p className={styles.eyebrow}>{data.eyebrow}</p> : null}
          {data.heading ? <h2 id={headingId} className={styles.heading}>{data.heading}</h2> : null}
          {data.description ? <p className={styles.description}>{data.description}</p> : null}
        </div>
        <TitledItemList items={data.stages} showOrder variant="glass" titleCase="none" />
      </Container>
    </Section>
  );
}
