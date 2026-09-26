import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ToolList } from "@/components/content/ToolList";
import styles from "./SectionIntro.module.css";

/** Service page "Tools & Platforms" section — only real, approved tools (phase brief §15: never list a tool just because it's common). */
export function ToolsSection({ items, headingId }: { items: ServiceDetail["tools"]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId} spacing="tight">
      <Container>
        <h2 id={headingId} className={styles.heading}>Tools &amp; Platforms</h2>
        <ToolList items={items} />
      </Container>
    </Section>
  );
}
