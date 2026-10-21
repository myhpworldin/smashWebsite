import type { CSSProperties } from "react";
import { AdminCard } from "./AdminCard";
import { AdminPage } from "./AdminPage";
import styles from "./AdminSkeleton.module.css";

/** A shimmering placeholder block. */
export function AdminSkeleton({ width = "100%", height = "1rem", round }: { width?: string; height?: string; round?: boolean }) {
  return <span className={`${styles.block}${round ? ` ${styles.round}` : ""}`} style={{ width, height } as CSSProperties} role="presentation" aria-hidden="true" />;
}

/** What every CRM `loading.tsx` shows: the real page hero (so nothing flashes), then optional stat tiles and rows of shimmer inside a card. */
export function AdminPageSkeleton({ eyebrow, title, tiles = 0, rows = 5, rowHeight = "3.25rem" }: { eyebrow: string; title: string; tiles?: number; rows?: number; rowHeight?: string }) {
  return (
    <AdminPage eyebrow={eyebrow} title={title}>
      <div aria-busy="true" aria-label={`Loading ${title}`} className={styles.stack}>
        {tiles ? (
          <div className={styles.tiles}>
            {Array.from({ length: tiles }, (_, i) => <div key={i} className={styles.tile}><AdminSkeleton width="45%" height="0.875rem" /><AdminSkeleton width="35%" height="1.75rem" /><AdminSkeleton width="70%" height="0.75rem" /></div>)}
          </div>
        ) : null}
        <AdminCard>
          <div className={styles.rows}>{Array.from({ length: rows }, (_, i) => <AdminSkeleton key={i} height={rowHeight} />)}</div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}
