"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABEL, formatCount, formatMoney, type CampaignStatus, type ClientCurrency } from "@/lib/client-options";
import { campaignMetrics, sumCampaigns } from "@/lib/client-metrics";
import { fmtDay } from "@/lib/client-format";
import type { ClientCampaign } from "@/server/db/schema";
import { StatusPill, type PillTone } from "./StatusPill";
import styles from "./Dashboard.module.css";
import portal from "./Portal.module.css";

type Filter = "ALL" | CampaignStatus;
const TONE: Record<CampaignStatus, PillTone> = { ACTIVE: "ok", PAUSED: "warn", ENDED: "neutral" };
const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

/** The campaigns page: totals that follow the status filter (spend, reach, impressions, clicks, leads, CPL, revenue, ROAS …) and one report card per campaign with its own results. Read-only. */
export function CampaignReports({ campaigns, currency }: { campaigns: ClientCampaign[]; currency: ClientCurrency }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const shown = useMemo(() => (filter === "ALL" ? campaigns : campaigns.filter((c) => c.status === filter)), [campaigns, filter]);
  const total = useMemo(() => sumCampaigns(shown), [shown]);
  const m = campaignMetrics(total);
  const count = (f: Filter) => (f === "ALL" ? campaigns.length : campaigns.filter((c) => c.status === f).length);
  const tabs: Filter[] = ["ALL", ...CAMPAIGN_STATUSES.filter((s) => count(s) > 0)];
  const n = (v: number) => formatCount(v, currency);
  const tiles: { label: string; value: string }[] = [
    { label: "Ad spend", value: formatMoney(total.spent, currency) },
    { label: "Reach", value: n(total.reach) },
    { label: "Impressions", value: n(total.impressions) },
    { label: "Clicks", value: n(total.clicks) },
    { label: "Leads", value: n(total.leads) },
    { label: "Cost per lead", value: m.costPerLead === null ? "—" : formatMoney(m.costPerLead, currency) },
    { label: "Conversions", value: n(total.conversions) },
    { label: "Engagement", value: n(total.engagement) },
    { label: "Revenue", value: formatMoney(total.revenue, currency) },
    { label: "ROAS", value: m.roas === null ? "—" : `${m.roas.toFixed(2)}×` },
  ];

  return (
    <>
      <div className={`${styles.totals} ${portal.totals5} ${styles.reveal}`} aria-live="polite">
        {tiles.map((t) => <div key={t.label} className={styles.total}><span className={styles.totalLabel}>{t.label}</span><span className={styles.totalValue}>{t.value}</span></div>)}
      </div>
      <div className={`${styles.sectionHead} ${styles.reveal}`} style={{ "--d": 1 } as CSSProperties}>
        <div className={styles.tabs} role="group" aria-label="Filter campaigns by status">
          {tabs.map((f) => <button key={f} type="button" className={styles.tab} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "ALL" ? "All" : CAMPAIGN_STATUS_LABEL[f]}<span className={styles.tabCount}>{count(f)}</span></button>)}
        </div>
      </div>
      <div key={filter} className={portal.stack}>
        {shown.map((c, i) => {
          const cm = campaignMetrics(c);
          const used = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
          return (
            <article key={c.id} className={portal.project} style={{ "--i": i } as CSSProperties} aria-label={c.name}>
              <div className={portal.projectHead}>
                <div><h3 className={portal.projectName}>{c.name}</h3><p className={portal.projectType}>{c.platform}{c.startDate ? ` · started ${fmtDay(c.startDate)}` : ""}</p></div>
                <StatusPill label={CAMPAIGN_STATUS_LABEL[c.status]} tone={TONE[c.status]} live={c.status === "ACTIVE"} />
              </div>
              <div className={portal.timeline}>
                <div className={portal.timelineTop}><span>Spent <b>{formatMoney(c.spent, currency)}</b> of {formatMoney(c.budget, currency)}</span><b>{used}%</b></div>
                <span className={portal.bar} role="img" aria-label={`${used}% of the campaign budget spent`}><span className={portal.barFill} data-tone={c.spent > c.budget ? "bad" : undefined} style={{ "--pct": `${used}%` } as CSSProperties} /></span>
              </div>
              <dl className={portal.kv} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "14px 18px" }}>
                {[
                  ["Reach", n(c.reach ?? 0)], ["Impressions", n(c.impressions ?? 0)], ["Clicks", n(c.clicks ?? 0)], ["CTR", pct(cm.clickThroughRate)],
                  ["Leads", n(c.leads)], ["Cost per lead", cm.costPerLead === null ? "—" : formatMoney(cm.costPerLead, currency)], ["Conversions", n(c.conversions ?? 0)], ["Engagement", n(c.engagement ?? 0)],
                  ["Revenue", formatMoney(c.revenue ?? 0, currency)], ["ROAS", cm.roas === null ? "—" : `${cm.roas.toFixed(2)}×`],
                ].map(([label, value]) => <div key={label}><dt style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--client-subtle)" }}>{label}</dt><dd style={{ fontSize: "1.0625rem", fontVariantNumeric: "tabular-nums" }}>{value}</dd></div>)}
              </dl>
            </article>
          );
        })}
      </div>
    </>
  );
}
