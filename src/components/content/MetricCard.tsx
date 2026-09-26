import Link from "next/link";
import styles from "./MetricCard.module.css";

/** Renders one item of a Home `businessProof`/`results` section — verified figures only; never invented here. */
export function MetricCard({ metric }: { metric: { label: string; value: string; description?: string | null; link?: string | null } }) {
  const body = (
    <div className={styles.metric}>
      <span className={styles.value}>{metric.value}</span>
      <span className={styles.label}>{metric.label}</span>
      {metric.description ? <span className={styles.label}>{metric.description}</span> : null}
    </div>
  );
  return metric.link ? <Link href={metric.link}>{body}</Link> : body;
}
