import type { ReactNode } from "react";
import styles from "./AdminCard.module.css";

/** The one bordered-card container every CRM section renders through (Phase 4 brief, Step 13). Restrained border, no shadow — matches the public site's own "restrained borders" language rather than inventing a new elevation system. */
export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `${styles.card} ${className}` : styles.card}>{children}</div>;
}
