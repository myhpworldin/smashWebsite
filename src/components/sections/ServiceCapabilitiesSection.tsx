import type { ServiceOfferingDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import sectionStyles from "./SectionIntro.module.css";
import styles from "./ServiceCapabilitiesSection.module.css";

/**
 * Stage 1, Phase 1 — the centred "What business change the service supports" capability/benefit grid (Figma node
 * 165:306). Six cards by default, but the count is simply however many `items` the offering provides — never
 * hardcoded to 6 (phase brief §4).
 */
export function ServiceCapabilitiesSection({ data, headingId }: { data: ServiceOfferingDetail["capabilities"]; headingId: string }) {
  if (!data?.items?.length) return null;
  return (
    <Section ariaLabelledBy={headingId} className="bg-soft-grey">
      <Container>
        <div className={`${sectionStyles.intro} ${styles.intro}`}>
          {data.eyebrow ? <p className={sectionStyles.eyebrow}>{data.eyebrow}</p> : null}
          {data.heading ? <h2 id={headingId} className={sectionStyles.heading}>{data.heading}</h2> : null}
          {data.description ? <p className={sectionStyles.description}>{data.description}</p> : null}
        </div>
        <div className={styles.grid}>
          {data.items.map((item) => (
            <div key={item.order} className={styles.card}>
              {item.icon ? (
                <span className={styles.iconTile}>
                  <Media media={item.icon} sizes="28px" />
                </span>
              ) : null}
              <h3 className={styles.title}>{item.title}</h3>
              {item.description ? <p className={styles.description}>{item.description}</p> : null}
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
