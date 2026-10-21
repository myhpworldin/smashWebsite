import Link from "next/link";
import type { CSSProperties } from "react";
import { AlertCircle, ArrowRight, BarChart3, Briefcase, CalendarClock, Check, ClipboardList, Megaphone, MessageSquareQuote, Receipt, Users, Wallet } from "lucide-react";
import { getDb } from "@/server/db/client";
import { deriveInsights } from "@/server/modules/client-accounts/client-dashboard.service";
import { loadReporting } from "@/server/modules/client-accounts/client-daily.service";
import { dailySeries, lastDays } from "@/lib/client-daily";
import { loadOverview } from "@/server/modules/client-accounts/client-overview.service";
import { effectiveSections, findWorkspace } from "@/server/modules/client-accounts/client-workspace.service";
import type { PublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import type { PortalSection } from "@/lib/client-options";
import { fmtDay } from "@/lib/client-format";
import { FreshnessBadge, UpdatedChip } from "./Freshness";
import { StatTile } from "./StatTile";
import { BudgetPanel } from "./BudgetPanel";
import { TrendChart } from "./TrendChart";
import { CampaignTable } from "./CampaignTable";
import styles from "./Dashboard.module.css";
import portal from "./Portal.module.css";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const HREF: Record<PortalSection, string> = { overview: "/client", projects: "/client/projects", campaigns: "/client/campaigns", content: "/client/content", leads: "/client/leads", billing: "/client/billing", support: "/client/support", account: "/client/account" };
const KIND_ICON = { creatives: ClipboardList, invoices: Receipt, terms: AlertCircle, tickets: AlertCircle } as const;
const DEADLINE_ICON = { project: Briefcase, invoice: Receipt, meeting: CalendarClock, content: ClipboardList } as const;

/**
 * The client's dashboard: the six overview figures (worked out from what their account team entered), what needs them, what is coming
 * up, then the campaign picture. Rendered by the signed-in portal and, with `preview`, by an administrator checking what a client sees
 * (no polling, no visit recorded, links stay inside the preview). Read-only.
 */
export async function DashboardView({ client, preview }: { client: PublicClientAccount; preview?: boolean }) {
  const db = getDb();
  const [{ dashboard: data, daily }, overview, workspace] = await Promise.all([loadReporting(db, client.id), loadOverview(db, client.id), findWorkspace(db, client.id)]);
  // With daily numbers the chart shows the last two weeks day by day; a client still on monthly figures keeps the monthly chart.
  const window = lastDays(14);
  const chartPoints = daily.length ? dailySeries(daily, window.from, window.to) : data?.monthly ?? [];
  const sections = effectiveSections(workspace, client.services);
  const link = (s: PortalSection) => (preview ? `/admin/clients/${client.id}` : HREF[s]);
  const updatedAt = data?.dataUpdatedAt ? data.dataUpdatedAt.toISOString() : null;
  const isNew = !!data?.dataUpdatedAt && (!client.lastViewedAt || data.dataUpdatedAt.getTime() > client.lastViewedAt.getTime());
  const published = !!data && !!updatedAt;
  const insights = data ? deriveInsights(data) : null;
  const topCampaigns = data?.campaigns.slice().sort((a, b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE") || b.spent - a.spent).slice(0, 5) ?? [];
  const has = (s: PortalSection) => sections.includes(s);
  const money = overview.currency;

  return (
    <>
      <section className={styles.hero} aria-labelledby="dashboard-heading">
        <span className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.wrap}>
          <div className={styles.heroRow}>
            <div>
              <p className={styles.eyebrow}>Dashboard</p>
              <h1 id="dashboard-heading" className={styles.title}>Welcome back, {firstName(client.contactName)}</h1>
              <p className={styles.sub}>
                <span>{client.companyName}</span>
                {data?.periodLabel ? <span className={styles.period}>{data.periodLabel}</span> : null}
              </p>
            </div>
            <FreshnessBadge updatedAt={updatedAt} isNew={isNew} preview={preview} />
          </div>
        </div>
      </section>

      <div className={`${styles.wrap} ${styles.body}`}>
        <div className={portal.stats3}>
          <StatTile label="Active projects" value={overview.activeProjects} currency={money} icon={Briefcase} accent="blue" delay={0} note="Planning, in progress or in review" />
          <StatTile label="Active campaigns" value={overview.activeCampaigns} currency={money} icon={Megaphone} accent="green" delay={1} note={data?.campaigns.length ? `${data.campaigns.length} in total` : "Currently running"} />
          <StatTile label="Total leads generated" value={overview.totalLeads} currency={money} icon={Users} accent="blue" delay={2} note="People who enquired through your marketing" />
          <StatTile label="Total ad spend" value={overview.totalAdSpend} kind="money" currency={money} icon={Wallet} accent="navy" delay={3} note="Across all campaigns" />
          <StatTile label="Pending tasks / approvals" value={overview.pending.total} currency={money} icon={ClipboardList} accent="red" delay={4} note={overview.pending.total ? "Waiting for you" : "You are all caught up"} />
          <StatTile label="Upcoming deadlines" value={overview.deadlines.length} currency={money} icon={CalendarClock} accent="navy" delay={5} note="Next 30 days" />
        </div>

        <div className={`${styles.section} ${portal.cols}`}>
          <section className={`${styles.card} ${styles.scrollReveal}`} aria-labelledby="pending-heading">
            <div className={styles.cardHead}><div><h2 id="pending-heading" className={styles.cardTitle}>Pending tasks &amp; approvals</h2><p className={styles.cardSub}>What needs your attention</p></div></div>
            {overview.pending.items.length === 0 ? (
              <p className={portal.allClear}><span className={portal.todoIcon} data-tone="ok"><Check size={18} strokeWidth={2.4} aria-hidden="true" /></span>Nothing is waiting for you right now.</p>
            ) : (
              <ul className={portal.todos}>
                {overview.pending.items.map((item, i) => {
                  const Icon = KIND_ICON[item.kind];
                  return (
                    <li key={item.kind} className={portal.todo} style={{ "--i": i } as CSSProperties}>
                      <span className={portal.todoIcon} data-tone={item.kind === "invoices" ? "warn" : undefined}><Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>
                      <span className={portal.todoText}>{item.label}<small>{item.count} item{item.count === 1 ? "" : "s"}</small></span>
                      <Link href={link(item.section)} className={portal.todoLink}>Review <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" /></Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={`${styles.card} ${styles.scrollReveal}`} aria-labelledby="deadlines-heading">
            <div className={styles.cardHead}><div><h2 id="deadlines-heading" className={styles.cardTitle}>Upcoming deadlines</h2><p className={styles.cardSub}>The next 30 days, plus anything overdue</p></div></div>
            {overview.deadlines.length === 0 ? (
              <p className={portal.allClear}><span className={portal.todoIcon}><CalendarClock size={18} strokeWidth={1.9} aria-hidden="true" /></span>No deadlines coming up.</p>
            ) : (
              <ul className={portal.todos}>
                {overview.deadlines.slice(0, 5).map((d, i) => {
                  const Icon = DEADLINE_ICON[d.kind];
                  return (
                    <li key={`${i}-${d.kind}-${d.date}`} className={portal.todo} style={{ "--i": i } as CSSProperties}>
                      <span className={portal.todoIcon} data-tone={d.overdue ? "bad" : undefined}><Icon size={18} strokeWidth={1.9} aria-hidden="true" /></span>
                      <span className={portal.todoText}>{d.title}<small>{d.overdue ? `Overdue — was ${fmtDay(d.date)}` : fmtDay(d.date)}</small></span>
                      <Link href={link(d.section)} className={portal.todoLink}>Open <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" /></Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {published && data && insights ? (
          <>
            {chartPoints.length || data.totalBudget > 0 || data.amountSpent > 0 ? (
              <div className={`${styles.section} ${styles.split}`}>
                {chartPoints.length ? <TrendChart points={chartPoints} period={daily.length ? "day" : "month"} currency={data.currency} updatedAt={updatedAt} /> : <div />}
                <BudgetPanel currency={data.currency} totalBudget={data.totalBudget} amountSpent={data.amountSpent} insights={insights} updatedAt={updatedAt} />
              </div>
            ) : null}

            {data.note ? (
              <div className={`${styles.section} ${styles.note} ${styles.scrollReveal}`}>
                <span className={styles.noteIcon}><MessageSquareQuote size={20} strokeWidth={1.9} aria-hidden="true" /></span>
                <div>
                  <p className={styles.noteLabel}>A note from your account team</p>
                  <p className={styles.noteText}>{data.note}</p>
                </div>
              </div>
            ) : null}

            {topCampaigns.length && has("campaigns") ? (
              <section className={`${styles.section} ${styles.scrollReveal}`} aria-labelledby="campaigns-heading">
                <div className={styles.sectionHead}>
                  <h2 id="campaigns-heading" className={styles.sectionTitle}>Your campaigns</h2>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <UpdatedChip updatedAt={updatedAt} />
                    <Link href={link("campaigns")} className={styles.sectionLink}>View all {data.campaigns.length} <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></Link>
                  </span>
                </div>
                <CampaignTable campaigns={topCampaigns} currency={data.currency} />
              </section>
            ) : null}
          </>
        ) : (
          <div className={`${styles.section} ${styles.empty} ${styles.reveal}`}>
            <span className={styles.emptyIcon}><BarChart3 size={30} strokeWidth={1.7} aria-hidden="true" /></span>
            <h2 className={styles.emptyTitle}>Your first report is on its way</h2>
            <p className={styles.emptyText}>Your account is set up. As soon as your SMASH team publishes your campaign figures, they will appear here — along with the time they were last updated.</p>
          </div>
        )}
      </div>
    </>
  );
}
