import { beforeEach, describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is not used here

import { createTestDb } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { clientAccounts } from "@/server/db/schema";
import { applyDaily, dailySeries, isEmptyDay, monthlyFromDaily, type DailyEntry } from "@/lib/client-daily";
import { dailyReportSchema } from "@/server/modules/client-accounts/client-daily.schema";
import { isDailyUpdateOverdue, listDailyEntries, loadReporting, saveDailyReport } from "@/server/modules/client-accounts/client-daily.service";
import { saveClientDashboard } from "@/server/modules/client-accounts/client-dashboard.service";
import { loadAttention, loadOverview } from "@/server/modules/client-accounts/client-overview.service";

const ADMIN = "admin@smash.test";
const NOW = new Date("2026-10-20T06:00:00Z"); // 11:30 in India: today is 2026-10-20
let db: Db;
let A: string;
let B: string;

const campaign = (id: string, over: Record<string, unknown> = {}) => ({ id, name: `Camp ${id}`, platform: "Meta Ads", status: "ACTIVE" as const, budget: 1000, spent: 0, leads: 0, calls: 0, ...over });
const dashboard = (campaigns: ReturnType<typeof campaign>[]) => ({ currency: "INR" as const, leads: 0, calls: 0, adsRunning: 0, totalBudget: 200000, amountSpent: 0, impressions: 0, clicks: 0, campaigns, monthly: [] });

beforeEach(async () => {
  ({ db } = await createTestDb());
  const mk = async (email: string) => (await insertRow(db, clientAccounts, { email, companyName: "Co", contactName: "Pat", passwordHash: "x", services: [] }, "Account")).id;
  A = await mk("a@x.com");
  B = await mk("b@x.com");
});

describe("daily report validation", () => {
  it("accepts a day with partial figures (the rest default to zero)", () => {
    const parsed = dailyReportSchema.parse({ date: "2026-10-19", entries: [{ campaignId: "c1", spend: 1200.456, leads: 8 }] });
    expect(parsed.entries[0]).toMatchObject({ spend: 1200.46, leads: 8, calls: 0, clicks: 0, revenue: 0 });
  });
  it("refuses impossible dates, negatives, fractions and unknown keys", () => {
    expect(() => dailyReportSchema.parse({ date: "2026-02-31", entries: [{ campaignId: "" }] })).toThrow();
    expect(() => dailyReportSchema.parse({ date: "yesterday", entries: [{ campaignId: "" }] })).toThrow();
    expect(() => dailyReportSchema.parse({ date: "2026-10-19", entries: [{ campaignId: "", leads: -1 }] })).toThrow();
    expect(() => dailyReportSchema.parse({ date: "2026-10-19", entries: [{ campaignId: "", leads: 1.5 }] })).toThrow();
    expect(() => dailyReportSchema.parse({ date: "2026-10-19", entries: [{ campaignId: "", bogus: 1 }] })).toThrow();
    expect(() => dailyReportSchema.parse({ date: "2026-10-19", entries: [] })).toThrow();
  });
});

describe("saveDailyReport", () => {
  beforeEach(async () => { await saveClientDashboard(db, A, dashboard([campaign("c1"), campaign("c2")]), ADMIN); });

  it("records a day per campaign and replaces it when saved again", async () => {
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", spend: 500, leads: 4 }, { campaignId: "c2", spend: 300, leads: 2 }] }, ADMIN, NOW);
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", spend: 450, leads: 5 }] }, ADMIN, NOW);
    const rows = await listDailyEntries(db, A);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.campaignId === "c1")).toMatchObject({ spend: 450, leads: 5 });
    expect(rows.find((r) => r.campaignId === "c2")).toMatchObject({ spend: 300, leads: 2 });
  });

  it("an all-zero entry clears that campaign's day", async () => {
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", spend: 500, leads: 4 }] }, ADMIN, NOW);
    const result = await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1" }] }, ADMIN, NOW);
    expect(result).toMatchObject({ saved: 0, cleared: 1 });
    expect(await listDailyEntries(db, A)).toHaveLength(0);
  });

  it("refuses a future day, a day too far back, a foreign campaign and a repeated campaign", async () => {
    await expect(saveDailyReport(db, A, { date: "2026-10-21", entries: [{ campaignId: "c1", leads: 1 }] }, ADMIN, NOW)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(saveDailyReport(db, A, { date: "2020-01-01", entries: [{ campaignId: "c1", leads: 1 }] }, ADMIN, NOW)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "nope", leads: 1 }] }, ADMIN, NOW)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", leads: 1 }, { campaignId: "c1", leads: 2 }] }, ADMIN, NOW)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await listDailyEntries(db, A)).toHaveLength(0);
  });

  it("keeps each client's days separate", async () => {
    await saveClientDashboard(db, B, dashboard([]), ADMIN);
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", leads: 4 }] }, ADMIN, NOW);
    await saveDailyReport(db, B, { date: "2026-10-19", entries: [{ campaignId: "", leads: 9 }] }, ADMIN, NOW);
    expect((await listDailyEntries(db, A)).map((r) => r.leads)).toEqual([4]);
    expect((await listDailyEntries(db, B)).map((r) => r.leads)).toEqual([9]);
  });

  it("won't record anything for a client with no budget set, and creates no dashboard", async () => {
    await expect(saveDailyReport(db, B, { date: "2026-10-19", entries: [{ campaignId: "", spend: 100, leads: 3 }] }, ADMIN, NOW)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/total budget/i) });
    expect(await listDailyEntries(db, B)).toHaveLength(0);
    expect((await loadReporting(db, B)).dashboard).toBeNull();
  });

  it("moves the client's last-updated time", async () => {
    await saveClientDashboard(db, B, dashboard([]), ADMIN);
    const result = await saveDailyReport(db, B, { date: "2026-10-19", entries: [{ campaignId: "", spend: 100, leads: 3 }] }, ADMIN, NOW);
    const { dashboard: d } = await loadReporting(db, B);
    expect(d?.dataUpdatedAt?.toISOString()).toBe(result.dataUpdatedAt);
    expect(d).toMatchObject({ leads: 3, amountSpent: 100, currency: "INR" });
  });
});

