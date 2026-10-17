import "server-only";
import type { Sort } from "mongodb";
import { col, countWhere, findOneRow, findRows, getRowById, insertRow, offsetOf, publishedAnd, updateRow, type Db, type Where } from "@/server/db/helpers";
import { leads, services, type RowOf } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { phoneKey } from "@/lib/contact-validation";
import { LEAD_PRIORITIES, LEAD_STATUSES, type LeadActivityType } from "@/lib/lead-options";
import { enquiryInputSchema } from "@/server/modules/enquiries/enquiries.schema";
import type { EnquiryDetails } from "@/server/email/templates";
import { recordLeadActivity, type LeadActivityRow } from "./lead-activity.service";
import { addLeadNoteSchema, leadUpdateSchema, type LeadSort, type ListLeadsQuery } from "./leads.schema";

/**
 * The public Contact form's wire contract is `enquiryInputSchema` (same field names: `name`, `website`,
 * `serviceOfInterest`, `monthlyBudget`, `message`, ...) — it is not redesigned for the CRM (Phase 3
 * brief: "do not redesign the Contact page"), so this reuses that schema rather than declaring a
 * second, field-name-identical one. The mapping to the Lead model's own field names (`fullName`,
 * `websiteOrInstagram`, `primaryService`, `monthlyMarketingBudget`, `additionalContext`) happens only
 * here. Note what this schema does NOT have a field for: `status`, `priority`, `source`, `assignedTo`
 * — a public visitor cannot submit them even by accident, because they are not parseable keys at all
 * (the schema is `.strict()`), not merely "ignored."
 */

/** Accidental resubmissions (double-click, a flaky-network retry, an accidental refresh before the response arrives) from the same person within this window are treated as one lead, not two. Deliberately short and narrowly scoped — a genuine second enquiry (different details, or the same details after this window has passed) still creates its own new lead; this is not email/phone-based deduplication (Phase 3 brief, Step 10: "do not aggressively reject legitimate repeat enquiries"). */
const DUPLICATE_SUBMISSION_WINDOW_MS = 30_000;

/**
 * Persists a real Contact form submission as a new Lead, always with the server-assigned
 * `status: "NEW"`, `priority: "MEDIUM"`, `source: "WEBSITE_CONTACT"` (the `SPEC.leads.defaults()` in
 * `db/schema.ts` — not restated here, so there is exactly one place that default lives). A filled
 * honeypot is silently dropped (returns as if it succeeded, same as `enquiries.service.ts`'s
 * `createEnquiry`) rather than surfaced as an error, so an adaptive bot gets no signal about what
 * tripped the trap.
 */
export async function createLead(db: Db, input: unknown): Promise<{ id: string | null; created: boolean; details?: EnquiryDetails }> {
  const { honeypot, ...data } = enquiryInputSchema.parse(input);
  if (honeypot) return { id: null, created: false };

  let primaryService: string | null = null;
  if (data.serviceOfInterest) {
    const match = await findOneRow(db, services, publishedAnd({ name: data.serviceOfInterest }));
    if (!match) throw AppError.validation({ serviceOfInterest: "Please choose one of the listed services." });
    primaryService = match.slug;
  }

  const key = phoneKey(data.phone);
  const recentDuplicate = await col(db, leads).findOne(
    { phoneKey: key, fullName: data.name, location: data.location, createdAt: { $gte: new Date(Date.now() - DUPLICATE_SUBMISSION_WINDOW_MS) } },
    { sort: { createdAt: -1 }, projection: { _id: 1 } },
  );
  if (recentDuplicate) return { id: recentDuplicate._id as string, created: false };

  const row = await insertRow(db, leads, {
    fullName: data.name,
    companyName: data.companyName,
    websiteOrInstagram: data.website,
    phone: data.phone,
    phoneKey: key,
    email: data.email?.toLowerCase(),
    location: data.location,
    primaryService,
    monthlyMarketingBudget: data.monthlyBudget,
    primaryGoal: data.primaryGoal,
    additionalContext: data.message,
  }, "Lead");

  // `actor: null` — a system event, not an admin action (CRM Phase 6: the timeline renders a null actor as "System"/no byline, never a fabricated name).
  await recordLeadActivity(db, { leadId: row.id, type: "LEAD_CREATED", actor: null });

  // What the emails quote: the submission as saved, with the service by its name (the lead stores its slug).
  const details: EnquiryDetails = {
    name: data.name, companyName: data.companyName, website: data.website, phone: data.phone, email: data.email?.toLowerCase(), location: data.location,
    service: data.serviceOfInterest, budget: data.monthlyBudget, goal: data.primaryGoal, message: data.message,
  };
  return { id: row.id, created: true, details };
}

export type LeadRow = RowOf<"leads">;

/** Characters with special meaning in a regular expression, escaped so free-text search input is matched literally — never interpreted as a pattern. A search box that could inject regex syntax is both a correctness bug (surprising matches) and a denial-of-service one (a crafted pattern can make a regex scan pathologically slow). */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_MAP: Record<LeadSort, Sort> = {
  newest: { createdAt: -1, _id: 1 },
  oldest: { createdAt: 1, _id: 1 },
  updated: { updatedAt: -1, _id: 1 },
  name_asc: { fullName: 1, _id: 1 },
  name_desc: { fullName: -1, _id: 1 },
};

