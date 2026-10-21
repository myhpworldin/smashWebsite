import styles from "./Portal.module.css";

export type PillTone = "ok" | "warn" | "bad" | "info" | "neutral";

/** A small coloured status label. The text says what it is; the colour only reinforces it. `live` makes the dot pulse (something awaiting action). */
export function StatusPill({ label, tone, live }: { label: string; tone: PillTone; live?: boolean }) {
  return <span className={styles.pill} data-tone={tone} data-live={live || undefined}><i aria-hidden="true" />{label}</span>;
}
