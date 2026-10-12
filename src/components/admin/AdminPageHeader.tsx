import type { ReactNode } from "react";
import styles from "./AdminPageHeader.module.css";

/** The one page-title block every CRM page renders through (Dashboard today; Leads/Lead Detail in later phases) — title, optional description, optional right-aligned actions (e.g. a future "Add Lead" button). */
export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.heading}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
