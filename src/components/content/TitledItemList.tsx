import type { TitledItemPublic } from "@/server/api/sections";
import styles from "./TitledItemList.module.css";

/**
 * Shared renderer for the sections that store {order,title,description,icon,bullets}
 * items: Growth Engine steps, Why SMASH reasons, Story supporting points
 * (HOME_PAGE_CONTRACT.md), and service Process stages. One implementation, not several near-duplicates.
 * `icon` is not rendered: no icon set has been approved yet
 * (DESIGN_SYSTEM_MAPPING.md) — inventing an icon rendering would be a visual
 * decision this phase isn't authorized to make.
 * `variant="glass"` is the frosted-card treatment for use on the dark blue Growth Engine band; its title is
 * uppercase by default (Home's Growth Engine spec) — `titleCase="none"` opts a caller out (service Process stage
 * titles are sentence-case phrases in Figma, e.g. "Strategy foundation", not short uppercase labels).
 * `bullets`, when given, renders as a short list instead of `description`'s single paragraph (Google Ads Figma
 * pass, node 180:734 — a service Process stage's outputs, not prose); existing callers with only `description` are unaffected.
 */
export function TitledItemList({ items, showOrder, variant = "plain", titleCase }: {
  items: TitledItemPublic[];
  showOrder?: boolean;
  variant?: "plain" | "glass";
  titleCase?: "none";
}) {
  if (!items.length) return null;
  return (
    <ol className={`${styles.list} ${variant === "glass" ? styles.glass : ""} ${titleCase === "none" ? styles.titleCaseNone : ""}`}>
      {items.map((item) => (
        <li key={item.order} className={styles.item}>
          {showOrder ? <span className={styles.order}>{String(item.order).padStart(2, "0")}</span> : null}
          <h3 className={styles.title}>{item.title}</h3>
          {item.bullets?.length ? (
            <ul className={styles.bullets}>
              {item.bullets.map((bullet) => (
                <li key={bullet} className={styles.bullet}>
                  <span aria-hidden="true">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : item.description ? (
            <p className={styles.description}>{item.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
