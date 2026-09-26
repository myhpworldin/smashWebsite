"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/**
 * Route-level error boundary. Never renders `error.message`/stack — the
 * backend already logs the real diagnostic server-side (SECURITY.md); this
 * only gives the visitor a safe, generic recovery path (phase brief §24).
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container>
      <div style={{ paddingBlock: "var(--space-9)", textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>We couldn&apos;t load this page. Please try again.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </Container>
  );
}
