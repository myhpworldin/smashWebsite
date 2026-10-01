import type { ServiceDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CtaButton } from "@/components/content/CtaButton";
import styles from "./ServiceCtaSection.module.css";

/**
 * Service page closing CTA — a single button (service.cta), unlike Home's fuller CtaBlock. Renders nothing if no
 * CTA is configured (never a dead button). The navy band, centred layout and body copy match the Google Ads Figma
 * pass (node 180:1034, "final-cta-section") — this component's only callers are the service category and offering
 * pages, so the fix applies consistently across the whole service template, not just this one page.
 */
export function ServiceCtaSection({ cta, headingId }: { cta: ServiceDetail["cta"]; headingId: string }) {
  if (!cta) return null;
  return (
    <Section ariaLabelledBy={headingId} className="bg-navy">
      <Container>
        <div className={styles.wrap}>
          <h2 id={headingId} className={styles.heading}>Let&apos;s Talk Growth</h2>
          <p className={styles.description}>Have a business challenge in mind? Let&apos;s talk about where you are, where you want to go, and how we can help you get there.</p>
          <CtaButton cta={cta} variant="primary" />
        </div>
      </Container>
    </Section>
  );
}
