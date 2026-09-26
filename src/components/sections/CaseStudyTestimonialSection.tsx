import type { CaseStudyDetail } from "@/server/api/serializers";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { TestimonialCard } from "@/components/content/TestimonialCard";

/** Only rendered when the case study has a published testimonial attached — never fabricated (phase brief §16). */
export function CaseStudyTestimonialSection({ testimonial }: { testimonial: CaseStudyDetail["testimonial"] }) {
  if (!testimonial) return null;
  return (
    <Section spacing="tight">
      <Container>
        <TestimonialCard testimonial={testimonial} />
      </Container>
    </Section>
  );
}
