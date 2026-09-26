import type { CaseStudyDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Media } from "@/components/ui/Media";
import styles from "./MediaGallery.module.css";

/** Case study supporting media gallery — all below the fold, so every image lazy-loads (only the hero image is eager). */
export function MediaGallery({ items }: { items: CaseStudyDetail["media"] }) {
  if (!items.length) return null;
  return (
    <Section spacing="tight">
      <Container>
        <div className={styles.grid}>
          {items.map((item, i) => <Media key={i} media={item} sizes="(min-width: 768px) 50vw, 100vw" />)}
        </div>
      </Container>
    </Section>
  );
}
