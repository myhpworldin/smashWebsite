import type { LucideIcon } from "lucide-react";
import styles from "./EmptyState.module.css";

/**
 * The one place a "nothing to show" state is rendered (phase brief §25). The
 * default message is deliberately neutral — never invented marketing copy;
 * a page may pass its own approved wording once content/design defines it.
 * `icon` is optional and additive (CRM redesign) — every pre-existing caller omits it and renders
 * exactly as before.
 */
export function EmptyState({ message = "Nothing to show here yet.", icon: Icon }: { message?: string; icon?: LucideIcon }) {
  return (
    <div className={styles.empty}>
      {Icon ? <Icon size={28} strokeWidth={1.5} className={styles.icon} aria-hidden="true" /> : null}
      <p className={styles.message}>{message}</p>
    </div>
  );
}
