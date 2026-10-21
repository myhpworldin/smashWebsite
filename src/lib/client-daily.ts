import { addDays, istDay } from "@/lib/client-dates";
import { sumCampaigns } from "@/lib/client-metrics";
import type { ClientCampaign, ClientMonthlyPoint } from "@/server/db/schema";

/**
 * The daily performance report. An administrator records what happened each day (per campaign); everything the client sees — a campaign's
 * totals, the headline numbers, the charts — is added up from those days, so nobody retypes a running total. Free of server-only code: the
 * admin screen (to show the day's ratios) and the portal (to chart it) both use it.
 */
export const DAILY_METRICS = ["spend", "leads", "calls", "reach", "impressions", "clicks", "engagement", "conversions", "revenue"] as const;
export type DailyMetric = (typeof DAILY_METRICS)[number];
export type DailyFigures = Record<DailyMetric, number>;
/** One saved day for one campaign (`campaignId` is `""` for activity not tied to a campaign). */
export type DailyEntry = DailyFigures & { campaignId: string; date: string };

/** Money metrics are kept to the paisa; the rest are whole numbers. */
export const DAILY_MONEY: readonly DailyMetric[] = ["spend", "revenue"];

export const emptyFigures = (): DailyFigures => ({ spend: 0, leads: 0, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0 });
export const isEmptyDay = (f: Partial<DailyFigures>) => DAILY_METRICS.every((m) => !(f[m] ?? 0));

const round2 = (n: number) => Math.round(n * 100) / 100;

export function addFigures(a: DailyFigures, b: Partial<DailyFigures>): DailyFigures {
  const out = { ...a };
  for (const m of DAILY_METRICS) out[m] = a[m] + (b[m] ?? 0);
  out.spend = round2(out.spend);
  out.revenue = round2(out.revenue);
  return out;
}

export function sumFigures(rows: readonly Partial<DailyFigures>[]): DailyFigures {
  return rows.reduce<DailyFigures>((t, r) => addFigures(t, r), emptyFigures());
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** `2026-10-07` → `7 Oct`. */
export const dayLabel = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""}`;
/** `2026-10` → `Oct 2026`. */
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1] ?? ""} ${month.slice(0, 4)}`;

/** One bar of a chart: a day (or a month) with the figures the charts draw. */
export type SeriesPoint = ClientMonthlyPoint & { date: string };

/** A point for every day from `from` to `to` inclusive (a day with nothing recorded is a zero), adding up the campaigns of each day. */
export function dailySeries(rows: readonly DailyEntry[], from: string, to: string): SeriesPoint[] {
  const byDay = new Map<string, DailyEntry[]>();
  for (const r of rows) {
    if (r.date < from || r.date > to) continue;
    const list = byDay.get(r.date);
    if (list) list.push(r); else byDay.set(r.date, [r]);
  }
  const points: SeriesPoint[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const t = sumFigures(byDay.get(day) ?? []);
    points.push({ date: day, label: dayLabel(day), leads: t.leads, calls: t.calls, spend: t.spend, revenue: t.revenue });
  }
  return points;
}

/** The days' figures grouped by calendar month, oldest first (the last `limit` months). */
export function monthlyFromDaily(rows: readonly DailyEntry[], limit = 12): ClientMonthlyPoint[] {
  const byMonth = new Map<string, DailyFigures>();
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    byMonth.set(key, addFigures(byMonth.get(key) ?? emptyFigures(), r));
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([key, t]) => ({ label: monthLabel(key), leads: t.leads, calls: t.calls, spend: t.spend, revenue: t.revenue }));
}

/** The shape of a dashboard that daily figures can be applied to. */
type DashboardLike = {
  campaigns: ClientCampaign[]; monthly: ClientMonthlyPoint[];
  leads: number; calls: number; adsRunning: number; amountSpent: number; impressions: number; clicks: number;
};

/**
 * The dashboard the client sees: the saved one, with every campaign that has daily entries showing the sum of its days, the headline numbers
 * recalculated from them (activity not tied to a campaign counts toward the headline only), and the monthly chart built from the days.
 * A campaign with no daily entries keeps the figures typed on its card, so a client can move to daily updates one campaign at a time.
 */
export function applyDaily<D extends DashboardLike>(dashboard: D, rows: readonly DailyEntry[]): D {
  if (!rows.length) return dashboard;
  const perCampaign = new Map<string, DailyFigures>();
  for (const r of rows) perCampaign.set(r.campaignId, addFigures(perCampaign.get(r.campaignId) ?? emptyFigures(), r));

  const known = new Set(dashboard.campaigns.map((c) => c.id));
  const campaigns = dashboard.campaigns.map((c) => {
    const t = perCampaign.get(c.id);
    return t ? { ...c, spent: t.spend, leads: t.leads, calls: t.calls, reach: t.reach, impressions: t.impressions, clicks: t.clicks, engagement: t.engagement, conversions: t.conversions, revenue: t.revenue } : c;
  });
  // Days recorded against no campaign, or against one that has since been removed, still count toward the totals.
  const loose = sumFigures([...perCampaign.entries()].filter(([id]) => !known.has(id)).map(([, t]) => t));
  const t = sumCampaigns(campaigns);
  const hasCampaigns = campaigns.length > 0;
  return {
    ...dashboard,
    campaigns,
    leads: (hasCampaigns ? t.leads : 0) + loose.leads,
    calls: (hasCampaigns ? t.calls : 0) + loose.calls,
    adsRunning: hasCampaigns ? t.active : dashboard.adsRunning,
    amountSpent: round2((hasCampaigns ? t.spent : 0) + loose.spend),
    impressions: (hasCampaigns ? t.impressions : 0) + loose.impressions,
    clicks: (hasCampaigns ? t.clicks : 0) + loose.clicks,
    monthly: monthlyFromDaily(rows),
  };
}

/** The most recent date with anything recorded, or `null`. */
export const latestDay = (rows: readonly { date: string }[]): string | null => rows.reduce<string | null>((best, r) => (best === null || r.date > best ? r.date : best), null);

/** The last `days` days up to and including today (India's day), as `from`/`to` keys. */
export function lastDays(days: number, now: Date = new Date()): { from: string; to: string } {
  const to = istDay(now);
  return { from: addDays(to, -(days - 1)), to };
}
