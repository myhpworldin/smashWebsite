import type { CSSProperties } from "react";
import Link from "next/link";
import { Calendar, Mail, MapPin, Phone, Tag } from "lucide-react";
import { LeadStatusBadge } from "@/components/admin/AdminBadge";
import { LeadRowActions } from "@/components/admin/LeadRowActions";
import { LEAD_SOURCE_LABEL, type LeadSource, type LeadStatus } from "@/lib/lead-options";
import styles from "./LeadsTable.module.css";

/**
 * What the Leads list actually has per row — real Phase 1 Lead model fields, nothing invented.
 * `serviceName` is resolved from `primaryService` (a slug) by the page, once, against the published
 * services list. Priority and Monthly Budget are deliberately not shown here — both remain fully
 * visible on the Lead Detail page; leaving them off this list is a density decision, not a data change.
 */
export type LeadTableRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  location: string;
  companyName: string | null;
  serviceName: string | null;
  additionalContext: string | null;
  status: LeadStatus;
  source: LeadSource;
  assignedTo: string | null;
  createdAt: Date;
};

/** Server time, same `toLocaleDateString` approach already used elsewhere in this codebase (`InsightHeader.tsx`) — consistent with the one existing precedent rather than a one-off fix just for this list. */
const formatDate = (value: Date) => value.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function LeadsTable({ leads, currentAdminEmail }: { leads: LeadTableRow[]; currentAdminEmail: string }) {
  return (
    <ul className={styles.list}>
      {leads.map((lead, i) => (
        <li key={lead.id} className={styles.row} data-new={lead.status === "NEW" || undefined} style={{ "--i": Math.min(i, 10) } as CSSProperties}>
          <span className={styles.avatar} aria-hidden="true">{lead.fullName.charAt(0).toUpperCase()}</span>

          <div className={styles.body}>
            <div className={styles.headline}>
              <Link href={`/admin/leads/${lead.id}`} className={styles.name}>{lead.fullName}</Link>
              {lead.companyName ? <span className={styles.company}>{lead.companyName}</span> : null}
            </div>

            <div className={styles.badgeRow}>
              <LeadStatusBadge status={lead.status} />
              <span className={styles.sourceTag}>{LEAD_SOURCE_LABEL[lead.source]}</span>
              {lead.assignedTo ? <span className={styles.assignedTag}>Assigned: {lead.assignedTo}</span> : null}
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detail}><Phone size={13} strokeWidth={1.75} className={styles.icon} aria-hidden="true" /> {lead.phone}</span>
              {lead.email ? <span className={styles.detail}><Mail size={13} strokeWidth={1.75} className={styles.icon} aria-hidden="true" /> {lead.email}</span> : null}
              <span className={styles.detail}><MapPin size={13} strokeWidth={1.75} className={styles.icon} aria-hidden="true" /> {lead.location}</span>
              <span className={styles.detail}><Calendar size={13} strokeWidth={1.75} className={styles.icon} aria-hidden="true" /> {formatDate(lead.createdAt)}</span>
            </div>

            {lead.serviceName ? (
              <div className={styles.serviceRow}><Tag size={13} strokeWidth={1.75} className={styles.icon} aria-hidden="true" /> {lead.serviceName}</div>
            ) : null}

            {lead.additionalContext ? (
              <p className={styles.context}>{lead.additionalContext}</p>
            ) : null}
          </div>

          <div className={styles.actions}>
            <Link href={`/admin/leads/${lead.id}`} className={styles.viewLink}>View<span className="sr-only"> {lead.fullName}</span></Link>
            <LeadRowActions leadId={lead.id} leadName={lead.fullName} status={lead.status} assignedTo={lead.assignedTo} currentAdminEmail={currentAdminEmail} />
          </div>
        </li>
      ))}
    </ul>
  );
}
