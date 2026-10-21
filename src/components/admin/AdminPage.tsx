import type { ReactNode } from "react";
import styles from "./AdminPage.module.css";

/**
 * The frame every CRM page renders through — the client dashboard's: a navy hero (eyebrow, title, description, right-aligned actions,
 * an optional `meta` row) with a soft red glow and grid, then the page's content in a centered column that rides up over the hero's
 * lower edge. The first thing in `children` should therefore be a card.
 */
export function AdminPage({ eyebrow, title, description, actions, meta, children }: { eyebrow: string; title: string; description?: string; actions?: ReactNode; meta?: ReactNode; children: ReactNode }) {
  return (
    <>
      <section className={styles.hero} aria-labelledby="admin-page-title">
        <span className={styles.glow} aria-hidden="true" />
        <span className={styles.grid} aria-hidden="true" />
        <div className={styles.wrap}>
          <div className={styles.row}>
            <div className={styles.copy}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 id="admin-page-title" className={styles.title}>{title}</h1>
              {description ? <p className={styles.description}>{description}</p> : null}
              {meta ? <div className={styles.meta}>{meta}</div> : null}
            </div>
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </div>
        </div>
      </section>
      <div className={`${styles.wrap} ${styles.body}`}>{children}</div>
    </>
  );
}
