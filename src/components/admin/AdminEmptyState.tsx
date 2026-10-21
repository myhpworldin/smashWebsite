import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "./AdminEmptyState.module.css";

/** The CRM's "nothing here yet" panel: a dashed card with a gently bobbing icon, a title and a sentence, and an optional action. `bare` drops the card (for use inside one). */
export function AdminEmptyState({ icon: Icon, title, message, action, bare }: { icon: LucideIcon; title?: string; message: string; action?: ReactNode; bare?: boolean }) {
  return (
    <div className={`${styles.empty}${bare ? ` ${styles.bare}` : ""}`}>
      <span className={styles.icon}><Icon size={28} strokeWidth={1.7} aria-hidden="true" /></span>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <p className={styles.message}>{message}</p>
      {action}
    </div>
  );
}
