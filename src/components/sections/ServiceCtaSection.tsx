import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CtaButton } from "@/components/content/CtaButton";
import sectionStyles from "./SectionIntro.module.css";

/** Service page closing CTA — a single button (service.cta), unlike Home's fuller CtaBlock. Renders nothing if no CTA is configured (never a dead button). */
export function ServiceCtaSection({ cta, headingId }: { cta: ServiceDetail["cta"]; headingId: string }) {
  if (!cta) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={sectionStyles.heading}>Let&apos;s Talk Growth</h2>
        <CtaButton cta={cta} variant="primary" />
      </Container>
    </Section>
  );
}
