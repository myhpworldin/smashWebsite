import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import type { ClientCurrency } from "@/lib/client-options";
import { CountUp } from "./CountUp";
import styles from "./Dashboard.module.css";

const ACCENT = { blue: styles.accentBlue, green: styles.accentGreen, red: styles.accentRed, navy: styles.accentNavy } as const;

/** One headline figure: icon, label, a count-up value and a one-line note. Lifts and draws an accent bar on hover. */
export function StatTile({ label, value, kind = "count", currency, note, icon: Icon, accent, delay = 0 }: {
  label: string; value: number; kind?: "count" | "money"; currency: ClientCurrency; note?: string; icon: ComponentType<LucideProps>; accent: keyof typeof ACCENT; delay?: number;
}) {
  return (
    <div className={`${styles.tile} ${ACCENT[accent]} ${styles.reveal}`} style={{ "--d": delay } as React.CSSProperties}>
      <div className={styles.tileTop}>
        <span className={styles.tileLabel}>{label}</span>
        <span className={styles.tileIcon}><Icon size={20} strokeWidth={1.9} aria-hidden="true" /></span>
      </div>
      <span className={styles.tileValue}><CountUp value={value} kind={kind} currency={currency} /></span>
      {note ? <p className={styles.tileNote}>{note}</p> : null}
    </div>
  );
}
