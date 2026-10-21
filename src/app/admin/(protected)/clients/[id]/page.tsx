import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { AlertCircle, ArrowRight, Briefcase, CalendarClock, Check, ClipboardList, Megaphone, Receipt, Users, Wallet } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { countWhere } from "@/server/db/helpers";
import { clientProjects } from "@/server/db/schema";
import { loadAttention, loadOverview, onboardingChecklist, type OverviewPending } from "@/server/modules/client-accounts/client-overview.service";
import { effectiveSections } from "@/server/modules/client-accounts/client-workspace.service";
import { PORTAL_SECTIONS, PORTAL_SECTION_LABEL, formatMoney, type PortalSection } from "@/lib/client-options";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { fmtDay } from "@/components/admin/workspace/format";
import clients from "@/components/admin/AdminClients.module.css";
import styles from "@/components/admin/workspace/Workspace.module.css";
import { loadAccount, loadDashboard, loadWorkspace } from "./data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client overview — SMASH CRM", robots: { index: false, follow: false } };

/** Which workspace tab edits what the client's portal page shows. */
const TAB_OF: Record<PortalSection, string> = { overview: "", projects: "projects", campaigns: "campaigns", content: "creative", leads: "leads", billing: "billing", support: "support", account: "profile" };
const KIND_ICON = { creatives: ClipboardList, invoices: Receipt, terms: AlertCircle, tickets: AlertCircle } as const;
const DEADLINE_ICON = { project: Briefcase, invoice: Receipt, meeting: CalendarClock, content: ClipboardList } as const;

/**
 * Overview — exactly what the client's Dashboard Overview shows (`loadOverview` is the same function the portal calls), plus what only the
 * SMASH team needs: what is waiting on us, what is waiting on the client, and how far through onboarding this client is.
 */
