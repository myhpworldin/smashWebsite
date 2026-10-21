import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { loadReporting } from "@/server/modules/client-accounts/client-daily.service";
import { dailySeries, lastDays } from "@/lib/client-daily";
import { UpdatedChip } from "@/components/client/Freshness";
import { BudgetPanel } from "@/components/client/BudgetPanel";
import { DailySpendChart } from "@/components/client/DailySpendChart";
import { deriveInsights } from "@/server/modules/client-accounts/client-dashboard.service";
import { CampaignReports } from "@/components/client/CampaignReports";
import { DailyReportTable, RangeTabs, parseRange } from "@/components/client/DailyReport";
import { SpendRevenueChart } from "@/components/client/SpendRevenueChart";
import { TrendChart } from "@/components/client/TrendChart";
import styles from "@/components/client/Dashboard.module.css";
import portal from "@/components/client/Portal.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campaigns — SMASH Client Portal", robots: { index: false, follow: false } };

/**
 * Every campaign the account team has published, with its reach, clicks, leads, cost per lead, revenue and ROAS, and the day-by-day report
 * (charts and a table for the last 7, 30 or 90 days) the team records daily. Filterable by status; read-only.
 */
export default async function ClientCampaignsPage({ searchParams }: { searchParams: Promise<{ range?: string | string[] }> }) {
  const { client, db } = await requirePortalSection("campaigns");
  const range = parseRange((await searchParams).range);
  const { dashboard: data, daily } = await loadReporting(db, client.id);
  const updatedAt = data?.dataUpdatedAt ? data.dataUpdatedAt.toISOString() : null;
  const { from, to } = lastDays(range);
  const hasDaily = daily.length > 0;
  // With daily numbers the charts show days; a client still on monthly figures keeps the monthly charts.
  const dailyPoints = hasDaily ? dailySeries(daily, from, to) : [];
  const points = hasDaily ? dailyPoints : data?.monthly ?? [];
  const showMoney = points.some((m) => m.spend > 0 || (m.revenue ?? 0) > 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
          <h1 className={styles.pageHeadTitle}>Campaigns &amp; reports</h1>
          <UpdatedChip updatedAt={updatedAt} />
        </div>
        <p className={styles.pageHeadSub}>Every campaign running for {client.companyName}, with what it has spent and what it has brought in.</p>
      </div>
      {data?.campaigns.length ? (
        <div className={portal.stack}>
          {hasDaily ? <RangeTabs range={range} basePath="/client/campaigns" /> : null}
          <div className={portal.cols}>
            <BudgetPanel currency={data.currency} totalBudget={data.totalBudget} amountSpent={data.amountSpent} insights={deriveInsights(data)} updatedAt={updatedAt} />
            {hasDaily ? (
              <section className={styles.card} aria-labelledby="daily-spend-heading">
                <div className={styles.cardHead}><div><h2 id="daily-spend-heading" className={styles.cardTitle}>Daily spend</h2><p className={styles.cardSub}>What was spent each day, last {range} days</p></div></div>
                <DailySpendChart points={dailyPoints} currency={data.currency} />
              </section>
            ) : <div />}
          </div>
          {points.length ? (
            <div className={portal.cols}>
              <TrendChart points={points} period={hasDaily ? "day" : "month"} currency={data.currency} updatedAt={updatedAt} />
              {showMoney ? <SpendRevenueChart points={points} period={hasDaily ? "day" : "month"} currency={data.currency} updatedAt={updatedAt} /> : <div />}
            </div>
          ) : null}
          <CampaignReports campaigns={data.campaigns} currency={data.currency} />
          {hasDaily ? <DailyReportTable rows={daily} from={from} to={to} currency={data.currency} /> : null}
        </div>
      ) : (
        <div className={`${styles.empty} ${styles.reveal}`}>
          <span className={styles.emptyIcon}><Megaphone size={30} strokeWidth={1.7} aria-hidden="true" /></span>
          <h2 className={styles.emptyTitle}>No campaigns to show yet</h2>
          <p className={styles.emptyText}>Your campaigns will be listed here once your SMASH team publishes them.</p>
        </div>
      )}
    </div>
  );
}
