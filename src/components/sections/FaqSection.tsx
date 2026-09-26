import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import sectionStyles from "./SectionIntro.module.css";
import styles from "./FaqSection.module.css";

/**
 * Renders nothing when there are no FAQs — never a fake question, never an
 * empty section (phase brief §17). `<details>`/`<summary>` is keyboard- and
 * screen-reader-accessible natively, so no JS/ARIA state management is added.
 * FAQPage schema (src/server/seo/page-jsonld.ts) is only emitted for the FAQs
 * actually rendered here — they can never disagree, since both read the same
 * `service.faqs` array.
 */
export function FaqSection({ items, headingId }: { items: ServiceDetail["faqs"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={sectionStyles.heading}>Frequently Asked Questions</h2>
        <div className={styles.list}>
          {items.map((faq) => (
            <details key={faq.question} className={styles.item}>
              <summary className={styles.question}>{faq.question}</summary>
              <p className={styles.answer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
