import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/routes";

/** Global 404. Unknown, draft and id-style slugs all reach this (URL_CONVENTIONS.md) — same page for all of them. */
export default function NotFound() {
  return (
    <Container>
      <div style={{ paddingBlock: "var(--space-9)", textAlign: "center" }}>
        <h1>Page not found</h1>
        <p>The page you&apos;re looking for doesn&apos;t exist or is no longer available.</p>
        <Button href={ROUTES.HOME}>Back to home</Button>
      </div>
    </Container>
  );
}