export default async function ClientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const db = getDb();
  const [account, workspace, dashboard] = await Promise.all([loadAccount(id), loadWorkspace(id), loadDashboard(id)]);
  const [overview, attention, projectCount] = await Promise.all([loadOverview(db, id), loadAttention(db, id), countWhere(db, clientProjects, { accountId: id })]);
  const checklist = onboardingChecklist(workspace, { projects: projectCount, campaigns: dashboard?.campaigns.length ?? 0, services: account.services.length, budget: (dashboard?.totalBudget ?? 0) > 0 });
  const done = checklist.filter((c) => c.done).length;
  const on = effectiveSections(workspace, account.services);
  const href = (section: PortalSection) => `/admin/clients/${id}${TAB_OF[section] ? `/${TAB_OF[section]}` : ""}`;
  const ours = [
    { n: overview.budget.state === "none" ? 1 : 0, label: "Total ad budget is not set", tab: "campaigns?view=setup" },
    { n: overview.budget.state === "full" ? 1 : 0, label: "The ad budget is used up", tab: "campaigns?view=setup" },
    { n: attention.daily, label: "Daily performance update is overdue", tab: "campaigns" },
    { n: attention.tickets, label: "Tickets waiting for a reply", tab: "support" },
    { n: attention.creatives, label: "Content the client sent back", tab: "creative" },
    { n: attention.invoices, label: "Overdue invoices to chase", tab: "billing" },
  ].filter((a) => a.n > 0);
  const mismatch = overview.leadLogCount > 0 && overview.campaignLeads > 0 && overview.leadLogCount !== overview.campaignLeads;

  return (
    <>
      <div className={styles.tiles}>
        <AdminStatCard label="Active projects" value={overview.activeProjects} icon={Briefcase} accent="blue" delay={0} note="Planning, in progress or in review" />
        <AdminStatCard label="Active campaigns" value={overview.activeCampaigns} icon={Megaphone} accent="green" delay={1} note="Currently running" />
        <AdminStatCard label="Leads generated" value={overview.totalLeads} icon={Users} accent="blue" delay={2} note={overview.leadsSource === "log" ? "Counted from the lead log" : "As reported by campaigns"} />
        <AdminStatCard label="Total ad spend" value={overview.totalAdSpend} money={overview.currency} icon={Wallet} accent="navy" delay={3} note={overview.budget.state === "none" ? "No total budget set" : `${formatMoney(overview.budget.remaining, overview.currency)} left of ${formatMoney(overview.budget.total, overview.currency)}`} />
        <AdminStatCard label="Pending tasks / approvals" value={overview.pending.total} icon={ClipboardList} accent="red" delay={4} note="Waiting on the client" />
        <AdminStatCard label="Upcoming deadlines" value={overview.deadlines.length} icon={CalendarClock} accent="navy" delay={5} note="Next 30 days, plus anything overdue" />
      </div>
      {mismatch ? <p className={styles.hint}>The lead log has {overview.leadLogCount} lead{overview.leadLogCount === 1 ? "" : "s"} but the campaigns report {overview.campaignLeads}. The overview counts from the log; update whichever is out of date.</p> : null}

      <div className={`${styles.cols}`} style={{ marginTop: 18 }}>
        <AdminCard reveal delay={5}>
          <h2 className={clients.cardTitle}>Pending tasks &amp; approvals</h2>
          <p className={clients.cardHint}>What the client has to do — shown on their dashboard.</p>
          {overview.pending.items.length === 0 ? (
            <AdminEmptyState bare icon={Check} message="Nothing waiting on the client." />
          ) : (
            <ul className={styles.listPlain}>
              {overview.pending.items.map((item: OverviewPending, i) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.kind} className={styles.listItem} style={{ "--i": i } as CSSProperties}>
                    <span className={`${styles.itemIcon} ${item.kind === "invoices" ? styles.warn : ""}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                    <span className={styles.itemText}>{item.label}<small>{item.count} item{item.count === 1 ? "" : "s"}</small></span>
                    <Link href={href(item.section)} className={styles.itemLink}>Open</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        <AdminCard reveal delay={6}>
          <h2 className={clients.cardTitle}>Upcoming deadlines</h2>
          <p className={clients.cardHint}>Project completions, invoice due dates, meetings and content to approve.</p>
          {overview.deadlines.length === 0 ? (
            <AdminEmptyState bare icon={CalendarClock} message="No deadlines in the next 30 days." />
          ) : (
            <ul className={styles.listPlain}>
              {overview.deadlines.slice(0, 6).map((d, i) => {
                const Icon = DEADLINE_ICON[d.kind];
                return (
                  <li key={`${i}-${d.kind}-${d.date}`} className={styles.listItem} style={{ "--i": i } as CSSProperties}>
                    <span className={`${styles.itemIcon} ${d.overdue ? styles.bad : ""}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                    <span className={styles.itemText}>{d.title}<small>{d.overdue ? `Overdue — was ${fmtDay(d.date)}` : fmtDay(d.date)}</small></span>
                    <Link href={href(d.section)} className={styles.itemLink}>Open</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>

        <AdminCard reveal delay={7}>
          <h2 className={clients.cardTitle}>Waiting on the SMASH team</h2>
          <p className={clients.cardHint}>Replies and follow-ups this client is expecting from you.</p>
          {ours.length === 0 ? (
            <AdminEmptyState bare icon={Check} message="You are all caught up for this client." />
          ) : (
            <ul className={styles.listPlain}>
              {ours.map((a, i) => (
                <li key={a.tab} className={styles.listItem} style={{ "--i": i } as CSSProperties}>
                  <span className={`${styles.itemIcon} ${styles.bad}`}><AlertCircle size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className={styles.itemText}>{a.label}<small>{a.n} item{a.n === 1 ? "" : "s"}</small></span>
                  <Link href={`/admin/clients/${id}/${a.tab}`} className={styles.itemLink}>Open</Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard reveal delay={8}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={clients.cardTitle}>Onboarding checklist</h2>
              <p className={clients.cardHint}>{done} of {checklist.length} steps done.</p>
            </div>
          </div>
          <div className={styles.meter} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={checklist.length} aria-label="Onboarding progress"><span style={{ width: `${(done / checklist.length) * 100}%` }} /></div>
          {checklist.map((c) => (
            <Link key={c.key} href={`/admin/clients/${id}/${c.tab}`} className={styles.check} data-done={c.done}>
              <span className={styles.tick}><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
              <span className={styles.checkLabel}>{c.label}</span>
              {!c.done ? <ArrowRight size={14} aria-hidden="true" style={{ marginLeft: "auto", color: "var(--admin-text-subtle)" }} /> : null}
            </Link>
          ))}
        </AdminCard>
      </div>

      <AdminCard reveal delay={9} className={clients.stack}>
        <h2 className={clients.cardTitle}>What the client sees</h2>
        <p className={clients.cardHint} style={{ marginBottom: 0 }}>Pages in their portal: {PORTAL_SECTIONS.filter((s) => on.includes(s)).map((s) => PORTAL_SECTION_LABEL[s]).join(", ")}. Change this under <Link href={`/admin/clients/${id}/profile`} style={{ color: "var(--admin-blue)", fontWeight: 600 }}>Profile</Link>.</p>
      </AdminCard>
    </>
  );
}
