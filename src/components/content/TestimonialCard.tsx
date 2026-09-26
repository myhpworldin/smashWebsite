import type { Testimonial } from "@/server/api/serializers";
import { Media } from "@/components/ui/Media";
import styles from "./TestimonialCard.module.css";

/** Renders a `Testimonial` (GET /api/testimonials, Home "testimonials" section) — a quote from a real client, never fabricated. */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className={styles.card}>
      <blockquote className={styles.quote}>&ldquo;{testimonial.quote}&rdquo;</blockquote>
      <figcaption className={styles.person}>
        {testimonial.photo ? <span className={styles.avatar}><Media media={testimonial.photo} className={styles.avatarImage} sizes="48px" /></span> : null}
        <span>
          <span className={styles.name}>{testimonial.personName}</span>
          {testimonial.personRole || testimonial.companyName ? (
            <span className={styles.role}>
              {[testimonial.personRole, testimonial.companyName].filter(Boolean).join(", ")}
            </span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}
