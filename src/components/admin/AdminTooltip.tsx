import type { ReactNode } from "react";
import styles from "./AdminTooltip.module.css";

/**
 * A pure-CSS tooltip for icon-only controls (e.g. the collapsed sidebar's nav items, the table
 * overflow trigger). The wrapped control must already carry its own accessible name
 * (`aria-label`) — this is a supplementary visual hint shown on hover/focus, not the a11y label.
 */
export function AdminTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className={styles.root}>
      {children}
      <span className={styles.bubble} role="presentation">
        {label}
      </span>
    </span>
  );
}
