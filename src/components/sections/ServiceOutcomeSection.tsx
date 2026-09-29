import type { ServiceOfferingDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import sectionStyles from "./SectionIntro.module.css";
import styles from "./ServiceOutcomeSection.module.css";

/**
 * Stage 1, Phase 1 — the closing "Built for better decisions, not vanity metrics" section (Figma node 165:306):
 * eyebrow/heading/description plus an optional highlighted principle statement on the left, a compact card grid
 * on the right. `highlight` is deliberately plain text, not a claim of any kind — content phases populate it with
 * a real, verified statement or leave it out (phase brief §29).
 */
export function ServiceOutcomeSection({ data, headingId }: { data: ServiceOfferingDetail["outcome"]; headingId: string }) {
  if (!data) return null;
  const hasCards = !!data.items?.length;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <div className={styles.wrap}>
          <div className={styles.intro}>
            {data.eyebrow ? <p className={sectionStyles.eyebrow}>{data.eyebrow}</p> : null}
            {data.heading ? <h2 id={headingId} className={sectionStyles.heading}>{data.heading}</h2> : null}
            {data.description ? <p className={sectionStyles.description}>{data.description}</p> : null}
            {data.highlight ? (
              <div className={styles.highlight}>
                <p className={styles.highlightText}>{data.highlight}</p>
              </div>
            ) : null}
          </div>
          {hasCards ? (
            <div className={styles.grid}>
              {data.items!.map((item) => (
                <div key={item.order} className={styles.card}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  {item.description ? <p className={styles.cardDescription}>{item.description}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
