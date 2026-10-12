import "server-only";
import { findRows, insertRow, type Db } from "@/server/db/helpers";
import { leadActivity, type RowOf } from "@/server/db/schema";
import type { LeadActivityType } from "@/lib/lead-options";

export type LeadActivityRow = RowOf<"lead_activity">;

/**
 * Appends one activity/audit row for a lead (CRM Phase 6). The one place every lead-changing
 * operation records what happened — `updateLead` (status/priority/assignment/field edits),
 * `addLeadNote`, and `createLead` (the initial "Lead Created" event) all call this, so the timeline
 * can never show an event that wasn't actually persisted (Phase 6 brief, Step 18: "do not generate
 * fake activity on the frontend").
 */
export async function recordLeadActivity(
  db: Db,
  entry: { leadId: string; type: LeadActivityType; message?: string; previousValue?: unknown; newValue?: unknown; actor: string | null },
): Promise<LeadActivityRow> {
  return insertRow(db, leadActivity, {
    leadId: entry.leadId,
    type: entry.type,
    message: entry.message ?? null,
    previousValue: entry.previousValue ?? null,
    newValue: entry.newValue ?? null,
    actor: entry.actor,
  }, "Lead activity");
}

/** A lead's full timeline, oldest first (the natural order to read a lead's story) — the `lead_activity_timeline_idx` index from Phase 1 already serves exactly this `{leadId, createdAt}` query. */
export async function listLeadActivity(db: Db, leadId: string): Promise<LeadActivityRow[]> {
  return findRows(db, leadActivity, { leadId }, { sort: { createdAt: 1 } });
}
