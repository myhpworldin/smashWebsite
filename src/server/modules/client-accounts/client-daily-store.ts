import "server-only";
import { col, type Db } from "@/server/db/helpers";
import { clientDailyStats, type RowOf } from "@/server/db/schema";
import { DAILY_METRICS, type DailyEntry } from "@/lib/client-daily";

export type DailyRow = RowOf<"client_daily_stats">;

const toEntry = (r: DailyRow): DailyEntry => ({ campaignId: r.campaignId, date: r.date, ...Object.fromEntries(DAILY_METRICS.map((m) => [m, r[m] ?? 0])) } as DailyEntry);

/**
 * Every day recorded for an account, oldest first. A year of five campaigns is under two thousand small rows, so the totals are summed from them directly.
 * Kept apart from `client-daily.service.ts` so the dashboard service can read the days (to check a new budget against what is spent) without importing it.
 */
export async function listDailyEntries(db: Db, accountId: string, range?: { from?: string; to?: string }): Promise<DailyEntry[]> {
  const date: Record<string, string> = {};
  if (range?.from) date.$gte = range.from;
  if (range?.to) date.$lte = range.to;
  const docs = await col(db, clientDailyStats)
    .find({ accountId, ...(Object.keys(date).length ? { date } : {}) }, { projection: { _id: 0, campaignId: 1, date: 1, ...Object.fromEntries(DAILY_METRICS.map((m) => [m, 1])) } })
    .sort({ date: 1 })
    .limit(20_000)
    .toArray();
  return docs.map((d) => toEntry(d as unknown as DailyRow));
}
