import type { CaseStudyDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import styles from "./CaseStudyHeader.module.css";

/** Case study's H1 + client/industry meta + hero image. `title` is not optional on the model, so this is always the page's one H1. */
export function CaseStudyHeader({ caseStudy }: { caseStudy: CaseStudyDetail }) {
  return (
    <Container>
      <div className={styles.header}>
        {caseStudy.industry || caseStudy.client ? (
          <div className={styles.meta}>
            {caseStudy.client ? <span>{caseStudy.client.name}</span> : null}
            {caseStudy.industry ? <span>{caseStudy.industry}</span> : null}
          </div>
        ) : null}
        <h1 className={styles.heading}>{caseStudy.title}</h1>
        <p className={styles.summary}>{caseStudy.summary}</p>
        <Media media={caseStudy.heroImage} sizes="100vw" />
      </div>
    </Container>
  );
}
