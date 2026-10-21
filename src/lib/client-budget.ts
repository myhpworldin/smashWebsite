import { applyDaily, isEmptyDay, type DailyEntry, type DailyFigures } from "@/lib/client-daily";
import type { ClientCurrency } from "@/lib/client-options";

/**
 * A client's ad budget against what has been spent. One total budget is set by the SMASH team; every daily expense draws it down, and
 * spend can never pass it. Free of server-only code: the admin forms (live "remaining after this update"), the server (the same check,
 * enforced) and the portal's bars all use these functions, so there is one formula everywhere.
 */
export const LOW_BUDGET_PERCENT = 80;

export type BudgetState = "none" | "ok" | "low" | "full";
export type BudgetStatus = {
  total: number;
  spent: number;
  remaining: number;
  /** Not capped at 100: spend past the budget (only possible in older data) reads as more than 100. */
  percentUsed: number;
  /** How far spend is past the budget; 0 when it is not. With no budget set, all of the spend counts as over. */
  overBy: number;
  state: BudgetState;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function budgetStatus(totalBudget: number, amountSpent: number): BudgetStatus {
  const total = totalBudget > 0 ? totalBudget : 0;
  const spent = amountSpent > 0 ? amountSpent : 0;
  const remaining = round2(Math.max(0, total - spent));
  const overBy = round2(Math.max(0, spent - total));
  const exact = total > 0 ? (spent / total) * 100 : 0;
  const state: BudgetState = total <= 0 ? "none" : spent >= total ? "full" : exact >= LOW_BUDGET_PERCENT ? "low" : "ok";
  return { total, spent, remaining, percentUsed: total > 0 ? Math.round(exact) : 0, overBy, state };
}

/** What one day's entries are, for working out the spend a save would leave. `campaignId` is `""` for activity not tied to a campaign. */
export type DayInput = Partial<DailyFigures> & { campaignId: string };

type SpendDashboard = Parameters<typeof applyDaily>[0];

/**
 * The total spend the client would be shown after saving `entries` for `date`: the days already recorded, with that day's entries for
 * those campaigns replaced (an all-zero entry clears it), run through the same `applyDaily` the portal uses, so it counts campaign sums,
 * unassigned spend, and the typed spend of campaigns that have no daily rows yet.
 */
export function projectedSpend(dashboard: SpendDashboard, existing: readonly DailyEntry[], date: string, entries: readonly DayInput[]): number {
  const replaced = new Set(entries.map((e) => e.campaignId));
  const rows: DailyEntry[] = existing.filter((r) => !(r.date === date && replaced.has(r.campaignId)));
  for (const e of entries) {
    if (isEmptyDay(e)) continue;
    rows.push({ spend: 0, leads: 0, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0, ...e, date });
  }
  return applyDaily(dashboard, rows).amountSpent;
}

/** An amount for a message about the budget: whole when it is whole, to the paisa when it is not, so "₹0.01 over" never reads as "₹0 over". */
export const budgetMoney = (amount: number, currency: ClientCurrency): string =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

/** The average daily spend over the last `days` days of a daily series (days with nothing recorded count as zero). */
export function averageDailySpend(points: readonly { spend: number }[], days = 7): number {
  const last = points.slice(-days);
  return last.length ? round2(last.reduce((t, p) => t + p.spend, 0) / last.length) : 0;
}

/** About how many more days the remaining budget lasts at the recent daily average, or `null` when there is no recent spend to go by. */
export function daysOfBudgetLeft(remaining: number, averageDaily: number): number | null {
  return averageDaily > 0 ? Math.floor(remaining / averageDaily) : null;
}
