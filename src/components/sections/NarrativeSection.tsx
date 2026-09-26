import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import styles from "./SectionIntro.module.css";

/** Plain heading + body copy — Case Study Challenge/Strategy/Execution. Renders nothing when the field is empty. */
export function NarrativeSection({ heading, body, headingId }: { heading: string; body: string | null; headingId: string }) {
  if (!body) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={styles.heading}>{heading}</h2>
        <p className={styles.description}>{body}</p>
      </Container>
    </Section>
  );
}
