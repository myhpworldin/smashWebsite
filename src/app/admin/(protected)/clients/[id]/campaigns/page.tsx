import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Settings2 } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listDailyEntries } from "@/server/modules/client-accounts/client-daily.service";
import { addDays, istDay } from "@/lib/client-dates";
import { applyDaily, dailySeries, latestDay, lastDays, sumFigures, type DailyMetric } from "@/lib/client-daily";
import { projectedSpend } from "@/lib/client-budget";
import { ClientDashboardEditor } from "@/components/admin/ClientDashboardEditor";
import { DailyUpdate, type RecentDay } from "@/components/admin/DailyUpdate";
import { BudgetSummary } from "@/components/admin/BudgetSummary";
import clients from "@/components/admin/AdminClients.module.css";
import tab from "@/components/admin/workspace/Workspace.module.css";
import { loadAccount, loadDashboard } from "../data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campaigns — SMASH CRM", robots: { index: false, follow: false } };

const RECENT_DAYS = 14;
const CHART_DAYS = 30;

/**
 * Campaigns — two parts. **Daily update** (the default): the numbers recorded every day, which the client's totals and charts are built from.
 * **Campaign setup**: the campaigns themselves (name, platform, status, budget) and the dashboard's note and currency. Read-only for the client.
 */
export default async function ClientCampaignsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string; view?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  await requireCurrentAdmin();
  const today = istDay(new Date());
  const date = query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date) && query.date <= today ? query.date : today;
  const setup = query.view === "setup";
  const base = `/admin/clients/${id}/campaigns`;

  const [account, dashboard, daily] = await Promise.all([loadAccount(id), loadDashboard(id), listDailyEntries(getDb(), id)]);
  const recentFrom = addDays(today, -(RECENT_DAYS - 1));
  const recent: RecentDay[] = [];
  for (let day = today; day >= recentFrom; day = addDays(day, -1)) {
    const rows = daily.filter((r) => r.date === day);
    const t = sumFigures(rows);
    recent.push({ date: day, spend: t.spend, leads: t.leads, calls: t.calls, hasData: rows.length > 0 });
  }
  const saved: Record<string, Partial<Record<DailyMetric, number>>> = {};
  for (const r of daily) if (r.date === date) saved[r.campaignId] = r;

  // The money picture: what the client is shown as spent (daily numbers applied), and the figures the day form needs to warn before a save is refused.
  const applied = dashboard ? applyDaily(dashboard, daily) : null;
  const currency = dashboard?.currency ?? "INR";
  const totalBudget = dashboard?.totalBudget ?? 0;
  const currentSpend = applied?.amountSpent ?? 0;
  const lineIds = dashboard?.campaigns.length ? dashboard.campaigns.map((c) => c.id) : [""];
  const spentOther = dashboard ? projectedSpend(dashboard, daily, date, lineIds.map((campaignId) => ({ campaignId }))) : 0;
  const { from, to } = lastDays(CHART_DAYS);

  return (
    <div>
      <nav className={tab.tabs} aria-label="Campaigns" style={{ display: "inline-flex", marginBottom: 20 }}>
        <Link href={base} className={tab.tab} aria-current={setup ? undefined : "page"}><CalendarDays size={16} strokeWidth={1.9} className={tab.tabIcon} aria-hidden="true" />Daily update</Link>
        <Link href={`${base}?view=setup`} className={tab.tab} aria-current={setup ? "page" : undefined}><Settings2 size={16} strokeWidth={1.9} className={tab.tabIcon} aria-hidden="true" />Campaign setup</Link>
      </nav>
      <div style={{ marginBottom: 18 }}>
        <BudgetSummary accountId={id} currency={currency} totalBudget={totalBudget} amountSpent={currentSpend} points={dailySeries(daily, from, to)} />
      </div>
      {setup ? (
        <>
          <h2 className={clients.sectionTitle}>Campaign setup</h2>
          <p className={clients.cardHint}>
            The campaigns {account.companyName} sees. {daily.length ? "Spend, leads and the other results of a campaign with daily numbers are added up from its days, so they can't be typed here." : "Once you record daily numbers, each campaign's results are added up from them."}
          </p>
          <ClientDashboardEditor
            accountId={id}
            initial={dashboard ? { ...applyDaily(dashboard, daily), monthly: dashboard.monthly } : null}
            dailyCampaignIds={[...new Set(daily.map((r) => r.campaignId))]}
          />
        </>
      ) : (
        <DailyUpdate
          key={date}
          accountId={id}
          date={date}
          today={today}
          currency={currency}
          budget={{ total: totalBudget, currentSpend, spentOther }}
          campaigns={(dashboard?.campaigns ?? []).map((c) => ({ id: c.id, name: c.name, platform: c.platform, status: c.status }))}
          saved={saved}
          recent={recent}
          lastDay={latestDay(daily)}
        />
      )}
    </div>
  );
}
