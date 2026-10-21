import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { listClientView } from "@/server/modules/client-accounts/client-records.service";
import { loadReporting } from "@/server/modules/client-accounts/client-daily.service";
import { LeadsView, type LeadItem } from "@/components/client/LeadsView";
import styles from "@/components/client/Dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads — SMASH Client Portal", robots: { index: false, follow: false } };

/** The leads your marketing has brought in and what happened to each, with a conversion summary. Read-only. */
export default async function ClientLeadsPage() {
  const { client, db } = await requirePortalSection("leads");
  const [leads, dashboard] = await Promise.all([listClientView(db, "leads", client.id) as unknown as Promise<LeadItem[]>, loadReporting(db, client.id).then((r) => r.dashboard)]);
  const reported = dashboard?.campaigns.reduce((sum, c) => sum + c.leads, 0) ?? dashboard?.leads ?? 0;
  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageHeadTitle}>Leads &amp; follow-ups</h1>
        <p className={styles.pageHeadSub}>Everyone who has enquired through your campaigns, and where each one stands.</p>
      </div>
      {leads.length ? (
        <LeadsView leads={leads} currency={dashboard?.currency ?? "INR"} />
      ) : (
        <div className={`${styles.empty} ${styles.reveal}`}>
          <span className={styles.emptyIcon}><Users size={30} strokeWidth={1.7} aria-hidden="true" /></span>
          <h2 className={styles.emptyTitle}>{reported > 0 ? `${reported} leads so far` : "No leads recorded yet"}</h2>
          <p className={styles.emptyText}>{reported > 0 ? "Your campaigns have generated these leads. The individual details and follow-up status will appear here once your team adds them." : "As your campaigns bring in enquiries, your team will list them here with their follow-up status."}</p>
        </div>
      )}
    </div>
  );
}
