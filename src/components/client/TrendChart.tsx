import { formatCount, formatMoney, type ClientCurrency } from "@/lib/client-options";
import type { ClientMonthlyPoint } from "@/server/db/schema";
import { UpdatedChip } from "./Freshness";
import styles from "./Dashboard.module.css";

/**
 * The y axis's top value, chosen so its four gridline steps are round numbers close to the data (260 → 320 with steps of 80;
 * 12 → 12 with steps of 3), instead of leaving half the chart empty.
 */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const raw = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => raw <= s * magnitude) ?? 10) * magnitude;
  return Math.round(step * 4);
}

/**
 * Leads and calls per month as paired bars that grow in, with hover/keyboard tooltips. Plain HTML and CSS (no chart library, no
 * client JavaScript): columns are focusable, so the tooltip works from the keyboard, and the same numbers are in a visually
 * hidden table for screen readers.
 */
export function TrendChart({ points, period = "month", currency, updatedAt }: { points: ClientMonthlyPoint[]; period?: "day" | "month"; currency: ClientCurrency; updatedAt: string | null }) {
  const max = niceMax(Math.max(1, ...points.flatMap((m) => [m.leads, m.calls])));
  const dense = points.length > 16;
  const every = Math.ceil(points.length / 10);
  const unit = period === "day" ? "day" : "month";
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return (
    <section className={`${styles.card} ${styles.scrollReveal}`} aria-labelledby="trend-heading">
      <div className={styles.cardHead}>
        <div>
          <h2 id="trend-heading" className={styles.cardTitle}>Leads &amp; calls by {unit}</h2>
          <div className={styles.key} style={{ marginTop: 8 }}>
            <span><i className={styles.swatch} style={{ "--sw": "var(--client-blue)" } as React.CSSProperties} />Leads</span>
            <span><i className={styles.swatch} style={{ "--sw": "var(--client-green)" } as React.CSSProperties} />Calls</span>
          </div>
        </div>
        <UpdatedChip updatedAt={updatedAt} />
      </div>
      <div className={styles.chart} aria-hidden="true">
        <div className={styles.yAxis}>{ticks.map((t) => <span key={t}>{formatCount(Math.round(t), currency)}</span>)}</div>
        <div className={`${styles.plot} ${dense ? styles.plotDense : ""}`}>
          <div className={styles.gridLines}>{ticks.map((t) => <span key={t} />)}</div>
          {points.map((m, i) => (
            <div key={`${m.label}-${i}`} className={styles.col} tabIndex={0}>
              <span className={`${styles.bar} ${styles.barLeads}`} style={{ "--h": `${(m.leads / max) * 100}%`, "--i": i } as React.CSSProperties} />
              <span className={`${styles.bar} ${styles.barCalls}`} style={{ "--h": `${(m.calls / max) * 100}%`, "--i": i } as React.CSSProperties} />
              {i % every === 0 ? <span className={styles.xLabel}>{m.label}</span> : null}
              <div className={styles.tip} role="tooltip">
                <strong>{m.label}</strong>
                <span>Leads <b>{formatCount(m.leads, currency)}</b></span>
                <span>Calls <b>{formatCount(m.calls, currency)}</b></span>
                <span>Spend <b>{formatMoney(m.spend, currency)}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Leads, calls and spend by {unit}</caption>
        <thead><tr><th>{period === "day" ? "Day" : "Month"}</th><th>Leads</th><th>Calls</th><th>Spend</th></tr></thead>
        <tbody>{points.map((m, i) => <tr key={`${m.label}-${i}`}><td>{m.label}</td><td>{m.leads}</td><td>{m.calls}</td><td>{formatMoney(m.spend, currency)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
