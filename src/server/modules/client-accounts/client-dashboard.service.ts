import "server-only";
import { randomUUID } from "node:crypto";
import { col, toRow, type Db } from "@/server/db/helpers";
import { clientDashboards, type RowOf } from "@/server/db/schema";
import { sumCampaigns } from "@/lib/client-metrics";
import { applyDaily } from "@/lib/client-daily";
import { budgetMoney, budgetStatus } from "@/lib/client-budget";
import { AppError } from "@/server/lib/errors";
import { dashboardInputSchema, type DashboardInputRaw } from "./client-accounts.schema";
import { listDailyEntries } from "./client-daily-store";

export type ClientDashboardRow = RowOf<"client_dashboards">;

/** The dashboard an account sees, or `null` when an administrator has not published anything for it yet. */
export async function findClientDashboard(db: Db, accountId: string): Promise<ClientDashboardRow | null> {
  const doc = await col(db, clientDashboards).findOne({ _id: accountId as never });
  return doc ? (toRow(clientDashboards, doc) as ClientDashboardRow) : null;
}

/** Only when the figures were last published, as an ISO string (or `null`): what an open dashboard polls for. */
export async function findClientDashboardMeta(db: Db, accountId: string): Promise<string | null> {
  const doc = await col(db, clientDashboards).findOne({ _id: accountId as never }, { projection: { dataUpdatedAt: 1 } });
  return doc?.dataUpdatedAt instanceof Date ? doc.dataUpdatedAt.toISOString() : null;
}

/**
 * Publishes the figures for one client. The whole document is replaced, so what the editor shows is exactly what the client
 * sees, and `dataUpdatedAt` moves to now: it is the "last updated" time on the client's dashboard. Campaigns keep their ids
 * across saves (the editor sends them back), and any without one get a fresh id.
 *
 * The total budget is required and is never replaced by a sum of campaign budgets. It can't be set below what has already been spent
 * (campaign figures plus the daily updates), and the campaigns' own budgets can't add up to more than it. Every change to it is logged
 * (who, when, from, to; the last 20 kept). The amount spent is worked out, never typed.
 */
export async function saveClientDashboard(db: Db, accountId: string, input: DashboardInputRaw, updatedBy: string | null): Promise<ClientDashboardRow> {
  const { amountSpent: _typed, ...data } = dashboardInputSchema.parse(input);
  void _typed;
  const now = new Date();
  const campaigns = data.campaigns.map((c) => ({ ...c, id: c.id || randomUUID() }));
  const existing = await findClientDashboard(db, accountId);
  // With campaigns, the headline figures are their sum (so the two can never disagree); the typed ones apply only to a client with no campaign detail.
  const headline = campaigns.length
    ? (() => {
        const t = sumCampaigns(campaigns);
        return { leads: t.leads, calls: t.calls, adsRunning: t.active, amountSpent: t.spent, impressions: t.impressions, clicks: t.clicks };
      })()
    : { amountSpent: existing?.amountSpent ?? 0 };

  // The budget has to cover what is already spent (daily updates included) and what the campaigns are allotted.
  const spent = applyDaily({ ...data, ...headline, campaigns } as Parameters<typeof applyDaily>[0], await listDailyEntries(db, accountId)).amountSpent;
  if (data.totalBudget < spent) throw AppError.validation({ totalBudget: `The total budget can't be lower than the ${budgetMoney(spent, data.currency)} already spent.` });
  const allotted = sumCampaigns(campaigns).budget;
  if (allotted > data.totalBudget) throw AppError.validation({ totalBudget: `The campaigns' budgets add up to ${budgetMoney(allotted, data.currency)}, more than the total budget. Raise the total or lower a campaign budget.` });
  const budgetLog = existing?.totalBudget === data.totalBudget ? existing.budgetLog ?? [] : [...(existing?.budgetLog ?? []).slice(-19), { at: now, by: updatedBy, from: existing?.totalBudget ?? 0, to: data.totalBudget }];

  const doc = await col(db, clientDashboards).findOneAndUpdate(
    { _id: accountId as never },
    { $set: { ...data, ...headline, campaigns, budgetLog, dataUpdatedAt: now, updatedBy, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after" },
  );
  return toRow(clientDashboards, doc!) as ClientDashboardRow;
}

export type DashboardInsights = { budgetUsedPercent: number; remainingBudget: number; costPerLead: number | null; costPerCall: number | null; clickThroughRate: number | null; activeCampaigns: number };

/** Figures worked out from the saved ones, so an administrator never has to type (and mistype) a ratio. */
export function deriveInsights(d: Pick<ClientDashboardRow, "leads" | "calls" | "totalBudget" | "amountSpent" | "impressions" | "clicks" | "campaigns">): DashboardInsights {
  const budget = budgetStatus(d.totalBudget, d.amountSpent);
  return {
    budgetUsedPercent: Math.min(100, budget.percentUsed),
    remainingBudget: budget.remaining,
    costPerLead: d.leads > 0 ? d.amountSpent / d.leads : null,
    costPerCall: d.calls > 0 ? d.amountSpent / d.calls : null,
    clickThroughRate: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : null,
    activeCampaigns: d.campaigns.filter((c) => c.status === "ACTIVE").length,
  };
}
