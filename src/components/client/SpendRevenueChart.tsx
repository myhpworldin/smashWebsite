import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import type { ClientMonthlyPoint } from "@/server/db/schema";
import { UpdatedChip } from "./Freshness";
import styles from "./Dashboard.module.css";

function niceMax(value: number): number {
  if (value <= 4) return 4;
  const raw = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => raw <= s * magnitude) ?? 10) * magnitude;
  return Math.round(step * 4);
}
const compact = (n: number, currency: ClientCurrency) => new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Ad spend against revenue by day or month, as paired bars with the same hover/keyboard tooltips and screen-reader table as the leads chart. */
export function SpendRevenueChart({ points, period = "month", currency, updatedAt }: { points: ClientMonthlyPoint[]; period?: "day" | "month"; currency: ClientCurrency; updatedAt: string | null }) {
  const max = niceMax(Math.max(1, ...points.flatMap((m) => [m.spend, m.revenue ?? 0])));
  const dense = points.length > 16;
  const every = Math.ceil(points.length / 10);
  const unit = period === "day" ? "day" : "month";
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  return (
    <section className={`${styles.card} ${styles.scrollReveal}`} aria-labelledby="spend-heading">
      <div className={styles.cardHead}>
        <div>
          <h2 id="spend-heading" className={styles.cardTitle}>Ad spend vs revenue</h2>
          <div className={styles.key} style={{ marginTop: 8 }}>
            <span><i className={styles.swatch} style={{ "--sw": "var(--client-blue)" } as React.CSSProperties} />Ad spend</span>
            <span><i className={styles.swatch} style={{ "--sw": "var(--client-green)" } as React.CSSProperties} />Revenue</span>
          </div>
        </div>
        <UpdatedChip updatedAt={updatedAt} />
      </div>
      <div className={styles.chart} aria-hidden="true">
        <div className={styles.yAxis}>{ticks.map((t) => <span key={t}>{compact(Math.round(t), currency)}</span>)}</div>
        <div className={`${styles.plot} ${dense ? styles.plotDense : ""}`}>
          <div className={styles.gridLines}>{ticks.map((t) => <span key={t} />)}</div>
          {points.map((m, i) => (
            <div key={`${m.label}-${i}`} className={styles.col} tabIndex={0}>
              <span className={`${styles.bar} ${styles.barLeads}`} style={{ "--h": `${(m.spend / max) * 100}%`, "--i": i } as React.CSSProperties} />
              <span className={`${styles.bar} ${styles.barCalls}`} style={{ "--h": `${((m.revenue ?? 0) / max) * 100}%`, "--i": i } as React.CSSProperties} />
              {i % every === 0 ? <span className={styles.xLabel}>{m.label}</span> : null}
              <div className={styles.tip} role="tooltip">
                <strong>{m.label}</strong>
                <span>Spend <b>{formatMoney(m.spend, currency)}</b></span>
                <span>Revenue <b>{formatMoney(m.revenue ?? 0, currency)}</b></span>
                <span>ROAS <b>{m.spend > 0 && (m.revenue ?? 0) > 0 ? `${((m.revenue ?? 0) / m.spend).toFixed(2)}×` : "—"}</b></span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Ad spend and revenue by {unit}</caption>
        <thead><tr><th>{period === "day" ? "Day" : "Month"}</th><th>Spend</th><th>Revenue</th></tr></thead>
        <tbody>{points.map((m, i) => <tr key={`${m.label}-${i}`}><td>{m.label}</td><td>{formatMoney(m.spend, currency)}</td><td>{formatMoney(m.revenue ?? 0, currency)}</td></tr>)}</tbody>
      </table>
    </section>
  );
}
