import Link from "next/link";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/lead-options";
import type { LeadStatusSummary } from "@/server/modules/leads/leads.service";
import styles from "./LeadStatusTabs.module.css";

/**
 * Pill-style status tabs with live counts — the admin-panel reference this layout follows uses these
 * (not a dropdown) as both the status filter *and* the at-a-glance count display, so this one
 * component replaces what used to be two separate things (the compact stats strip and the status
 * `<select>` in the filter form). Every count comes from the real `getLeadStatusSummary` aggregation,
 * unfiltered by any other active filter — the reference's own "All 178 / New 113 / Contacted 64"
 * reads the same way, a stable overview of the whole table, not a number that changes meaning the
 * moment you're already filtering by status.
 */
export function LeadStatusTabs({ summary, activeStatus, basePath, baseQuery }: { summary: LeadStatusSummary; activeStatus: LeadStatus | ""; basePath: string; baseQuery: Record<string, string> }) {
  const hrefFor = (status: LeadStatus | "") => {
    const params = new URLSearchParams(baseQuery);
    if (status) params.set("status", status);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Filter leads by status" className={styles.tabs}>
      <Link href={hrefFor("")} aria-current={activeStatus === "" ? "page" : undefined} className={styles.tab}>
        All <span className={styles.count}>{summary.total}</span>
      </Link>
      {LEAD_STATUSES.map((status) => (
        <Link key={status} href={hrefFor(status)} aria-current={activeStatus === status ? "page" : undefined} className={styles.tab}>
          {LEAD_STATUS_LABEL[status]} <span className={styles.count}>{summary[status]}</span>
        </Link>
      ))}
    </nav>
  );
}
