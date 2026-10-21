"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { formatMoney, type CampaignStatus, type ClientCurrency } from "@/lib/client-options";
import { campaignMetrics } from "@/lib/client-metrics";
import { addDays } from "@/lib/client-dates";
import { DAILY_METRICS, dayLabel, type DailyMetric } from "@/lib/client-daily";
import { AdminCard } from "./AdminCard";
import styles from "./AdminClients.module.css";
import tab from "./workspace/Workspace.module.css";

export type DailyCampaign = { id: string; name: string; platform: string; status: CampaignStatus };
export type RecentDay = { date: string; spend: number; leads: number; calls: number; hasData: boolean };
type Draft = Record<DailyMetric, string>;

const LABEL: Record<DailyMetric, string> = { spend: "Spend", revenue: "Revenue", leads: "Leads", calls: "Calls", impressions: "Impressions", clicks: "Clicks", reach: "Reach", engagement: "Engagement", conversions: "Conversions" };
const ORDER: DailyMetric[] = ["spend", "leads", "calls", "impressions", "clicks", "reach", "engagement", "conversions", "revenue"];
const MONEY = new Set<DailyMetric>(["spend", "revenue"]);
const num = (text: string) => (text.trim() === "" ? 0 : Number(text.replace(/[,\s]/g, "")));
const blank = (): Draft => Object.fromEntries(DAILY_METRICS.map((m) => [m, ""])) as Draft;
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.field}><span className={styles.label}>{label}</span>{children}</div>;
}

/**
 * The daily performance update. Pick a day (today by default), type what each campaign did that day, save. The client's campaign totals,
 * headline numbers and charts are added up from these days, so there is no running total to retype. Saving a day again corrects it; leaving
 * a campaign's figures empty clears them. Below, the last two weeks show which days are recorded and which are missing.
 * Mount with `key={date}` so changing day starts from that day's saved figures.
 */
