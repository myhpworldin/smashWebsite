import type { PublicMedia } from "@/server/media/public";
import type { TitledItemPublic } from "@/server/api/sections";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import sectionStyles from "./SectionIntro.module.css";
import styles from "./ServiceSplitSection.module.css";

type SplitData = { eyebrow: string | null; heading: string | null; description: string | null; visual: PublicMedia | null };

/**
 * Stage 1, Phase 1 — the two-column "Service Introduction" / "Why This Service Matters" pattern (Figma node
 * 165:306): eyebrow + heading + body on one side, a visual on the other, `reverse` swapping which side the text
 * sits on. `takeaways`, when given, are Importance's numbered supporting points — not a card grid (that's
 * `ServiceCapabilitiesSection`), just a simple numbered list, so it doesn't reuse `TitledItemList` (a different
 * visual language for a different section of this same design).
 */
export function ServiceSplitSection({ data, headingId, reverse, takeaways }: {
  data: SplitData | null;
  headingId: string;
  reverse?: boolean;
  takeaways?: TitledItemPublic[];
}) {
  if (!data) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <div className={`${styles.wrap} ${data.visual ? "" : styles.noVisual} ${reverse ? styles.reverse : ""}`}>
          <div className={styles.copy}>
            {data.eyebrow ? <p className={sectionStyles.eyebrow}>{data.eyebrow}</p> : null}
            {data.heading ? <h2 id={headingId} className={sectionStyles.heading}>{data.heading}</h2> : null}
            {data.description ? <p className={sectionStyles.description}>{data.description}</p> : null}
            {takeaways?.length ? (
              <ol className={styles.takeaways}>
                {takeaways.map((t) => (
                  <li key={t.order} className={styles.takeaway}>
                    <span className={styles.takeawayOrder} aria-hidden="true">{String(t.order).padStart(2, "0")}</span>
                    <p className={styles.takeawayText}>{t.description || t.title}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
          {data.visual ? (
            <div className={styles.visual}>
              <Media media={data.visual} sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 size-full" />
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
