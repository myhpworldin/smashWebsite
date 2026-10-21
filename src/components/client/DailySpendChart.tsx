import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import styles from "./DailySpendChart.module.css";

/**
 * What was spent each day, as columns: hover or focus a day for its amount, with a table for screen readers. A hand-built chart like
 * the portal's others (no chart library); it carries its own colours so it works in the admin as well as the client portal.
 */
export function DailySpendChart({ points, currency }: { points: { date: string; label: string; spend: number }[]; currency: ClientCurrency }) {
  const max = Math.max(0, ...points.map((p) => p.spend));
  if (!points.length || max <= 0) return <p className={styles.empty}>No daily spend recorded in this period yet.</p>;
  return (
    <div className={styles.chart}>
      <div className={styles.plot} aria-hidden="true">
        {points.map((p, i) => (
          <div key={p.date} className={styles.col} tabIndex={0}>
            <span className={styles.bar} data-zero={p.spend <= 0 ? "true" : undefined} style={{ "--h": `${(p.spend / max) * 100}%`, "--i": i } as React.CSSProperties} />
            <div className={styles.tip} role="tooltip">{p.label}: {formatMoney(p.spend, currency)}</div>
          </div>
        ))}
      </div>
      <div className={styles.axis} aria-hidden="true"><span>{points[0].label}</span><span>Peak {formatMoney(max, currency)}</span><span>{points[points.length - 1].label}</span></div>
      <table className="sr-only">
        <caption>Daily spend</caption>
        <thead><tr><th>Day</th><th>Spend</th></tr></thead>
        <tbody>{points.map((p) => <tr key={p.date}><td>{p.label}</td><td>{formatMoney(p.spend, currency)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
