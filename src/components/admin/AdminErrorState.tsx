import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./AdminErrorState.module.css";

/**
 * The one "something went wrong" panel for CRM data sections (Phase 4 brief, Step 18) — a plain,
 * user-facing message and an optional retry action, never the underlying error detail (no stack
 * traces, no database errors). Two retry forms because this renders from both worlds: `onRetry` for a
 * Client Component that can re-run its own fetch; `retryHref` for a Server Component page (e.g. the
 * Phase 5 Leads list, which fetches on the server — a function prop can't cross that boundary, so its
 * "retry" is just a real link back to the same page).
 */
export function AdminErrorState({ message = "Something went wrong. Please try again.", onRetry, retryHref }: { message?: string; onRetry?: () => void; retryHref?: string }) {
  return (
    <div className={styles.error} role="alert">
      <AlertTriangle size={20} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
      {onRetry ? <Button type="button" variant="secondary" onClick={onRetry}>Try again</Button> : null}
      {!onRetry && retryHref ? <Button href={retryHref} variant="secondary">Try again</Button> : null}
    </div>
  );
}
