import Link from "next/link";
import type { CaseStudySummary } from "@/server/api/serializers";
import { Media } from "@/components/ui/Media";
import styles from "./Card.module.css";

/** Renders a `CaseStudySummary` (GET /api/work, Home "selectedWork" section) exactly as returned. */
export function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudySummary }) {
  return (
    <Link href={caseStudy.path} className={styles.card}>
      <Media media={caseStudy.image} />
      <h3 className={styles.title}>{caseStudy.title}</h3>
      <p className={styles.description}>{caseStudy.summary}</p>
      {caseStudy.client ? <p className={styles.meta}>{caseStudy.client.name}</p> : null}
      {caseStudy.keyResult ? (
        <p className={styles.meta}>
          {caseStudy.keyResult.value} — {caseStudy.keyResult.label}
        </p>
      ) : null}
    </Link>
  );
}
