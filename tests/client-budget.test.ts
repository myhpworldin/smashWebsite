import { beforeEach, describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is not used here

import { createTestDb } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { clientAccounts } from "@/server/db/schema";
import { averageDailySpend, budgetStatus, daysOfBudgetLeft, projectedSpend } from "@/lib/client-budget";
import { dashboardInputSchema } from "@/server/modules/client-accounts/client-accounts.schema";
import { findClientDashboard, saveClientDashboard } from "@/server/modules/client-accounts/client-dashboard.service";
import { listDailyEntries, loadReporting, saveDailyReport } from "@/server/modules/client-accounts/client-daily.service";
import { loadOverview } from "@/server/modules/client-accounts/client-overview.service";

const ADMIN = "admin@smash.test";
const NOW = new Date("2026-10-20T06:00:00Z"); // 20 Oct in India
let db: Db;
let A: string;

const campaign = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `Camp ${id}`, platform: "Meta Ads", status: "ACTIVE" as const, budget: 0, spent: 0, leads: 0, calls: 0, ...over });
const dashboard = (totalBudget: number, campaigns: ReturnType<typeof campaign>[] = [campaign("c1")]) => ({ currency: "INR" as const, leads: 0, calls: 0, adsRunning: 0, totalBudget, impressions: 0, clicks: 0, campaigns, monthly: [] });
const spend = (date: string, campaignId: string, amount: number) => saveDailyReport(db, A, { date, entries: [{ campaignId, spend: amount }] }, ADMIN, NOW);

beforeEach(async () => {
  ({ db } = await createTestDb());
  A = (await insertRow(db, clientAccounts, { email: "a@x.com", companyName: "Co", contactName: "Pat", passwordHash: "x", services: [] }, "Account")).id;
});

describe("budgetStatus", () => {
  it("is 'none' without a budget, and counts any spend as over", () => {
    expect(budgetStatus(0, 0)).toMatchObject({ state: "none", remaining: 0, percentUsed: 0 });
    expect(budgetStatus(0, 50)).toMatchObject({ state: "none", overBy: 50 });
  });
  it("moves ok → low at 80% → full at 100%, and reports overspend uncapped", () => {
    expect(budgetStatus(1000, 790).state).toBe("ok");
    expect(budgetStatus(1000, 800)).toMatchObject({ state: "low", remaining: 200, percentUsed: 80 });
    expect(budgetStatus(1000, 999.99).state).toBe("low");
    expect(budgetStatus(1000, 1000)).toMatchObject({ state: "full", remaining: 0, overBy: 0 });
    expect(budgetStatus(1000, 1250)).toMatchObject({ state: "full", remaining: 0, overBy: 250, percentUsed: 125 });
  });
  it("averages recent days and estimates the days left", () => {
    const pts = [{ spend: 0 }, { spend: 100 }, { spend: 200 }];
    expect(averageDailySpend(pts, 2)).toBe(150);
    expect(averageDailySpend([], 7)).toBe(0);
    expect(daysOfBudgetLeft(1000, 150)).toBe(6);
    expect(daysOfBudgetLeft(1000, 0)).toBeNull();
  });
});

describe("projectedSpend", () => {
  const d = dashboard(10000, [campaign("c1"), campaign("c2", { spent: 40 })]);
  it("replaces the day's entry rather than adding to it, and counts typed spend of campaigns without days", () => {
    const base = { ...d, amountSpent: 40 };
    const rows = [{ campaignId: "c1", date: "2026-10-19", spend: 500, leads: 0, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0 }];
    expect(projectedSpend(base as never, rows, "2026-10-19", [{ campaignId: "c1", spend: 300 }])).toBe(340); // 300 for c1 + 40 typed on c2
    expect(projectedSpend(base as never, rows, "2026-10-19", [{ campaignId: "c1" }])).toBe(40); // clearing the day
    expect(projectedSpend(base as never, rows, "2026-10-20", [{ campaignId: "c1", spend: 100 }])).toBe(640);
  });
});

describe("the total budget is mandatory", () => {
  it("is rejected when missing, zero or negative", () => {
    for (const totalBudget of [undefined, 0, -5]) expect(dashboardInputSchema.safeParse({ ...dashboard(1), totalBudget }).success).toBe(false);
    expect(dashboardInputSchema.safeParse(dashboard(1)).success).toBe(true);
  });
  it("is never replaced by the sum of campaign budgets, and a typed amount spent is ignored", async () => {
    await expect(saveClientDashboard(db, A, dashboard(0, [campaign("c1", { budget: 500 })]), ADMIN)).rejects.toThrow();
    const saved = await saveClientDashboard(db, A, { ...dashboard(5000, [campaign("c1", { budget: 500 })]), amountSpent: 99999 } as never, ADMIN);
    expect(saved.totalBudget).toBe(5000);
    expect(saved.amountSpent).toBe(0);
  });
});

