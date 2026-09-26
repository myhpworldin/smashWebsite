import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { TitledItemList } from "@/components/content/TitledItemList";
import styles from "./SectionIntro.module.css";

/** Service page "Our Process" section — an ordered methodology, works for any number of steps. */
export function ProcessSection({ items, headingId }: { items: ServiceDetail["process"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={styles.heading}>Our Process</h2>
        <TitledItemList items={items} showOrder />
      </Container>
    </Section>
  );
}