/** `dateFrom`/`dateTo` (`YYYY-MM-DD`, already format-checked by `listLeadsQuerySchema`) as an inclusive UTC calendar-day range — `dateTo` is pushed to the end of that day so a lead created at any time on the "to" date is included, not just ones before midnight. */
function createdAtRange(query: ListLeadsQuery): Where["createdAt"] | undefined {
  if (!query.dateFrom && !query.dateTo) return undefined;
  const range: Record<string, Date> = {};
  if (query.dateFrom) range.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
  if (query.dateTo) range.$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
  return range;
}

/**
 * The admin Leads workspace's list query — search/status/service/source/date-range filters, sort,
 * and pagination, all enforced server-side (every parameter already passed through
 * `listLeadsQuerySchema` before reaching here, so this function trusts its input the same way every
 * other `list*` function in this codebase trusts an already-validated query). The backend remains the
 * sole source of truth for filtering, sorting and paging — nothing is fetched and then filtered again
 * in the browser.
 */
export async function listLeads(db: Db, query: ListLeadsQuery): Promise<{ items: LeadRow[]; total: number }> {
  const where: Where = {};
  if (query.status) where.status = query.status;
  if (query.service) where.primaryService = query.service;
  if (query.source) where.source = query.source;
  if (query.search) {
    const re = new RegExp(escapeRegExp(query.search), "i");
    where.$or = [{ fullName: re }, { companyName: re }, { email: re }, { phone: re }, { websiteOrInstagram: re }];
  }
  const createdAt = createdAtRange(query);
  if (createdAt) where.createdAt = createdAt;

  const [items, total] = await Promise.all([
    findRows(db, leads, where, { sort: SORT_MAP[query.sort], skip: offsetOf(query), limit: query.limit }),
    countWhere(db, leads, where),
  ]);
  return { items, total };
}

export type LeadStatusSummary = { total: number } & Record<(typeof LEAD_STATUSES)[number], number>;

/**
 * Unfiltered counts for every status, plus the grand total — always reflects the whole table, not the
 * current search/filter (Phase 5 brief, Step 2: a stable overview, not a number that becomes
 * trivially redundant with the result count the moment someone filters by status). One aggregation
 * query, not one `countDocuments` per status.
 */
export async function getLeadStatusSummary(db: Db): Promise<LeadStatusSummary> {
  const rows = await col(db, leads).aggregate<{ _id: string; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();
  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const summary = Object.fromEntries(LEAD_STATUSES.map((status) => [status, byStatus[status] ?? 0])) as Record<(typeof LEAD_STATUSES)[number], number>;
  return { total: rows.reduce((sum, r) => sum + r.count, 0), ...summary };
}

export type LeadPrioritySummary = Record<(typeof LEAD_PRIORITIES)[number], number>;

/** Same shape as `getLeadStatusSummary`, grouped by `priority` instead — unfiltered, whole-table counts. */
export async function getLeadPrioritySummary(db: Db): Promise<LeadPrioritySummary> {
  const rows = await col(db, leads).aggregate<{ _id: string; count: number }>([{ $group: { _id: "$priority", count: { $sum: 1 } } }]).toArray();
  const byPriority = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Object.fromEntries(LEAD_PRIORITIES.map((priority) => [priority, byPriority[priority] ?? 0])) as LeadPrioritySummary;
}

/**
 * Applies a validated partial update and records one activity entry per meaningful change.
 * "Meaningful" means the value actually changed — submitting the same status twice writes no
 * activity. `assignedTo` distinguishes first-time assignment, reassignment and unassignment so the
 * timeline reads naturally.
 *
 * Deliberately narrow: `leadUpdateSchema` only accepts `status`/`priority`/`assignedTo` — CRM
 * metadata, never the lead's own submitted contact/business fields. An admin cannot edit what a
 * visitor actually told SMASH through the Contact form; that data stays exactly as submitted.
 */
export async function updateLead(db: Db, id: string, actor: string, input: unknown): Promise<LeadRow> {
  const patch = leadUpdateSchema.parse(input);
  const before = await getRowById(db, leads, id, "Lead");
  const after = await updateRow(db, leads, id, patch, "Lead");

  const events: { type: LeadActivityType; previousValue?: unknown; newValue?: unknown }[] = [];
  if (patch.status !== undefined && patch.status !== before.status) {
    events.push({ type: "STATUS_CHANGED", previousValue: before.status, newValue: after.status });
  }
  if (patch.priority !== undefined && patch.priority !== before.priority) {
    events.push({ type: "PRIORITY_CHANGED", previousValue: before.priority, newValue: after.priority });
  }
  if ("assignedTo" in patch && patch.assignedTo !== before.assignedTo) {
    const type: LeadActivityType = !before.assignedTo ? "ASSIGNED" : !after.assignedTo ? "UNASSIGNED" : "REASSIGNED";
    events.push({ type, previousValue: before.assignedTo, newValue: after.assignedTo });
  }

  for (const event of events) await recordLeadActivity(db, { leadId: id, actor, ...event });
  return after;
}

/** `POST /api/admin/leads/:id/notes` — validates, confirms the lead exists (a 404 here, not an orphaned note, if it doesn't), then records it as a `NOTE_ADDED` activity entry. Internal only: nothing public ever reads the `lead_activity` collection. */
export async function addLeadNote(db: Db, id: string, actor: string, input: unknown): Promise<LeadActivityRow> {
  const { content } = addLeadNoteSchema.parse(input);
  await getRowById(db, leads, id, "Lead");
  return recordLeadActivity(db, { leadId: id, type: "NOTE_ADDED", message: content, actor });
}
