/**
 * Marketing ratios worked out from a campaign's own figures, never typed in: an administrator enters what happened (spend, impressions,
 * clicks, leads, revenue …) and the portal shows what it means. Shared by the admin editor (live preview) and the portal (reports).
 * A ratio is `null` when its denominator is zero, so a screen shows "—" instead of a misleading 0 or Infinity.
 */
export type CampaignFigures = {
  budget: number; spent: number; leads: number; calls: number;
  reach?: number; impressions?: number; clicks?: number; engagement?: number; conversions?: number; revenue?: number;
};

const ratio = (top: number, bottom: number): number | null => (bottom > 0 ? top / bottom : null);

export function campaignMetrics(c: CampaignFigures) {
  const impressions = c.impressions ?? 0, clicks = c.clicks ?? 0, reach = c.reach ?? 0, engagement = c.engagement ?? 0, conversions = c.conversions ?? 0, revenue = c.revenue ?? 0;
  return {
    costPerLead: ratio(c.spent, c.leads),
    costPerClick: ratio(c.spent, clicks),
    costPerConversion: ratio(c.spent, conversions),
    clickThroughRate: ratio(clicks, impressions) === null ? null : (clicks / impressions) * 100,
    conversionRate: ratio(conversions, clicks) === null ? null : (conversions / clicks) * 100,
    engagementRate: ratio(engagement, reach) === null ? null : (engagement / reach) * 100,
    roas: revenue > 0 ? ratio(revenue, c.spent) : null,
    budgetUsedPercent: c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0,
  };
}

/** Everything added up across a client's campaigns. */
type Totals = { budget: number; spent: number; leads: number; calls: number; reach: number; impressions: number; clicks: number; engagement: number; conversions: number; revenue: number };

export function sumCampaigns(list: readonly (CampaignFigures & { status?: string })[]) {
  const total = list.reduce<Totals>(
    (t, c) => ({
      budget: t.budget + c.budget, spent: t.spent + c.spent, leads: t.leads + c.leads, calls: t.calls + c.calls, reach: t.reach + (c.reach ?? 0), impressions: t.impressions + (c.impressions ?? 0),
      clicks: t.clicks + (c.clicks ?? 0), engagement: t.engagement + (c.engagement ?? 0), conversions: t.conversions + (c.conversions ?? 0), revenue: t.revenue + (c.revenue ?? 0),
    }),
    { budget: 0, spent: 0, leads: 0, calls: 0, reach: 0, impressions: 0, clicks: 0, engagement: 0, conversions: 0, revenue: 0 },
  );
  const round = (n: number) => Math.round(n * 100) / 100;
  return { ...total, budget: round(total.budget), spent: round(total.spent), revenue: round(total.revenue), active: list.filter((c) => c.status === "ACTIVE").length };
}