describe("daily expenses draw the budget down", () => {
  it("are refused with no budget, and create no dashboard", async () => {
    await expect(spend("2026-10-19", "", 100)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/total budget/i) });
    expect(await findClientDashboard(db, A)).toBeNull();
    expect(await listDailyEntries(db, A)).toHaveLength(0);
  });

  it("can use the budget up exactly, but one paisa more is refused and nothing is saved", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await spend("2026-10-18", "c1", 600);
    await spend("2026-10-19", "c1", 400); // exactly 1000
    expect(budgetStatus(1000, (await loadReporting(db, A)).dashboard!.amountSpent)).toMatchObject({ state: "full", remaining: 0 });
    await expect(spend("2026-10-20", "c1", 0.01)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/₹0\.01 over the total budget/) });
    expect(await listDailyEntries(db, A)).toHaveLength(2);
  });

  it("says how far over, and how much was left", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await spend("2026-10-18", "c1", 900);
    await expect(spend("2026-10-19", "c1", 250)).rejects.toMatchObject({ message: expect.stringContaining("₹150 over") });
    await expect(spend("2026-10-19", "c1", 250)).rejects.toMatchObject({ message: expect.stringContaining("₹100 left") });
  });

  it("replaces a day's spend when it is corrected instead of adding to it", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await spend("2026-10-19", "c1", 900);
    await spend("2026-10-19", "c1", 950); // 950 in total, not 1850
    await spend("2026-10-19", "c1", 100); // lowering is fine
    expect((await loadReporting(db, A)).dashboard!.amountSpent).toBe(100);
  });

  it("counts activity not tied to a campaign too", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await spend("2026-10-18", "", 700);
    await expect(spend("2026-10-19", "c1", 400)).rejects.toMatchObject({ code: "CONFLICT" });
    await spend("2026-10-19", "c1", 300);
  });

  it("still lets an over-budget client's spend be lowered (older data can be corrected)", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await spend("2026-10-19", "c1", 1000);
    // Simulate older data: the budget was lowered directly in the database below what is spent.
    await db.collection("client_dashboards").updateOne({ _id: A as never }, { $set: { totalBudget: 800 } });
    await expect(spend("2026-10-20", "c1", 50)).rejects.toMatchObject({ code: "CONFLICT" });
    await spend("2026-10-19", "c1", 700); // lowers spend: allowed
  });
});

describe("changing the total budget", () => {
  it("can't go below what is already spent, and can be topped up", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await spend("2026-10-19", "c1", 600);
    await expect(saveClientDashboard(db, A, dashboard(500), ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { totalBudget: expect.stringContaining("already spent") } });
    await saveClientDashboard(db, A, dashboard(600), ADMIN); // exactly what is spent is fine
    await saveClientDashboard(db, A, dashboard(5000), ADMIN);
    await spend("2026-10-20", "c1", 2000);
  });

  it("can't be less than the campaigns' own budgets added up", async () => {
    await expect(saveClientDashboard(db, A, dashboard(1000, [campaign("c1", { budget: 700 }), campaign("c2", { budget: 400 })]), ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { totalBudget: expect.stringContaining("add up to") } });
    await saveClientDashboard(db, A, dashboard(1100, [campaign("c1", { budget: 700 }), campaign("c2", { budget: 400 })]), ADMIN);
  });

  it("keeps a history, only when the total changes, and only the last 20", async () => {
    await saveClientDashboard(db, A, dashboard(1000), ADMIN);
    await saveClientDashboard(db, A, dashboard(1000), ADMIN); // unchanged: no entry
    expect((await findClientDashboard(db, A))!.budgetLog).toHaveLength(1);
    await saveClientDashboard(db, A, dashboard(2000), "boss@smash.test");
    const log = (await findClientDashboard(db, A))!.budgetLog!;
    expect(log).toHaveLength(2);
    expect(log[1]).toMatchObject({ from: 1000, to: 2000, by: "boss@smash.test" });
    for (let i = 1; i <= 25; i++) await saveClientDashboard(db, A, dashboard(2000 + i), ADMIN);
    const capped = (await findClientDashboard(db, A))!.budgetLog!;
    expect(capped).toHaveLength(20);
    expect(capped[capped.length - 1].to).toBe(2025);
  });
});

describe("one figure for spend", () => {
  it("the overview's ad spend and remaining budget match what the dashboard shows, loose spend included", async () => {
    await saveClientDashboard(db, A, dashboard(10000), ADMIN);
    await spend("2026-10-18", "", 300); // not tied to a campaign
    await spend("2026-10-19", "c1", 500);
    const { dashboard: shown } = await loadReporting(db, A);
    const overview = await loadOverview(db, A, NOW);
    expect(shown!.amountSpent).toBe(800);
    expect(overview.totalAdSpend).toBe(800);
    expect(overview.budget).toMatchObject({ total: 10000, spent: 800, remaining: 9200, state: "ok" });
  });
});
