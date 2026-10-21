"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { CLIENT_LEAD_STATUSES, CLIENT_LEAD_STATUS_LABEL, FOLLOW_UP_LABEL, formatMoney, type ClientCurrency } from "@/lib/client-options";
import { fmtDay } from "@/lib/client-format";
import { StatusPill, type PillTone } from "./StatusPill";
import styles from "./Dashboard.module.css";
import portal from "./Portal.module.css";

export type LeadItem = { id: string; name: string; phone: string | null; email: string | null; source: string; campaignName: string | null; status: string; receivedAt: string; value: number | null; followUpStatus: string; followUpAt: string | null };
const TONE: Record<string, PillTone> = { NEW: "info", CONTACTED: "warn", QUALIFIED: "info", CONVERTED: "ok", LOST: "bad" };

/** The client's lead log: how many came in and how far each got (the funnel), where they came from, and the list with follow-up status. Filtering is the only interaction. */
export function LeadsView({ leads, currency }: { leads: LeadItem[]; currency: ClientCurrency }) {
  const [filter, setFilter] = useState<string>("ALL");
  const count = (s: string) => (s === "ALL" ? leads.length : leads.filter((l) => l.status === s).length);
  const shown = useMemo(() => (filter === "ALL" ? leads : leads.filter((l) => l.status === filter)), [leads, filter]);
  const converted = count("CONVERTED");
  const sources = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leads) map.set(l.source, (map.get(l.source) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads]);
  const topSource = sources[0]?.[1] ?? 1;
  const upcoming = leads.filter((l) => l.followUpStatus === "SCHEDULED").length;

  return (
    <div className={portal.stack}>
      <div className={portal.cols}>
        <section className={`${styles.card} ${styles.reveal}`} aria-labelledby="funnel-heading">
          <div className={styles.cardHead}><div><h2 id="funnel-heading" className={styles.cardTitle}>Conversion summary</h2><p className={styles.cardSub}>{leads.length ? `${Math.round((converted / leads.length) * 100)}% of your leads have converted` : "No leads yet"}</p></div></div>
          <div className={portal.funnel}>
            {CLIENT_LEAD_STATUSES.map((s, i) => <div key={s} className={portal.funnelStep} style={{ "--i": i } as CSSProperties}><b>{count(s)}</b><span>{CLIENT_LEAD_STATUS_LABEL[s]}</span></div>)}
          </div>
          {upcoming ? <p className={portal.lead} style={{ margin: "16px 0 0" }}>{upcoming} follow-up{upcoming === 1 ? " is" : "s are"} scheduled.</p> : null}
        </section>
        <section className={`${styles.card} ${styles.reveal}`} style={{ "--d": 1 } as CSSProperties} aria-labelledby="source-heading">
          <div className={styles.cardHead}><div><h2 id="source-heading" className={styles.cardTitle}>Lead sources</h2><p className={styles.cardSub}>Where your leads come from</p></div></div>
          <ul className={portal.sources}>
            {sources.map(([source, n], i) => (
              <li key={source} className={portal.source} style={{ "--i": i } as CSSProperties}>
                <span>{source}</span>
                <span className={portal.bar}><span className={portal.barFill} style={{ "--pct": `${(n / topSource) * 100}%` } as CSSProperties} /></span>
                <b>{n}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={styles.tabs} role="group" aria-label="Filter leads by status" style={{ alignSelf: "flex-start", maxWidth: "100%", overflowX: "auto" }}>
        {["ALL", ...CLIENT_LEAD_STATUSES].map((s) => <button key={s} type="button" className={styles.tab} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s === "ALL" ? "All" : CLIENT_LEAD_STATUS_LABEL[s as keyof typeof CLIENT_LEAD_STATUS_LABEL]}<span className={styles.tabCount}>{count(s)}</span></button>)}
      </div>

      <div className={`${styles.card} ${styles.tableCard}`}>
        <table className={styles.table}>
          <thead><tr><th scope="col">Lead</th><th scope="col">Source</th><th scope="col">Received</th><th scope="col">Status</th><th scope="col">Follow-up</th><th scope="col" className={styles.num}>Value</th></tr></thead>
          <tbody key={filter}>
            {shown.map((l, i) => (
              <tr key={l.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                <td data-label="Lead"><span className={styles.campName}>{l.name}</span><span className={styles.campPlatform}>{[l.phone, l.email].filter(Boolean).join(" · ") || "—"}</span></td>
                <td data-label="Source">{l.source}{l.campaignName ? <span className={styles.campPlatform}>{l.campaignName}</span> : null}</td>
                <td data-label="Received" className={portal.nowrap}>{fmtDay(l.receivedAt)}</td>
                <td data-label="Status"><StatusPill label={CLIENT_LEAD_STATUS_LABEL[l.status as keyof typeof CLIENT_LEAD_STATUS_LABEL]} tone={TONE[l.status]} /></td>
                <td data-label="Follow-up">{l.followUpStatus === "NONE" ? <span className={portal.muted}>—</span> : <span className={portal.followChip}>{FOLLOW_UP_LABEL[l.followUpStatus as keyof typeof FOLLOW_UP_LABEL]}{l.followUpAt ? ` · ${fmtDay(l.followUpAt)}` : ""}</span>}</td>
                <td data-label="Value" className={styles.num}>{typeof l.value === "number" ? formatMoney(l.value, currency) : "—"}</td>
              </tr>
            ))}
            {shown.length === 0 ? <tr><td colSpan={6} className={portal.muted}>No leads with this status.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
