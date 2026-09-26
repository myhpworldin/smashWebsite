import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Shared body for the three Legal pages (Privacy Policy, Terms of Use, Cookie
 * Policy — Stage 4, Phase 7). None has approved copy yet (PAGE_SPECIFICATIONS.md
 * §14, CONTENT_GAP_REPORT.md §9: "Copy Required + Approval Required" for all
 * three) and the phase brief explicitly forbids inventing legal language and
 * presenting it as approved policy. So the route is real (no 404) and clearly
 * marks itself as awaiting approved content, rather than either faking a policy
 * or leaving the link dangling — matching the honest-gap pattern already used
 * on About's "Our Story" section for a different missing content model.
 */
export function LegalPageBody({ title }: { title: string }) {
  return (
    <Section>
      <Container>
        <h1>{title}</h1>
        <EmptyState message="This page is awaiting content approved by SMASH's legal/compliance team. It is not yet published." />
        <p>
          For any question in the meantime, <Link href={ROUTES.CONTACT}>contact us</Link>.
        </p>
      </Container>
    </Section>
  );
}
