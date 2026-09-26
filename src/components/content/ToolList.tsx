import type { PublicMedia } from "@/server/media/public";
import { Media } from "@/components/ui/Media";
import styles from "./ToolList.module.css";

type ToolItem = { name: string; logo?: PublicMedia | null; url?: string | null };

/**
 * Shared by Home's Technology & Platforms section and a Service page's Tools
 * section — both store the same {name, logo, url} shape (Tool, HOME_PAGE_CONTRACT.md
 * row 10 / CONTENT_ARCHITECTURE.md). One implementation, not two near-duplicates.
 */
export function ToolList({ items }: { items: ToolItem[] }) {
  if (!items.length) return null;
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.name} className={styles.item}>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              <Media media={item.logo ?? null} className={styles.logo} sizes="80px" />
              <span className={styles.name}>{item.name}</span>
            </a>
          ) : (
            <>
              <Media media={item.logo ?? null} className={styles.logo} sizes="80px" />
              <span className={styles.name}>{item.name}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