describe("what the client sees", () => {
  it("campaign totals, headline numbers and the monthly chart are added up from the days", async () => {
    await saveClientDashboard(db, A, dashboard([campaign("c1", { spent: 99999, leads: 999 }), campaign("c2", { spent: 40, leads: 4 })]), ADMIN);
    await saveDailyReport(db, A, { date: "2026-10-18", entries: [{ campaignId: "c1", spend: 500, leads: 4, clicks: 50, impressions: 1000 }] }, ADMIN, NOW);
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", spend: 250.5, leads: 6, revenue: 900 }] }, ADMIN, NOW);
    await saveDailyReport(db, A, { date: "2026-09-30", entries: [{ campaignId: "c1", spend: 100, leads: 1 }] }, ADMIN, NOW);
    const { dashboard: d, daily, lastDay } = await loadReporting(db, A);
    const c1 = d!.campaigns.find((c) => c.id === "c1")!;
    expect(c1).toMatchObject({ spent: 850.5, leads: 11, clicks: 50, impressions: 1000, revenue: 900 });
    // c2 has no daily entries yet, so it keeps what was typed on its card.
    expect(d!.campaigns.find((c) => c.id === "c2")).toMatchObject({ spent: 40, leads: 4 });
    expect(d).toMatchObject({ leads: 15, amountSpent: 890.5, clicks: 50, adsRunning: 2 });
    expect(d!.monthly).toEqual([
      { label: "Sep 2026", leads: 1, calls: 0, spend: 100, revenue: 0 },
      { label: "Oct 2026", leads: 10, calls: 0, spend: 750.5, revenue: 900 },
    ]);
    expect(daily).toHaveLength(3);
    expect(lastDay).toBe("2026-10-19");
  });

  it("the overview's leads and ad spend follow the daily numbers", async () => {
    await saveClientDashboard(db, A, dashboard([campaign("c1")]), ADMIN);
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", spend: 700, leads: 12 }] }, ADMIN, NOW);
    const overview = await loadOverview(db, A, NOW);
    expect(overview).toMatchObject({ totalLeads: 12, totalAdSpend: 700, activeCampaigns: 1 });
  });

  it("activity with no campaign (or for a removed one) still counts toward the headline", () => {
    const base = { ...dashboard([campaign("c1")]), campaigns: [campaign("c1")] };
    const rows: DailyEntry[] = [
      { campaignId: "c1", date: "2026-10-19", spend: 10, leads: 1, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0 },
      { campaignId: "gone", date: "2026-10-19", spend: 5, leads: 2, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0 },
    ];
    expect(applyDaily(base, rows)).toMatchObject({ leads: 3, amountSpent: 15 });
  });

  it("with no daily rows the saved dashboard is returned untouched", () => {
    const base = dashboard([campaign("c1", { spent: 5 })]);
    expect(applyDaily(base, [])).toBe(base);
  });
});

