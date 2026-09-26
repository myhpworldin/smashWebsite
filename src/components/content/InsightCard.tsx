import Link from "next/link";
import type { InsightSummary } from "@/server/api/serializers";
import { Media } from "@/components/ui/Media";
import styles from "./Card.module.css";

/** Renders an `InsightSummary` (GET /api/insights, Home "insights" section) exactly as returned. */
export function InsightCard({ insight }: { insight: InsightSummary }) {
  return (
    <Link href={insight.path} className={styles.card}>
      <Media media={insight.image} />
      {insight.category ? <p className={styles.meta}>{insight.category}</p> : null}
      <h3 className={styles.title}>{insight.title}</h3>
      <p className={styles.description}>{insight.excerpt}</p>
      {insight.author ? <p className={styles.meta}>{insight.author.name}</p> : null}
    </Link>
  );
}
