import { z } from "zod";
import { MAX_CAMPAIGNS } from "@/lib/client-options";
import { figure, money } from "./client-accounts.schema";

/** A real calendar day as `YYYY-MM-DD` (so `2026-02-31` is refused, not silently rolled into March). */
export const dayKey = (label: string) =>
  z.string({ error: `Choose ${label}.` }).trim().regex(/^\d{4}-\d{2}-\d{2}$/, `Choose ${label}.`).refine((v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v, `Choose ${label}.`);

/** What one campaign did on one day. Anything left out is zero, so a payload only needs the numbers that moved. */
export const dailyEntrySchema = z.object({
  campaignId: z.string().trim().max(64).default(""),
  spend: money("Spend").default(0),
  leads: figure("Leads").default(0),
  calls: figure("Calls").default(0),
  reach: figure("Reach").default(0),
  impressions: figure("Impressions").default(0),
  clicks: figure("Clicks").default(0),
  engagement: figure("Engagement").default(0),
  conversions: figure("Conversions").default(0),
  revenue: money("Revenue").default(0),
}).strict();

/** One day's report: an entry per campaign (plus, at most, one for activity not tied to a campaign). */
export const dailyReportSchema = z.object({
  date: dayKey("the date"),
  entries: z.array(dailyEntrySchema).min(1, "Add at least one figure for the day.").max(MAX_CAMPAIGNS + 1, `At most ${MAX_CAMPAIGNS + 1} entries.`),
}).strict();
export type DailyReportInput = z.input<typeof dailyReportSchema>;
