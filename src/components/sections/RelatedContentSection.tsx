import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CardGrid } from "@/components/ui/CardGrid";
import sectionStyles from "./SectionIntro.module.css";
import cardStyles from "@/components/content/Card.module.css";

type RelatedItem = { title: string; slug: string; path: string; description?: string | null };

/** Derived from the target's own canonical path prefix — never a prop every caller must remember to pass, and never wrong. */
const targetTypeOf = (path: string): string => (path.startsWith("/services/") ? "service" : path.startsWith("/work/") ? "case_study" : path.startsWith("/insights/") ? "insight" : "other");

/**
 * Shared "related X" list for content that has no image in its compact
 * reference shape — a Service's relatedInsights, a CaseStudy's
 * relatedServices/relatedInsights (API.md: these are deliberately compact
 * refs, never the full record — phase brief §16/§17). Renders nothing when
 * there's no real relationship; never invents one.
 *
 * Tracking (Stage 4, Phase 6): one generic `related_content_click` event
 * (params: `source_type`, `target_type`, `target_slug`) rather than the
 * per-page-type event names some briefs suggest (`insight_related_service_click`,
 * etc.) — same event, different context every time it's reused across Service/
 * Case-study/Insight pages; multiplying names for one action is exactly what
 * ANALYTICS_EVENTS.md's "one consistent naming convention" rule (Stage 4,
 * Phase 5) exists to prevent. `sourceType` identifies the page this section
 * renders on; the target type is derived from the link itself, never guessed.
 */
export function RelatedContentSection({ heading, headingId, items, sourceType }: { heading: string; headingId: string; items: RelatedItem[]; sourceType: "service" | "case_study" | "insight" }) {
  if (!items.length) return null;
  return (
    <Section ariaLabelledBy={headingId}>
      <Container>
        <h2 id={headingId} className={sectionStyles.heading}>{heading}</h2>
        <CardGrid>
          {items.map((item) => (
            <Link
              key={item.slug}
              href={item.path}
              className={cardStyles.card}
              data-track-event="related_content_click"
              data-track-params={JSON.stringify({ source_type: sourceType, target_type: targetTypeOf(item.path), target_slug: item.slug })}
            >
              <h3 className={cardStyles.title}>{item.title}</h3>
              {item.description ? <p className={cardStyles.description}>{item.description}</p> : null}
            </Link>
          ))}
        </CardGrid>
      </Container>
    </Section>
  );
}