export function DailyUpdate({ accountId, date, today, currency, budget, campaigns, saved, recent, lastDay }: {
  accountId: string; date: string; today: string; currency: ClientCurrency; campaigns: DailyCampaign[];
  /** `total` is the client's total budget (0 = not set); `currentSpend` what is spent now; `spentOther` what would be spent if this day's lines were cleared. The server enforces the same rule. */
  budget: { total: number; currentSpend: number; spentOther: number };
  /** Saved figures for `date`, by campaign id (`""` = not tied to a campaign). */
  saved: Record<string, Partial<Record<DailyMetric, number>>>; recent: RecentDay[]; lastDay: string | null;
}) {
  const router = useRouter();
  // A client with no campaigns records one overall line; otherwise one per campaign.
  const lines: { id: string; name: string; sub: string }[] = campaigns.length
    ? campaigns.map((c) => ({ id: c.id, name: c.name, sub: `${c.platform}${c.status === "ACTIVE" ? "" : ` · ${c.status.toLowerCase()}`}` }))
    : [{ id: "", name: "All activity", sub: "Add campaigns in Campaign setup to record each one separately" }];
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(lines.map((l) => [l.id, Object.fromEntries(DAILY_METRICS.map((m) => [m, saved[l.id]?.[m] ? String(saved[l.id]?.[m]) : ""])) as Draft])));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  const go = (next: string) => router.push(`/admin/clients/${accountId}/campaigns?date=${next}`);
  const patch = (id: string, metric: DailyMetric, value: string) => setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? blank()), [metric]: value } }));
  // Same rule as the server: no spend without a budget, and a save can't take spend past it (a save that lowers spend is always fine).
  const locked = !(budget.total > 0);
  const afterSpend = Math.round((budget.spentOther + lines.reduce((t, l) => t + num((drafts[l.id] ?? blank()).spend), 0)) * 100) / 100;
  const over = !locked && afterSpend > budget.total + 0.004 && afterSpend > budget.currentSpend;
  const behind = lastDay === null ? null : Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDay}T00:00:00Z`)) / 86_400_000);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrors([]);
    setMessage(null);
    const entries = lines.map((l) => ({ campaignId: l.id, ...Object.fromEntries(DAILY_METRICS.map((m) => [m, num((drafts[l.id] ?? blank())[m])])) }));
    try {
      const result = await apiFetch<{ saved: number; cleared: number }>(`/api/admin/client-accounts/${accountId}/daily`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, entries }), signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) {
        setMessage(result.data.saved ? `Saved ${dayLabel(date)}. The client's totals and charts now include it.` : `Cleared ${dayLabel(date)}.`);
        router.refresh();
      } else {
        const fields = result.error.fields;
        setErrors(fields ? Object.entries(fields).map(([path, m]) => `${path.replace(/entries\.(\d+)\./, (_x, i) => `${lines[Number(i)]?.name ?? "Entry"}: `)}${m}`) : [result.message]);
      }
    } catch {
      setErrors(["We couldn't reach the server. Please try again."]);
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <div className={styles.stack}>
      <AdminCard reveal>
        <div className={styles.cardHeadRow}>
          <div>
            <h3 className={styles.cardTitle}>Daily performance update</h3>
            <p className={styles.cardHint}>Enter what each campaign did on the day. Totals, ratios and charts for the client are worked out from these days.</p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button type="button" className={styles.iconBtn} aria-label="Previous day" onClick={() => go(addDays(date, -1))}><ChevronLeft size={17} aria-hidden="true" /></button>
            <Field label="Day"><input className={styles.input} type="date" value={date} max={today} onChange={(e) => e.target.value && go(e.target.value > today ? today : e.target.value)} /></Field>
            <button type="button" className={styles.iconBtn} aria-label="Next day" disabled={date >= today} onClick={() => go(addDays(date, 1))}><ChevronRight size={17} aria-hidden="true" /></button>
            {date !== today ? <button type="button" className={`${styles.btn} ${styles.btnSmall}`} onClick={() => go(today)}>Today</button> : null}
          </div>
        </div>
        {locked ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>Daily numbers are locked until this client has a total budget, because every expense is taken from it. <Link href={`/admin/clients/${accountId}/campaigns?view=setup`}>Set the total budget</Link></p> : null}
        {behind === null ? <p className={tab.hint}>Nothing has been recorded daily for this client yet. Their dashboard still shows the monthly figures from Campaign setup until you save a day here.</p> : behind > 1 ? <p className={tab.hint}>The last day recorded is {dayLabel(lastDay!)} — {behind} days ago. Catch up by saving the missing days below.</p> : null}
      </AdminCard>

      <form onSubmit={onSubmit} noValidate className={styles.stack} aria-label={`Performance for ${dayLabel(date)}`}>
        <AdminCard reveal delay={1}>
          <h3 className={styles.cardTitle}>{date === today ? "Today" : dayLabel(date)}{Object.keys(saved).length ? <span className={styles.muted}> · already recorded, saving replaces it</span> : null}</h3>
          <div className={styles.repeatList} style={{ marginTop: 14 }}>
            {lines.map((l) => {
              const d = drafts[l.id] ?? blank();
              const m = campaignMetrics({ budget: 0, spent: num(d.spend), leads: num(d.leads), calls: num(d.calls), impressions: num(d.impressions), clicks: num(d.clicks), reach: num(d.reach), engagement: num(d.engagement), conversions: num(d.conversions), revenue: num(d.revenue) });
              return (
                <div key={l.id || "all"} className={styles.campaign} role="group" aria-label={l.name}>
                  <p style={{ margin: "0 0 12px", fontWeight: 700 }}>{l.name} <span className={styles.muted} style={{ fontWeight: 500 }}>· {l.sub}</span></p>
                  <div className={styles.metricGrid}>
                    {ORDER.map((metric) => (
                      <Field key={metric} label={MONEY.has(metric) ? `${LABEL[metric]} (${currency})` : LABEL[metric]}>
                        <input className={styles.input} inputMode={MONEY.has(metric) ? "decimal" : "numeric"} value={d[metric]} onChange={(e) => patch(l.id, metric, e.target.value)} placeholder="0" disabled={locked} aria-label={`${l.name} ${LABEL[metric]}`} />
                      </Field>
                    ))}
                  </div>
                  <div className={styles.derived} aria-label="Calculated figures for the day">
                    <span>CPL <b>{m.costPerLead === null ? "—" : formatMoney(m.costPerLead, currency)}</b></span>
                    <span>CTR <b>{pct(m.clickThroughRate)}</b></span>
                    <span>ROAS <b>{m.roas === null ? "—" : `${m.roas.toFixed(2)}×`}</b></span>
                    <span>Conv. rate <b>{pct(m.conversionRate)}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </AdminCard>

        {errors.length ? <div role="alert" className={`${styles.alert} ${styles.alertError}`}>This day can&apos;t be saved yet:<ul>{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul></div> : null}
        {message ? <p role="status" className={`${styles.alert} ${styles.alertSuccess}`}>{message}</p> : null}
        <div className={styles.saveBar}>
          <div className={styles.saveInfo}>
            {locked ? null : over ? (
              <p role="alert" style={{ margin: "0 0 6px", fontWeight: 700, color: "var(--admin-accent, #e90101)" }}>{formatMoney(afterSpend - budget.total, currency)} over the total budget of {formatMoney(budget.total, currency)}. Lower the spend, or increase the total budget in Campaign setup.</p>
            ) : (
              <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Remaining after this update: {formatMoney(Math.max(0, budget.total - afterSpend), currency)} <span className={styles.muted} style={{ fontWeight: 500 }}>of {formatMoney(budget.total, currency)}</span></p>
            )}
            Saving moves the client&apos;s &ldquo;last updated&rdquo; time to now. Empty figures count as zero; leave a campaign empty to clear its day.
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || locked || over}>{busy ? "Saving…" : `Save ${dayLabel(date)}`}</button>
        </div>
      </form>

      <AdminCard reveal delay={2}>
        <h3 className={styles.cardTitle}>Last 14 days</h3>
        <p className={styles.cardHint}>A day marked missing has nothing recorded. Open it to fill it in.</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">Day</th><th scope="col">Status</th><th scope="col">Spend</th><th scope="col">Leads</th><th scope="col">Calls</th></tr></thead>
            <tbody>
              {recent.map((r, i) => {
                const done = r.hasData;
                return (
                  <tr key={r.date} style={{ "--i": Math.min(i, 8) } as React.CSSProperties} aria-current={r.date === date ? "date" : undefined}>
                    <td><Link href={`/admin/clients/${accountId}/campaigns?date=${r.date}`} className={styles.rowLink}><strong>{r.date === today ? "Today" : dayLabel(r.date)}</strong></Link></td>
                    <td>{done ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--admin-success)" }}><CalendarCheck size={15} aria-hidden="true" />Recorded</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: r.date === today ? "var(--admin-text-muted)" : "var(--admin-warning)" }}><CalendarX size={15} aria-hidden="true" />{r.date === today ? "Not yet" : "Missing"}</span>}</td>
                    <td>{done ? formatMoney(r.spend, currency) : "—"}</td>
                    <td>{done ? r.leads : "—"}</td>
                    <td>{done ? r.calls : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
