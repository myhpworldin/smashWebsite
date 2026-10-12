import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { getDb } from "@/server/db/client";
import { getCurrentAdmin } from "@/server/api/admin-session";
import { logger } from "@/server/lib/logger";
import { getLeadPrioritySummary, getLeadStatusSummary, listLeads } from "@/server/modules/leads/leads.service";
import { listLeadsQuerySchema } from "@/server/modules/leads/leads.schema";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { LeadPriorityBadge, LeadStatusBadge } from "@/components/admin/AdminBadge";
import { CardGrid } from "@/components/ui/CardGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/lead-options";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — SMASH CRM", robots: { index: false, follow: false } };

const formatDate = (value: Date) => value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Premium redesign (CRM admin visual overhaul): primary-vs-secondary hierarchy — Total/New/Converted
 * get full-size stat cards (the three numbers an admin needs at a glance), the full 6-status pipeline
 * and 3-tier priority breakdown render as lower-weight compact chip strips (real counts, not just
 * labels — the old "Lead Pipeline" section showed badges with no numbers at all), and Recent Leads
 * stays last. All real data (`getLeadStatusSummary`, the new `getLeadPrioritySummary`, `listLeads`) —
 * no charts, trends, or invented percentages. `limit: 15` + `.slice(0, 5)` is deliberate (Phase 8 QA
 * fix): `listLeadsQuerySchema`'s `limit` only accepts 15/25/50/100, so this is the smallest valid page
 * size, narrowed to 5 for display.
 */
export default async function AdminDashboardPage() {
  const admin = (await getCurrentAdmin())!;
  const db = getDb();

  let summary: Awaited<ReturnType<typeof getLeadStatusSummary>> | null = null;
  let prioritySummary: Awaited<ReturnType<typeof getLeadPrioritySummary>> | null = null;
  let recentLeads: Awaited<ReturnType<typeof listLeads>>["items"] = [];
  try {
    const [summaryRes, prioritySummaryRes, leadsRes] = await Promise.all([
      getLeadStatusSummary(db),
      getLeadPrioritySummary(db),
      listLeads(db, listLeadsQuerySchema.parse({ limit: 15, sort: "newest" })),
    ]);
    summary = summaryRes;
    prioritySummary = prioritySummaryRes;
    recentLeads = leadsRes.items.slice(0, 5);
  } catch (error) {
    // AdminErrorState's own safe default message — never the underlying error.
    logger.error("admin dashboard: failed to load lead overview", { error: error instanceof Error ? error.message : String(error) });
  }

  return (
    <>
      <AdminPageHeader title="Dashboard" description={`Welcome back, ${admin.email}.`} />

      <section aria-labelledby="lead-overview-heading" className={styles.section}>
        <h2 id="lead-overview-heading" className={styles.sectionHeading}>Lead Overview</h2>
        {summary ? (
          <CardGrid>
            <AdminStatCard label="Total Leads" value={String(summary.total)} />
            <AdminStatCard label="New" value={String(summary.NEW)} />
            <AdminStatCard label="Converted" value={String(summary.CONVERTED)} />
          </CardGrid>
        ) : (
          <AdminErrorState message="Unable to load lead counts. Please try again." retryHref="/admin" />
        )}
      </section>

      {summary && prioritySummary ? (
        <section aria-labelledby="pipeline-heading" className={styles.section}>
          <h2 id="pipeline-heading" className={styles.sectionHeading}>Lead Pipeline</h2>
          <AdminCard className={styles.pipelineCard}>
            <div className={styles.chipRow}>
              {LEAD_STATUSES.map((status) => (
                <span key={status} className={styles.chip}>
                  <LeadStatusBadge status={status} />
                  <span className={styles.chipCount}>{summary[status]}</span>
                </span>
              ))}
            </div>
            <p className={styles.chipRowLabel}>Priority</p>
            <div className={styles.chipRow}>
              {LEAD_PRIORITIES.map((priority) => (
                <span key={priority} className={styles.chip}>
                  <LeadPriorityBadge priority={priority} />
                  <span className={styles.chipCount}>{prioritySummary[priority]}</span>
                </span>
              ))}
            </div>
          </AdminCard>
        </section>
      ) : null}

      <section aria-labelledby="recent-leads-heading" className={styles.section}>
        <div className={styles.sectionHeadingRow}>
          <h2 id="recent-leads-heading" className={styles.sectionHeading}>Recent Leads</h2>
          {recentLeads.length ? <Link href="/admin/leads" className={styles.viewAll}>View all leads &rarr;</Link> : null}
        </div>
        <AdminCard>
          {!summary ? (
            <AdminErrorState message="Unable to load recent leads. Please try again." retryHref="/admin" />
          ) : recentLeads.length ? (
            <ul className={styles.recentList}>
              {recentLeads.map((lead) => (
                <li key={lead.id} className={styles.recentItem}>
                  <Link href={`/admin/leads/${lead.id}`} className={styles.recentLink}>
                    <span className={styles.recentName}>{lead.fullName}</span>
                    {lead.companyName ? <span className={styles.recentCompany}>{lead.companyName}</span> : null}
                  </Link>
                  <LeadStatusBadge status={lead.status} />
                  <span className={styles.recentDate}>{formatDate(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Inbox} message="No leads yet. Contact form submissions will appear here when a visitor submits the contact form." />
          )}
        </AdminCard>
      </section>
    </>
  );
}
