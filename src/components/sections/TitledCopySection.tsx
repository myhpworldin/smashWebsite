import type { ServiceTitledCopy } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import styles from "./SectionIntro.module.css";

/**
 * Renders a Service's `problem`/`solution` block. The H2 wording ("The
 * Business Problem", "How SMASH Solves It") is fixed page structure, not CMS
 * content — approved in PAGE_SPECIFICATIONS.md §5 as part of the reusable
 * service template, applied identically to every service. `data.title`, if an
 * editor set one, is optional emphasis text above the body copy.
 */
export function TitledCopySection({ data, heading, headingId }: { data: ServiceTitledCopy; heading: string; headingId: string }) {
  if (!data) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={styles.heading}>{heading}</h2>
        {data.title ? <p>{data.title}</p> : null}
        {data.description ? <p className={styles.description}>{data.description}</p> : null}
      </Container>
    </Section>
  );
}
