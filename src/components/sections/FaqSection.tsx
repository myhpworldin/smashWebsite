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
 * `service.faqs` array. Card styling, the eyebrow and the first-item-open default
 * match the Google Ads Figma pass (node 180:734/180:1095) — this component's only
 * callers are the service category and offering pages, so the fix applies
 * consistently across the whole service template, not just this one page.
 */
export function FaqSection({ items, headingId }: { items: ServiceDetail["faqs"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId} className="bg-soft-grey">
      <Container>
        <div className={sectionStyles.intro}>
          <p className={sectionStyles.eyebrow}>FAQ</p>
          <h2 id={headingId} className={sectionStyles.heading}>Frequently Asked Questions</h2>
        </div>
        <div className={styles.list}>
          {items.map((faq, i) => (
            <details key={faq.question} className={styles.item} open={i === 0}>
              <summary className={styles.question}>
                {faq.question}
                <span className={styles.toggle} aria-hidden="true" />
              </summary>
              <p className={styles.answer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
