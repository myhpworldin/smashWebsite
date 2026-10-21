"use client";

import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { CAMPAIGN_PLATFORMS, CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABEL, CLIENT_CURRENCIES, MAX_CAMPAIGNS, MAX_MONTHS, formatMoney, type CampaignStatus, type ClientCurrency } from "@/lib/client-options";
import { campaignMetrics, sumCampaigns } from "@/lib/client-metrics";
import { istStamp } from "@/lib/client-time";
import type { ClientDashboardRow } from "@/server/modules/client-accounts/client-dashboard.service";
import { AdminButton } from "./AdminButton";
import { AdminCard } from "./AdminCard";
import styles from "./AdminClients.module.css";
import tab from "./workspace/Workspace.module.css";

/** Every number is held as the text the admin typed, so a half-typed "1,2" never becomes NaN mid-edit; it is parsed once, on save. */
type CampaignDraft = {
  id: string; name: string; platform: string; status: CampaignStatus; startDate: string;
  budget: string; spent: string; reach: string; impressions: string; clicks: string; leads: string; calls: string; conversions: string; engagement: string; revenue: string;
};
type MonthDraft = { key: string; label: string; leads: string; calls: string; spend: string; revenue: string };

const str = (n: number | undefined) => (n ? String(n) : "");
const num = (text: string) => (text.trim() === "" ? 0 : Number(text.replace(/[,\s]/g, "")));
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

function Field({ label, children, error, className }: { label: string; children: ReactNode; error?: string; className?: string }) {
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <span className={styles.label}>{label}</span>
      {children}
      {error ? <span className={styles.fieldError}>{error}</span> : null}
    </div>
  );
}

const blankCampaign = (): CampaignDraft => ({ id: uid(), name: "", platform: CAMPAIGN_PLATFORMS[0], status: "ACTIVE", startDate: "", budget: "", spent: "", reach: "", impressions: "", clicks: "", leads: "", calls: "", conversions: "", engagement: "", revenue: "" });

/**
 * Where an administrator publishes a client's campaign figures. Each campaign is a card of what happened (spend, reach, impressions,
 * clicks, leads, conversions, engagement, revenue); cost per lead, click-through rate, ROAS and the rest are worked out as you type and
 * are never entered by hand. With campaigns, the headline numbers on the client's dashboard are their sum; the typed headline figures
 * apply only to a client with no campaign detail. Saving replaces the whole dashboard and moves the client's "last updated" to now.
 */
