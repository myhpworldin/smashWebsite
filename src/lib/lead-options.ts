/**
 * CRM lead status/priority/source — shared by the Lead model/schema and, in later phases, the
 * CRM admin UI's badges and filters, so none of them can drift apart (same pattern as
 * `career-options.ts`'s `CareerWorkMode`).
 */
export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "CONVERTED", "LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  CONVERTED: "Converted",
  LOST: "Lost",
};
export const DEFAULT_LEAD_STATUS: LeadStatus = "NEW";

/** The Leads workspace's "rows per page" choices — its own set, not the generic listing-page default (12): a CRM admin scanning many leads needs coarser, larger pages than a small content grid does. Lives here (not `leads.schema.ts`) because the "Rows per page" control is a client component, and that schema file transitively pulls in `server-only`. */
export const LEAD_PAGE_SIZES = [15, 25, 50, 100] as const;
export const DEFAULT_LEAD_PAGE_SIZE = 25;

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export const LEAD_PRIORITY_LABEL: Record<LeadPriority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
export const DEFAULT_LEAD_PRIORITY: LeadPriority = "MEDIUM";

/**
 * Where a lead originated. `WEBSITE_CONTACT` is the only source any code produces today (the public
 * Contact form, wired up in Phase 3); the rest exist so the CRM can record a lead added by other
 * means later without a schema change.
 */
export const LEAD_SOURCES = ["WEBSITE_CONTACT", "WEBSITE", "REFERRAL", "CAMPAIGN", "WHATSAPP", "MANUAL", "OTHER"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  WEBSITE_CONTACT: "Website Contact Form",
  WEBSITE: "Website",
  REFERRAL: "Referral",
  CAMPAIGN: "Campaign",
  WHATSAPP: "WhatsApp",
  MANUAL: "Manual",
  OTHER: "Other",
};
export const DEFAULT_LEAD_SOURCE: LeadSource = "WEBSITE_CONTACT";

/**
 * Lead activity event types (CRM Phase 6) — written by `lead-activity.service.ts`, read by
 * `LeadActivityTimeline`. Deliberately not a database-enforced enum (`schema.ts`'s `lead_activity.type`
 * stays a plain string, per Phase 1's own decision: "the set of admin actions is expected to grow") —
 * this is just the one shared list so the writer and the reader can't drift on spelling.
 */
export const LEAD_ACTIVITY_TYPES = [
  "LEAD_CREATED", "STATUS_CHANGED", "PRIORITY_CHANGED", "ASSIGNED", "REASSIGNED", "UNASSIGNED", "NOTE_ADDED", "LEAD_UPDATED",
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

