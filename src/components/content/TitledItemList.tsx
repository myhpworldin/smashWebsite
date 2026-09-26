import type { TitledItemPublic } from "@/server/api/sections";
import styles from "./TitledItemList.module.css";

/**
 * Shared renderer for the three sections that store {order,title,description,icon}
 * items: Growth Engine steps, Why SMASH reasons, Story supporting points
 * (HOME_PAGE_CONTRACT.md). One implementation, not three near-duplicates.
 * `icon` is not rendered: no icon set has been approved yet
 * (DESIGN_SYSTEM_MAPPING.md) — inventing an icon rendering would be a visual
 * decision this phase isn't authorized to make.
 * `variant="glass"` is the frosted-card treatment for use on the dark blue Growth Engine band.
 */
export function TitledItemList({ items, showOrder, variant = "plain" }: { items: TitledItemPublic[]; showOrder?: boolean; variant?: "plain" | "glass" }) {
  if (!items.length) return null;
  return (
    <ol className={`${styles.list} ${variant === "glass" ? styles.glass : ""}`}>
      {items.map((item) => (
        <li key={item.order} className={styles.item}>
          {showOrder ? <span className={styles.order}>{String(item.order).padStart(2, "0")}</span> : null}
          <h3 className={styles.title}>{item.title}</h3>
          {item.description ? <p className={styles.description}>{item.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}
