import type { ComponentType, CSSProperties } from "react";
import type { LucideProps } from "lucide-react";
import { CountUp } from "@/components/client/CountUp";
import type { ClientCurrency } from "@/lib/client-options";
import styles from "./AdminStatCard.module.css";

const ACCENT = { blue: styles.blue, green: styles.green, red: styles.red, navy: styles.navy } as const;

/** One headline figure: icon, label, a count-up value and a one-line note. Rises in on load, lifts and draws an accent bar on hover. The server renders the real number, so it is correct without JavaScript. */
export function AdminStatCard({ label, value, note, icon: Icon, accent, delay = 0, money }: { label: string; value: number; note?: string; icon: ComponentType<LucideProps>; accent: keyof typeof ACCENT; delay?: number; /** Show the figure as an amount in this currency. */ money?: ClientCurrency }) {
  return (
    <div className={`${styles.tile} ${ACCENT[accent]}`} style={{ "--d": delay } as CSSProperties}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={styles.icon}><Icon size={20} strokeWidth={1.9} aria-hidden="true" /></span>
      </div>
      <span className={styles.value}><CountUp value={value} kind={money ? "money" : "count"} currency={money} /></span>
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
