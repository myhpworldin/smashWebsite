import type { ReactNode } from "react";
import styles from "./CardGrid.module.css";

/** Responsive card grid: 1 col mobile, 2 at tablet (768px), 3 at laptop (1024px) — the shared QA breakpoints. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
