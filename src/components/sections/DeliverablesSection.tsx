import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { TitledItemList } from "@/components/content/TitledItemList";
import styles from "./SectionIntro.module.css";

/** Service page "What We Deliver" section — fixed structural heading, real deliverables from the content model. */
export function DeliverablesSection({ items, headingId }: { items: ServiceDetail["deliverables"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={styles.heading}>What We Deliver</h2>
        <TitledItemList items={items} />
      </Container>
    </Section>
  );
}
