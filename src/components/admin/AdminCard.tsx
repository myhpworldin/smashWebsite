import type { CSSProperties, ReactNode } from "react";
import styles from "./AdminCard.module.css";

/**
 * The one container every CRM section renders through: white, softly shadowed, 18px corners — the client portal's card. `reveal` rises
 * the card in on load (staggered by `delay`); `lift` raises it on hover, for cards that are themselves a target.
 */
export function AdminCard({ children, className, reveal, delay = 0, lift, flush }: { children: ReactNode; className?: string; reveal?: boolean; delay?: number; lift?: boolean; flush?: boolean }) {
  const cls = [styles.card, reveal ? styles.reveal : "", lift ? styles.lift : "", flush ? styles.flush : "", className ?? ""].filter(Boolean).join(" ");
  return <div className={cls} style={reveal ? ({ "--d": delay } as CSSProperties) : undefined}>{children}</div>;
}
