import { AlertTriangle } from "lucide-react";
import { AdminButton } from "@/components/admin/AdminButton";
import styles from "./AdminErrorState.module.css";

/**
 * The one "something went wrong" panel for CRM data sections — a plain, user-facing message and an optional retry action, never the
 * underlying error detail (no stack traces, no database errors). Two retry forms because this renders from both worlds: `onRetry` for a
 * Client Component that can re-run its own fetch; `retryHref` for a Server Component page (a function prop can't cross that boundary,
 * so its "retry" is just a real link back to the same page).
 */
export function AdminErrorState({ message = "Something went wrong. Please try again.", onRetry, retryHref }: { message?: string; onRetry?: () => void; retryHref?: string }) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.icon}><AlertTriangle size={20} strokeWidth={1.9} aria-hidden="true" /></span>
      <p className={styles.message}>{message}</p>
      {onRetry ? <AdminButton variant="secondary" size="sm" onClick={onRetry}>Try again</AdminButton> : null}
      {!onRetry && retryHref ? <AdminButton variant="secondary" size="sm" href={retryHref}>Try again</AdminButton> : null}
    </div>
  );
}