export function ClientDashboardEditor({ accountId, initial, dailyCampaignIds = [] }: { accountId: string; initial: ClientDashboardRow | null; dailyCampaignIds?: string[] }) {
  const fromDaily = new Set(dailyCampaignIds);
  const hasDaily = fromDaily.size > 0;
  const router = useRouter();
  const base = useId();
  const [currency, setCurrency] = useState<ClientCurrency>(initial?.currency ?? "INR");
  const [periodLabel, setPeriodLabel] = useState(initial?.periodLabel ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [leads, setLeads] = useState(str(initial?.leads));
  const [calls, setCalls] = useState(str(initial?.calls));
  const [adsRunning, setAdsRunning] = useState(str(initial?.adsRunning));
  const [impressions, setImpressions] = useState(str(initial?.impressions));
  const [clicks, setClicks] = useState(str(initial?.clicks));
  const [totalBudget, setTotalBudget] = useState(str(initial?.totalBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDraft[]>(() => (initial?.campaigns ?? []).map((c) => ({
    id: c.id, name: c.name, platform: c.platform, status: c.status, startDate: c.startDate ?? "", budget: str(c.budget), spent: str(c.spent), reach: str(c.reach), impressions: str(c.impressions), clicks: str(c.clicks),
    leads: str(c.leads), calls: str(c.calls), conversions: str(c.conversions), engagement: str(c.engagement), revenue: str(c.revenue),
  })));
  const [months, setMonths] = useState<MonthDraft[]>(() => (initial?.monthly ?? []).map((m) => ({ key: uid(), label: m.label, leads: str(m.leads), calls: str(m.calls), spend: str(m.spend), revenue: str(m.revenue) })));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [publishedAt, setPublishedAt] = useState<string | null>(initial?.dataUpdatedAt ? new Date(initial.dataUpdatedAt).toISOString() : null);
  const [justSaved, setJustSaved] = useState(false);
  const inFlight = useRef(false);

  const patchCampaign = (id: string, patch: Partial<CampaignDraft>) => setCampaigns((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const patchMonth = (key: string, patch: Partial<MonthDraft>) => setMonths((list) => list.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const figures = (c: CampaignDraft) => ({ budget: num(c.budget), spent: num(c.spent), leads: num(c.leads), calls: num(c.calls), reach: num(c.reach), impressions: num(c.impressions), clicks: num(c.clicks), engagement: num(c.engagement), conversions: num(c.conversions), revenue: num(c.revenue) });
  const totals = useMemo(() => sumCampaigns(campaigns.map((c) => ({ ...figures(c), status: c.status }))), [campaigns]);
  const hasCampaigns = campaigns.length > 0;
  const overall = campaignMetrics({ ...totals });

  // What is already spent: the campaigns' figures plus any activity that isn't tied to a campaign (it stays in the headline). The total budget can't go below it.
  const loose = initial && initial.campaigns.length ? Math.max(0, Math.round((initial.amountSpent - sumCampaigns(initial.campaigns).spent) * 100) / 100) : 0;
  const spentSoFar = hasCampaigns ? Math.round((totals.spent + loose) * 100) / 100 : initial?.amountSpent ?? 0;
  const budgetLog = [...(initial?.budgetLog ?? [])].reverse().slice(0, 6);

  /** The same rules the server enforces, so the problem shows next to the field before anything is sent. */
  function budgetProblem(): string | null {
    const total = num(totalBudget);
    if (!(total > 0)) return "Set a total budget greater than 0. Every daily expense is taken from it.";
    if (total < spentSoFar) return `The total budget can't be lower than the ${formatMoney(spentSoFar, currency)} already spent.`;
    if (totals.budget > total) return `The campaigns' budgets add up to ${formatMoney(totals.budget, currency)}, more than the total budget. Raise the total or lower a campaign budget.`;
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const problem = budgetProblem();
    setBudgetError(problem);
    setJustSaved(false);
    if (problem) {
      setErrors([`Total budget: ${problem}`]);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setErrors([]);
    const payload = {
      currency, periodLabel, note,
      leads: num(leads), calls: num(calls), adsRunning: num(adsRunning), impressions: num(impressions), clicks: num(clicks), totalBudget: num(totalBudget),
      campaigns: campaigns.map((c) => ({ id: c.id, name: c.name, platform: c.platform, status: c.status, startDate: c.startDate, ...figures(c) })),
      monthly: months.map((m) => ({ label: m.label, leads: num(m.leads), calls: num(m.calls), spend: num(m.spend), revenue: num(m.revenue) })),
    };
    try {
      const result = await apiFetch<{ dataUpdatedAt: string }>(`/api/admin/client-accounts/${accountId}/dashboard`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) {
        setPublishedAt(new Date(result.data.dataUpdatedAt).toISOString());
        setJustSaved(true);
        router.refresh();
      } else {
        const fields = result.error.fields;
        setBudgetError(fields?.totalBudget ?? null);
        setErrors(fields ? Object.entries(fields).map(([path, message]) => `${path.replace(/\.(\d+)/g, (_m, i) => ` #${Number(i) + 1}`).replace(/\./g, " › ")}: ${message}`) : [result.message]);
      }
    } catch {
      setErrors(["We couldn't reach the server. Please try again."]);
    }
    inFlight.current = false;
    setBusy(false);
  }

  const money = (label: string, value: string, set: (v: string) => void, locked = false) => (
    <Field label={`${label} (${currency})`}><input className={styles.input} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} placeholder="0" disabled={locked} title={locked ? "Added up from the daily updates" : undefined} /></Field>
  );
  const count = (label: string, value: string, set: (v: string) => void, locked = false) => (
    <Field label={label}><input className={styles.input} inputMode="numeric" value={value} onChange={(e) => set(e.target.value)} placeholder="0" disabled={locked} title={locked ? "Added up from the daily updates" : undefined} /></Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className={styles.stack} aria-label="Client campaign figures">
      <AdminCard reveal>
        <h3 className={styles.cardTitle}>Reporting period &amp; budget</h3>
        <p className={styles.cardHint}>The period shows beside the client&apos;s name; the note appears as a message from the account team.</p>
        <div className={styles.grid3}>
          <Field label="Reporting period"><input id={`${base}-period`} className={styles.input} value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. October 2026" maxLength={60} /></Field>
          <Field label="Currency"><select className={styles.select} value={currency} onChange={(e) => setCurrency(e.target.value as ClientCurrency)}>{CLIENT_CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label={`Total budget (${currency}) *`} error={budgetError ?? undefined}>
            <input className={styles.input} inputMode="decimal" value={totalBudget} onChange={(e) => { setTotalBudget(e.target.value); setBudgetError(null); }} placeholder="e.g. 100000" required aria-required="true" aria-invalid={budgetError ? true : undefined} />
          </Field>
        </div>
        <div className={tab.summary} style={{ marginTop: 14 }}>
          <div className={tab.summaryItem}><b>{formatMoney(spentSoFar, currency)}</b><span>Already spent (the minimum for the total)</span></div>
          <div className={tab.summaryItem}><b>{formatMoney(totals.budget, currency)}</b><span>Allotted to campaigns{num(totalBudget) > 0 ? ` of ${formatMoney(num(totalBudget), currency)}` : ""}</span></div>
          <div className={tab.summaryItem}><b>{num(totalBudget) > 0 ? formatMoney(Math.max(0, num(totalBudget) - spentSoFar), currency) : "—"}</b><span>Left to spend</span></div>
        </div>
        <p className={styles.help} style={{ marginTop: 10 }}>The total budget is required. Daily expenses are taken from it and can&apos;t go past it, so raise it here when the client adds more budget.</p>
        {budgetLog.length ? (
          <div style={{ marginTop: 14 }}>
            <p className={styles.label} style={{ margin: "0 0 6px" }}>Budget history</p>
            <ul className={styles.help} style={{ margin: 0, paddingLeft: 18 }}>
              {budgetLog.map((l) => <li key={`${l.at}-${l.to}`}>{istStamp(new Date(l.at))} — {l.from > 0 ? `${formatMoney(l.from, currency)} → ` : "set to "}{formatMoney(l.to, currency)}{l.by ? ` by ${l.by}` : ""}</li>)}
            </ul>
          </div>
        ) : null}
        <div style={{ marginTop: 16 }}>
          <Field label="Note to the client"><textarea className={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="e.g. Lead quality improved after we paused the broad-match campaign." /></Field>
        </div>
      </AdminCard>

      <AdminCard reveal delay={1}>
        <div className={styles.cardHeadRow}>
          <div><h3 className={styles.cardTitle}>Campaigns</h3><p className={styles.cardHint}>Each campaign the client can see, with its own results. The ratios are calculated for you.</p></div>
          <AdminButton variant="secondary" size="sm" disabled={campaigns.length >= MAX_CAMPAIGNS} onClick={() => setCampaigns((l) => [...l, blankCampaign()])}><Plus size={15} aria-hidden="true" />Add campaign</AdminButton>
        </div>

        {hasCampaigns ? (
          <div className={tab.summary} style={{ marginBottom: 14 }}>
            <div className={tab.summaryItem}><b>{formatMoney(totals.spent, currency)}</b><span>Total spend</span></div>
            <div className={tab.summaryItem}><b>{totals.leads}</b><span>Leads</span></div>
            <div className={tab.summaryItem}><b>{overall.costPerLead === null ? "—" : formatMoney(overall.costPerLead, currency)}</b><span>Cost per lead</span></div>
            <div className={tab.summaryItem}><b>{overall.roas === null ? "—" : `${overall.roas.toFixed(2)}×`}</b><span>ROAS</span></div>
          </div>
        ) : null}

        <div className={styles.repeatList}>
          {campaigns.length === 0 ? <p className={styles.help}>No campaigns yet. Without campaigns, the headline figures below are what the client sees.</p> : null}
          {campaigns.map((c, i) => {
            const m = campaignMetrics(figures(c));
            return (
              <div key={c.id} className={styles.campaign} role="group" aria-label={`Campaign ${i + 1}`}>
                <div className={styles.campaignHead}>
                  <Field label="Name"><input className={styles.input} value={c.name} onChange={(e) => patchCampaign(c.id, { name: e.target.value })} maxLength={120} placeholder="e.g. Diwali lead gen" /></Field>
                  <Field label="Platform"><select className={styles.select} value={c.platform} onChange={(e) => patchCampaign(c.id, { platform: e.target.value })}>{CAMPAIGN_PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></Field>
                  <Field label="Status"><select className={styles.select} value={c.status} onChange={(e) => patchCampaign(c.id, { status: e.target.value as CampaignStatus })}>{CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{CAMPAIGN_STATUS_LABEL[s]}</option>)}</select></Field>
                  <Field label="Started"><input className={styles.input} type="date" value={c.startDate} onChange={(e) => patchCampaign(c.id, { startDate: e.target.value })} /></Field>
                  <button type="button" className={styles.iconBtn} aria-label={`Remove campaign ${i + 1}`} onClick={() => setCampaigns((l) => l.filter((x) => x.id !== c.id))}><Trash2 size={16} aria-hidden="true" /></button>
                </div>
                <div className={styles.metricGrid}>
                  {money("Budget", c.budget, (v) => patchCampaign(c.id, { budget: v }))}
                  {money("Spent", c.spent, (v) => patchCampaign(c.id, { spent: v }), fromDaily.has(c.id))}
                  {money("Revenue", c.revenue, (v) => patchCampaign(c.id, { revenue: v }), fromDaily.has(c.id))}
                  {count("Reach", c.reach, (v) => patchCampaign(c.id, { reach: v }), fromDaily.has(c.id))}
                  {count("Impressions", c.impressions, (v) => patchCampaign(c.id, { impressions: v }), fromDaily.has(c.id))}
                  {count("Clicks", c.clicks, (v) => patchCampaign(c.id, { clicks: v }), fromDaily.has(c.id))}
                  {count("Engagement", c.engagement, (v) => patchCampaign(c.id, { engagement: v }), fromDaily.has(c.id))}
                  {count("Leads", c.leads, (v) => patchCampaign(c.id, { leads: v }), fromDaily.has(c.id))}
                  {count("Calls", c.calls, (v) => patchCampaign(c.id, { calls: v }), fromDaily.has(c.id))}
                  {count("Conversions", c.conversions, (v) => patchCampaign(c.id, { conversions: v }), fromDaily.has(c.id))}
                </div>
                {fromDaily.has(c.id) ? <p className={styles.help} style={{ marginTop: 10 }}>Results are added up from the daily updates. Budget, status and the other details can still be edited here.</p> : null}
                <div className={styles.derived} aria-label="Calculated figures">
                  <span>CPL <b>{m.costPerLead === null ? "—" : formatMoney(m.costPerLead, currency)}</b></span>
                  <span>CTR <b>{pct(m.clickThroughRate)}</b></span>
                  <span>ROAS <b>{m.roas === null ? "—" : `${m.roas.toFixed(2)}×`}</b></span>
                  <span>Conv. rate <b>{pct(m.conversionRate)}</b></span>
                  <span>Engagement <b>{pct(m.engagementRate)}</b></span>
                  <span>Budget used <b>{c.budget.trim() ? `${m.budgetUsedPercent}%` : "—"}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {hasCampaigns ? null : (
        <AdminCard reveal delay={2}>
          <h3 className={styles.cardTitle}>Headline figures</h3>
          <p className={styles.cardHint}>Used only while there are no campaigns above. Add a campaign and these are calculated from it instead.</p>
          <div className={styles.grid5}>
            {count("Total leads", leads, setLeads)}
            {count("Calls received", calls, setCalls)}
            {count("Ads running", adsRunning, setAdsRunning)}
            {count("Impressions", impressions, setImpressions)}
            {count("Clicks", clicks, setClicks)}
          </div>
          <p className={styles.help} style={{ marginTop: 12 }}>The amount spent isn&apos;t typed: it comes from the daily updates, and is taken from the total budget above.</p>
        </AdminCard>
      )}

      {hasDaily ? (
        <AdminCard reveal delay={3}>
          <h3 className={styles.cardTitle}>Monthly performance</h3>
          <p className={styles.cardHint}>The monthly chart is built from the daily updates, so there is nothing to type here. Your earlier monthly figures are kept and used again if the daily updates are ever removed.</p>
        </AdminCard>
      ) : (
      <AdminCard reveal delay={3}>
        <div className={styles.cardHeadRow}>
          <div><h3 className={styles.cardTitle}>Monthly performance</h3><p className={styles.cardHint}>Powers the charts. Add the most recent months, oldest first (up to {MAX_MONTHS}).</p></div>
          <AdminButton variant="secondary" size="sm" disabled={months.length >= MAX_MONTHS} onClick={() => setMonths((l) => [...l, { key: uid(), label: "", leads: "", calls: "", spend: "", revenue: "" }])}><Plus size={15} aria-hidden="true" />Add month</AdminButton>
        </div>
        <div className={styles.repeatList}>
          {months.length === 0 ? <p className={styles.help}>No months yet. The charts are hidden from the client until you add some.</p> : null}
          {months.map((m, i) => (
            <div key={m.key} className={styles.monthRow} role="group" aria-label={`Month ${i + 1}`}>
              <Field label="Month"><input id={`${base}-m${i}`} className={styles.input} value={m.label} onChange={(e) => patchMonth(m.key, { label: e.target.value })} placeholder="Oct 2026" maxLength={20} /></Field>
              <Field label="Leads"><input className={styles.input} inputMode="numeric" value={m.leads} onChange={(e) => patchMonth(m.key, { leads: e.target.value })} placeholder="0" /></Field>
              <Field label="Calls"><input className={styles.input} inputMode="numeric" value={m.calls} onChange={(e) => patchMonth(m.key, { calls: e.target.value })} placeholder="0" /></Field>
              <Field label={`Spend (${currency})`}><input className={styles.input} inputMode="decimal" value={m.spend} onChange={(e) => patchMonth(m.key, { spend: e.target.value })} placeholder="0" /></Field>
              <Field label={`Revenue (${currency})`}><input className={styles.input} inputMode="decimal" value={m.revenue} onChange={(e) => patchMonth(m.key, { revenue: e.target.value })} placeholder="0" /></Field>
              <button type="button" className={styles.iconBtn} aria-label={`Remove month ${i + 1}`} onClick={() => setMonths((l) => l.filter((x) => x.key !== m.key))}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      </AdminCard>
      )}

      {errors.length ? (
        <div role="alert" className={`${styles.alert} ${styles.alertError}`}>
          Some figures need fixing before this can be published:
          <ul>{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}
      {justSaved ? <p role="status" className={`${styles.alert} ${styles.alertSuccess}`}>Published. The client now sees these figures, stamped as updated just now.</p> : null}

      <div className={styles.saveBar}>
        <div className={styles.saveInfo}>
          <span className={`${styles.stamp} ${publishedAt ? "" : styles.stampIdle}`}>{publishedAt ? `Last published ${istStamp(new Date(publishedAt))}` : "Not published yet"}</span>
          <div style={{ marginTop: 6 }}>Publishing updates the client&apos;s &ldquo;last updated&rdquo; time to now.</div>
        </div>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Publishing…" : "Publish update"}</button>
      </div>
    </form>
  );
}
