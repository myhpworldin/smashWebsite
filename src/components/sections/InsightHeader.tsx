import type { InsightDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import styles from "./CaseStudyHeader.module.css";

const formatDate = (value: Date | null) => (value ? value.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null);

/** Insight article's H1 + category/author/date meta + featured image. Mirrors `CaseStudyHeader`'s shape and reuses its CSS module — same meta-row pattern, different fields. */
export function InsightHeader({ insight }: { insight: InsightDetail }) {
  const published = formatDate(insight.publishedAt);
  return (
    <Container>
      <div className={styles.header}>
        {insight.category || insight.author || published ? (
          <div className={styles.meta}>
            {insight.category ? <span>{insight.category}</span> : null}
            {insight.author ? <span>{insight.author.name}</span> : null}
            {published ? <time dateTime={insight.publishedAt!.toISOString()}>{published}</time> : null}
          </div>
        ) : null}
        <h1 className={styles.heading}>{insight.title}</h1>
        <p className={styles.summary}>{insight.excerpt}</p>
        <Media media={insight.image} sizes="100vw" />
      </div>
    </Container>
  );
}
