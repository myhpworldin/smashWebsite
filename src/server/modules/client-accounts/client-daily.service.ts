import "server-only";
import { col, type Db } from "@/server/db/helpers";
import { clientDailyStats, clientDashboards } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { addDays, istDay } from "@/lib/client-dates";
import { DAILY_METRICS, applyDaily, isEmptyDay, latestDay, type DailyEntry } from "@/lib/client-daily";
import { budgetMoney, projectedSpend } from "@/lib/client-budget";
import { dailyReportSchema, dayKey, type DailyReportInput } from "./client-daily.schema";
import { findClientDashboard, type ClientDashboardRow } from "./client-dashboard.service";
import { listDailyEntries, type DailyRow } from "./client-daily-store";

export type { DailyRow };

/** How far back a day can be recorded or corrected. */
export const DAILY_BACKFILL_DAYS = 730;

const idOf = (accountId: string, campaignId: string, date: string) => `${accountId}:${campaignId || "-"}:${date}`;

export { listDailyEntries };

/** The figures typed for one day, one per campaign that has any. */
export async function findDay(db: Db, accountId: string, date: string): Promise<DailyEntry[]> {
  return listDailyEntries(db, accountId, { from: dayKey("the date").parse(date), to: date });
}

/**
 * Records one day's numbers for a client. Each entry replaces that campaign's figures for that day (an all-zero entry clears it), so
 * correcting a day is just saving it again. The day can't be in the future or older than two years, and an entry's campaign must be one
 * the client has (or `""` for activity not tied to a campaign). The client's "last updated" moves to now.
 *
 * Spend is drawn from a budget: nothing can be recorded until the client's total budget is set, and a save that would take total spend past
 * it is refused (409) with how much is left. Saves that lower spend are always allowed, so older over-budget data can still be corrected.
 */
export async function saveDailyReport(db: Db, accountId: string, body: DailyReportInput, adminEmail: string, now: Date = new Date()): Promise<{ date: string; saved: number; cleared: number; dataUpdatedAt: string }> {
  const { date, entries } = dailyReportSchema.parse(body);
  const today = istDay(now);
  if (date > today) throw AppError.validation({ date: "That day hasn't happened yet." });
  if (date < addDays(today, -DAILY_BACKFILL_DAYS)) throw AppError.validation({ date: "That day is too far back to change." });

  const dashboard = await findClientDashboard(db, accountId);
  if (!dashboard || !(dashboard.totalBudget > 0)) throw AppError.conflict("Set this client's total budget first (Campaign setup), then record the daily numbers.");
  const campaignIds = new Set((dashboard?.campaigns ?? []).map((c) => c.id));
  const seen = new Set<string>();
  entries.forEach((e, i) => {
    if (e.campaignId && !campaignIds.has(e.campaignId)) throw AppError.validation({ [`entries.${i}.campaignId`]: "That campaign isn't on this client's account." });
    if (seen.has(e.campaignId)) throw AppError.validation({ [`entries.${i}.campaignId`]: "Each campaign can appear once for a day." });
    seen.add(e.campaignId);
  });

  const existing = await listDailyEntries(db, accountId);
  const before = applyDaily(dashboard, existing).amountSpent;
  const after = projectedSpend(dashboard, existing, date, entries);
  if (after > dashboard.totalBudget + 0.004 && after > before) {
    const left = Math.max(0, dashboard.totalBudget - before);
    throw AppError.conflict(`This update would take spending ${budgetMoney(after - dashboard.totalBudget, dashboard.currency)} over the total budget of ${budgetMoney(dashboard.totalBudget, dashboard.currency)} (${budgetMoney(left, dashboard.currency)} left). Increase the total budget in Campaign setup first.`);
  }

  const stats = col(db, clientDailyStats);
  let saved = 0, cleared = 0;
  for (const e of entries) {
    const _id = idOf(accountId, e.campaignId, date) as never;
    if (isEmptyDay(e)) {
      cleared += (await stats.deleteOne({ _id })).deletedCount;
      continue;
    }
    const figures = Object.fromEntries(DAILY_METRICS.map((m) => [m, e[m]]));
    await stats.updateOne({ _id }, { $set: { accountId, campaignId: e.campaignId, date, ...figures, updatedBy: adminEmail, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
    saved += 1;
  }

  // The dashboard exists (checked above); its "last updated" moves to now.
  await col(db, clientDashboards).updateOne({ _id: accountId as never }, { $set: { dataUpdatedAt: now, updatedBy: adminEmail, updatedAt: now } });
  return { date, saved, cleared, dataUpdatedAt: now.toISOString() };
}

export type Reporting = { dashboard: ClientDashboardRow | null; daily: DailyEntry[]; lastDay: string | null };

/**
 * What the client is shown: the saved dashboard with its campaign totals, headline numbers and monthly chart worked out from the daily
 * entries (`dashboard` is `null` only when nothing at all has been published). `daily` is every recorded day, for the daily charts.
 */
export async function loadReporting(db: Db, accountId: string): Promise<Reporting> {
  const [raw, daily] = await Promise.all([findClientDashboard(db, accountId), listDailyEntries(db, accountId)]);
  return { dashboard: raw ? applyDaily(raw, daily) : null, daily, lastDay: latestDay(daily) };
}

/** Whether a client with live campaigns is behind on the daily report: yesterday has nothing recorded. Drives the reminder dot on the admin's Campaigns tab. */
export async function isDailyUpdateOverdue(db: Db, accountId: string, now: Date = new Date()): Promise<boolean> {
  const raw = await col(db, clientDashboards).findOne({ _id: accountId as never }, { projection: { campaigns: 1 } });
  const live = (raw?.campaigns ?? []).some((c: { status: string }) => c.status === "ACTIVE");
  if (!live) return false;
  const latest = await col(db, clientDailyStats).find({ accountId }, { projection: { date: 1 } }).sort({ date: -1 }).limit(1).toArray();
  const last = latest[0]?.date as string | undefined;
  return !last || last < addDays(istDay(now), -1);
}