describe("series helpers", () => {
  const row = (date: string, leads: number, spend = 0): DailyEntry => ({ campaignId: "c1", date, spend, leads, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0 });
  it("dailySeries fills days with nothing recorded as zero and adds campaigns together", () => {
    const series = dailySeries([row("2026-10-18", 2, 50), { ...row("2026-10-18", 3, 25), campaignId: "c2" }, row("2026-10-20", 1)], "2026-10-18", "2026-10-20");
    expect(series.map((p) => [p.label, p.leads, p.spend])).toEqual([["18 Oct", 5, 75], ["19 Oct", 0, 0], ["20 Oct", 1, 0]]);
  });
  it("monthlyFromDaily keeps the last months in order", () => {
    const out = monthlyFromDaily([row("2026-11-02", 1), row("2026-09-05", 2), row("2026-10-01", 3)], 2);
    expect(out.map((m) => m.label)).toEqual(["Oct 2026", "Nov 2026"]);
  });
  it("isEmptyDay is true only when every figure is zero", () => {
    expect(isEmptyDay({})).toBe(true);
    expect(isEmptyDay({ spend: 0, leads: 0 })).toBe(true);
    expect(isEmptyDay({ clicks: 1 })).toBe(false);
  });
});

describe("daily update reminder", () => {
  it("is overdue for a client with a live campaign until yesterday is recorded", async () => {
    await saveClientDashboard(db, A, dashboard([campaign("c1")]), ADMIN);
    expect(await isDailyUpdateOverdue(db, A, NOW)).toBe(true);
    expect((await loadAttention(db, A, NOW)).daily).toBe(1);
    await saveDailyReport(db, A, { date: "2026-10-18", entries: [{ campaignId: "c1", leads: 1 }] }, ADMIN, NOW);
    expect(await isDailyUpdateOverdue(db, A, NOW)).toBe(true); // two days behind
    await saveDailyReport(db, A, { date: "2026-10-19", entries: [{ campaignId: "c1", leads: 1 }] }, ADMIN, NOW);
    expect(await isDailyUpdateOverdue(db, A, NOW)).toBe(false);
    expect((await loadAttention(db, A, NOW)).daily).toBe(0);
  });
  it("is never overdue for a client with no live campaign", async () => {
    expect(await isDailyUpdateOverdue(db, B, NOW)).toBe(false);
    await saveClientDashboard(db, B, dashboard([campaign("c1", { status: "PAUSED" })]), ADMIN);
    expect(await isDailyUpdateOverdue(db, B, NOW)).toBe(false);
  });
});
