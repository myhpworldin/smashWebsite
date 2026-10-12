import type { LeadActivityRow } from "@/server/modules/leads/lead-activity.service";
import { LEAD_PRIORITY_LABEL, LEAD_STATUS_LABEL } from "@/lib/lead-options";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./LeadActivityTimeline.module.css";

const formatDateTime = (value: Date) => value.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const label = <T extends string>(labels: Record<T, string>, value: unknown, fallback: string) =>
  typeof value === "string" && value in labels ? labels[value as T] : (value as string | null) ?? fallback;

/**
 * Turns one raw `lead_activity` row into the two lines a human reads (CRM Phase 6, Step 17) — never
 * the stored `type`/`previousValue`/`newValue` shape directly. Field-edit entries show only which
 * fields changed (`entry.message`, already built server-side in `updateLead`), never the actual
 * before/after values — deliberately less detail than a status/priority/assignment change gets,
 * matching Step 20's "do not expose excessive raw change payloads."
 */
function describe(entry: LeadActivityRow): { title: string; detail?: string } {
  switch (entry.type) {
    case "LEAD_CREATED":
      return { title: "Lead created" };
    case "STATUS_CHANGED":
      return { title: "Status changed", detail: `${label(LEAD_STATUS_LABEL, entry.previousValue, "—")} → ${label(LEAD_STATUS_LABEL, entry.newValue, "—")}` };
    case "PRIORITY_CHANGED":
      return { title: "Priority changed", detail: `${label(LEAD_PRIORITY_LABEL, entry.previousValue, "—")} → ${label(LEAD_PRIORITY_LABEL, entry.newValue, "—")}` };
    case "ASSIGNED":
      return { title: "Lead assigned", detail: String(entry.newValue ?? "—") };
    case "REASSIGNED":
      return { title: "Lead reassigned", detail: `${entry.previousValue} → ${entry.newValue}` };
    case "UNASSIGNED":
      return { title: "Lead unassigned", detail: `${entry.previousValue} → Unassigned` };
    case "NOTE_ADDED":
      return { title: "Internal note added" };
    case "LEAD_UPDATED":
      return { title: "Lead information updated", detail: entry.message ?? undefined };
    default:
      return { title: entry.type };
  }
}

export function LeadActivityTimeline({ entries }: { entries: LeadActivityRow[] }) {
  if (!entries.length) return <EmptyState message="No activity yet." />;
  return (
    <ol className={styles.list}>
      {entries.map((entry) => {
        const { title, detail } = describe(entry);
        return (
          <li key={entry.id} className={styles.item}>
            <span className={styles.dot} aria-hidden="true" />
            <div className={styles.title}>{title}</div>
            {detail ? <div className={styles.detail}>{detail}</div> : null}
            <div className={styles.meta}>
              {entry.actor ? `by ${entry.actor}` : "System"} &middot; <time dateTime={entry.createdAt.toISOString()}>{formatDateTime(entry.createdAt)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
