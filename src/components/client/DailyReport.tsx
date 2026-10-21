import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatCount, formatMoney, type ClientCurrency } from "@/lib/client-options";
import { campaignMetrics } from "@/lib/client-metrics";
import { dayLabel, sumFigures, type DailyEntry } from "@/lib/client-daily";
import { fmtDay } from "@/lib/client-format";
import styles from "./Dashboard.module.css";

export const DAILY_RANGES = [7, 30, 90] as const;
export type DailyRange = (typeof DAILY_RANGES)[number];

/** `?range=` from the URL → one of the offered ranges (30 days when missing or unknown). */
export const parseRange = (raw: string | string[] | undefined): DailyRange => {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (DAILY_RANGES as readonly number[]).includes(n) ? (n as DailyRange) : 30;
};

/** The range switcher (links, so the page stays server-rendered and the choice survives a refresh). */
export function RangeTabs({ range, basePath }: { range: DailyRange; basePath: string }) {
  return (
    <nav className={styles.tabs} aria-label="Reporting period">
      {DAILY_RANGES.map((r) => <Link key={r} href={`${basePath}?range=${r}`} className={styles.tab} aria-current={r === range ? "true" : undefined} scroll={false}>Last {r} days</Link>)}
    </nav>
  );
}

/** What was recorded for each day in the range, newest first, with the range's total. Days with nothing recorded are left out. A table that turns into stacked cards on a phone. */
export function DailyReportTable({ rows, from, to, currency, maxRows = 14 }: { rows: DailyEntry[]; from: string; to: string; currency: ClientCurrency; maxRows?: number }) {
  const byDay = new Map<string, DailyEntry[]>();
  for (const r of rows) {
    if (r.date < from || r.date > to) continue;
    byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, list]) => ({ date, t: sumFigures(list) }));
  const total = sumFigures(days.map((d) => d.t));
  const shown = days.slice(0, maxRows);
  const n = (v: number) => formatCount(v, currency);
  if (!days.length) {
    return (
      <div className={`${styles.empty} ${styles.reveal}`}>
        <span className={styles.emptyIcon}><CalendarDays size={30} strokeWidth={1.7} aria-hidden="true" /></span>
        <h2 className={styles.emptyTitle}>No daily numbers in this period</h2>
        <p className={styles.emptyText}>Your account team records your results every day. They will appear here as soon as they do.</p>
      </div>
    );
  }
  const cpl = campaignMetrics({ budget: 0, spent: total.spend, leads: total.leads, calls: total.calls }).costPerLead;
  return (
    <section className={`${styles.card} ${styles.tableCard} ${styles.scrollReveal}`} aria-labelledby="daily-heading">
      <div className={styles.cardHead} style={{ padding: "20px 20px 4px" }}>
        <div>
          <h2 id="daily-heading" className={styles.cardTitle}>Day by day</h2>
          <p className={styles.cardSub}>{days.length} day{days.length === 1 ? "" : "s"} recorded · {formatMoney(total.spend, currency)} spent · {n(total.leads)} leads{cpl === null ? "" : ` · ${formatMoney(cpl, currency)} per lead`}{shown.length < days.length ? ` · showing the latest ${shown.length}` : ""}</p>
        </div>
      </div>
      <table className={`${styles.table} ${styles.dailyTable}`}>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col" className={styles.num}>Spend</th>
            <th scope="col" className={styles.num}>Leads</th>
            <th scope="col" className={styles.num}>Calls</th>
            <th scope="col" className={styles.num}>Impressions</th>
            <th scope="col" className={styles.num}>Clicks</th>
            <th scope="col" className={styles.num}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {shown.map(({ date, t }, i) => (
            <tr key={date} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
              <td data-label="Day"><strong title={fmtDay(date)}>{dayLabel(date)}</strong></td>
              <td data-label="Spend" className={styles.num}>{formatMoney(t.spend, currency)}</td>
              <td data-label="Leads" className={styles.num}>{n(t.leads)}</td>
              <td data-label="Calls" className={styles.num}>{n(t.calls)}</td>
              <td data-label="Impressions" className={styles.num}>{n(t.impressions)}</td>
              <td data-label="Clicks" className={styles.num}>{n(t.clicks)}</td>
              <td data-label="Revenue" className={styles.num}>{t.revenue ? formatMoney(t.revenue, currency) : "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">{shown.length < days.length ? `Total, all ${days.length} days` : "Total"}</th>
            <td data-label="Spend" className={styles.num}>{formatMoney(total.spend, currency)}</td>
            <td data-label="Leads" className={styles.num}>{n(total.leads)}</td>
            <td data-label="Calls" className={styles.num}>{n(total.calls)}</td>
            <td data-label="Impressions" className={styles.num}>{n(total.impressions)}</td>
            <td data-label="Clicks" className={styles.num}>{n(total.clicks)}</td>
            <td data-label="Revenue" className={styles.num}>{total.revenue ? formatMoney(total.revenue, currency) : "—"}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
