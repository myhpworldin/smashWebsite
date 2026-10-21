import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/server/db/client";
import { getRowById } from "@/server/db/helpers";
import { leads } from "@/server/db/schema";
import { orNotFound } from "@/server/seo/page-resolver";
import { getPublishedServiceBySlug } from "@/server/modules/services/services.service";
import { listLeadActivity } from "@/server/modules/leads/lead-activity.service";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { LEAD_PRIORITIES, LEAD_PRIORITY_LABEL, LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/lead-options";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { LeadPriorityBadge, LeadStatusBadge } from "@/components/admin/AdminBadge";
import { LeadActionsBar } from "@/components/admin/LeadActionsBar";
import { LeadEnumControl } from "@/components/admin/LeadEnumControl";
import { LeadAssignmentControl } from "@/components/admin/LeadAssignmentControl";
import { LeadNoteForm } from "@/components/admin/LeadNoteForm";
import { LeadNotesList } from "@/components/admin/LeadNotesList";
import { LeadActivityTimeline } from "@/components/admin/LeadActivityTimeline";
import styles from "./lead-detail.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Enquiry — SMASH CRM", robots: { index: false, follow: false } };

const formatDate = (value: Date) => value.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    <span className={styles.fieldValue}>{value}</span>
  </div>
);

/**
 * The full CRM Lead Detail workspace — replaces Phase 5's deliberately minimal, read-only
 * placeholder. CRM mutations (status, priority, assignment, notes) go through the Phase 6 API
 * (`/api/admin/leads/[id]`, `/api/admin/leads/[id]/notes`), itself gated by the same session auth
 * every other admin route already uses; this page reads its data directly via the service layer (the
 * same "page reads the service layer" convention every other page in this project follows), not by
 * calling its own API.
 *
 * The lead's own submitted contact/business fields (below) are deliberately read-only: an admin can
 * view everything a visitor told SMASH through the Contact form, but cannot edit it. There is no edit
 * form for these fields, and `leadUpdateSchema` has no keys for them — this isn't just a missing UI
 * affordance, the API itself cannot accept a change to them.
 */
export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireCurrentAdmin();
  const db = getDb();
  const lead = await orNotFound(() => getRowById(db, leads, id, "Lead"));
  const [service, activity] = await Promise.all([
    lead.primaryService ? getPublishedServiceBySlug(db, lead.primaryService).catch(() => null) : Promise.resolve(null),
    listLeadActivity(db, id),
  ]);

  return (
    <AdminPage
      eyebrow="Website enquiry"
      title={lead.fullName}
      description={lead.companyName ?? undefined}
      meta={<><LeadStatusBadge status={lead.status} /><LeadPriorityBadge priority={lead.priority} /></>}
      actions={<AdminButton href="/admin/leads" variant="onDark"><ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />Back to enquiries</AdminButton>}
    >
      <AdminCard reveal className={styles.summary}>
        <div className={styles.meta}>
          <span><b>Assigned to</b>{lead.assignedTo ?? "—"}</span>
          <span><b>Created</b>{formatDate(lead.createdAt)}</span>
          <span><b>Updated</b>{formatDate(lead.updatedAt)}</span>
        </div>
        <LeadActionsBar email={lead.email} phone={lead.phone} websiteOrInstagram={lead.websiteOrInstagram} />
      </AdminCard>

      <div className={styles.layout}>
        {/* Sidebar column: active CRM workflow — what an admin does right now. Rendered first in
            source order so it appears before the long-form content on mobile (single column),
            and is pinned to the right as a sticky column on desktop via the CSS grid below. */}
        <div className={styles.sidebarColumn}>
          <AdminCard reveal delay={1} className={styles.section}>
            <h2 className={styles.sectionHeading}>CRM Management</h2>
            <LeadEnumControl leadId={lead.id} field="status" label="Status" value={lead.status} options={LEAD_STATUSES} labels={LEAD_STATUS_LABEL} />
            <LeadEnumControl leadId={lead.id} field="priority" label="Priority" value={lead.priority} options={LEAD_PRIORITIES} labels={LEAD_PRIORITY_LABEL} />
            <LeadAssignmentControl leadId={lead.id} assignedTo={lead.assignedTo} currentAdminEmail={admin.email} />
          </AdminCard>

          <AdminCard reveal delay={2} className={styles.section}>
            <h2 className={styles.sectionHeading}>Internal Notes</h2>
            <p className={styles.internalNote}>Internal only — never shown on the public website.</p>
            <LeadNoteForm leadId={lead.id} />
            <LeadNotesList entries={activity} />
          </AdminCard>
        </div>

        {/* Main column: read-only reference material — what the visitor told us. */}
        <div className={styles.mainColumn}>
          <div className={styles.pair}>
            <AdminCard reveal delay={2}>
              <h2 className={styles.sectionHeading}>Contact Information</h2>
              <Field label="Full name" value={lead.fullName} />
              <Field label="Company" value={lead.companyName ?? "Not provided"} />
              <Field label="Work email" value={lead.email ? <a href={`mailto:${lead.email}`} className={styles.link}>{lead.email}</a> : "Not provided"} />
              <Field label="Phone" value={<a href={`tel:${lead.phone}`} className={styles.link}>{lead.phone}</a>} />
              <Field label="Website / Instagram" value={lead.websiteOrInstagram ? <a href={lead.websiteOrInstagram.startsWith("http") ? lead.websiteOrInstagram : `https://${lead.websiteOrInstagram}`} target="_blank" rel="noopener noreferrer" className={styles.link}>{lead.websiteOrInstagram}</a> : "Not provided"} />
              <Field label="Location" value={lead.location} />
            </AdminCard>

            <AdminCard reveal delay={3}>
              <h2 className={styles.sectionHeading}>Business Requirements</h2>
              <Field label="Primary service" value={service?.name ?? lead.primaryService ?? "Not provided"} />
              <Field label="Monthly marketing budget" value={lead.monthlyMarketingBudget ?? "Not provided"} />
              <Field label="Primary goal" value={lead.primaryGoal ?? "Not provided"} />
            </AdminCard>
          </div>

          <AdminCard reveal delay={3} className={styles.section}>
            <h2 className={styles.sectionHeading}>Business Context</h2>
            <p className={styles.context}>{lead.additionalContext ?? "No additional context submitted."}</p>
          </AdminCard>

          <AdminCard reveal delay={4} className={styles.section}>
            <h2 className={styles.sectionHeading}>Activity Timeline</h2>
            <LeadActivityTimeline entries={activity} />
          </AdminCard>
        </div>
      </div>
    </AdminPage>
  );
}
