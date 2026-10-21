import { CAMPAIGN_STATUS_LABEL, formatCount, formatMoney, type ClientCurrency } from "@/lib/client-options";
import type { ClientCampaign } from "@/server/db/schema";
import styles from "./Dashboard.module.css";

/** A recognisable brand colour per platform, so the list scans at a glance. Anything else is the portal navy. */
const PLATFORM_COLOR: Record<string, string> = {
  "Google Ads": "#4285f4", "Meta Ads": "#0866ff", Instagram: "#d6249f", YouTube: "#e62117", LinkedIn: "#0a66c2", WhatsApp: "#1faa59", SEO: "#7a4cff",
};
const abbreviation = (platform: string) => platform.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/**
 * The campaigns as a table that turns into stacked cards on a phone (each cell carries its label in `data-label`). Spend shows
 * against the campaign's own budget as a bar that fills in; a bar goes red when spend passes budget. Read-only.
 */
export function CampaignTable({ campaigns, currency }: { campaigns: ClientCampaign[]; currency: ClientCurrency }) {
  return (
    <div className={`${styles.card} ${styles.tableCard}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Campaign</th>
            <th scope="col">Status</th>
            <th scope="col">Spend vs budget</th>
            <th scope="col" className={styles.num}>Leads</th>
            <th scope="col" className={styles.num}>Calls</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => {
            const pct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
            return (
              <tr key={c.id} style={{ "--i": i } as React.CSSProperties}>
                <td data-label="Campaign">
                  <div className={styles.camp}>
                    <span className={styles.platform} style={{ "--pc": PLATFORM_COLOR[c.platform] } as React.CSSProperties} aria-hidden="true">{abbreviation(c.platform)}</span>
                    <span>
                      <span className={styles.campName} title={c.name}>{c.name}</span>
                      <span className={styles.campPlatform}>{c.platform}</span>
                    </span>
                  </div>
                </td>
                <td data-label="Status"><span className={`${styles.status} ${styles[`status${c.status}`]}`}><i className={styles.statusDot} aria-hidden="true" />{CAMPAIGN_STATUS_LABEL[c.status]}</span></td>
                <td data-label="Spend">
                  <div className={styles.spend}>
                    <div className={styles.spendTop}><strong>{formatMoney(c.spent, currency)}</strong><span style={{ color: "var(--client-subtle)" }}>of {formatMoney(c.budget, currency)}</span></div>
                    <span className={styles.track} role="img" aria-label={`${pct}% of the campaign budget spent`}><span className={styles.fill} data-over={c.spent > c.budget || undefined} style={{ "--pct": `${pct}%` } as React.CSSProperties} /></span>
                  </div>
                </td>
                <td data-label="Leads" className={styles.num}>{formatCount(c.leads, currency)}</td>
                <td data-label="Calls" className={styles.num}>{formatCount(c.calls, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
