/** Shared by the admin editor, the client dashboard and the server validation: one list, so a label can never drift between them. */
export const CAMPAIGN_STATUSES = ["ACTIVE", "PAUSED", "ENDED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = { ACTIVE: "Active", PAUSED: "Paused", ENDED: "Ended" };

export const CAMPAIGN_PLATFORMS = ["Google Ads", "Meta Ads", "Instagram", "YouTube", "LinkedIn", "WhatsApp", "SEO", "Other"] as const;

/**
 * One service a client has chosen: an offering from the Services catalogue (e.g. "Meta Ads" under the "Growth" group). The group's
 * slug and name and the offering's title are stored together as a snapshot, so a client's list still reads correctly if the
 * catalogue is later renamed or an offering is retired.
 */
export type ClientService = { categorySlug: string; categoryName: string; title: string };
export const clientServiceKey = (s: Pick<ClientService, "categorySlug" | "title">) => `${s.categorySlug}::${s.title}`;
export const MAX_CLIENT_SERVICES = 60;

export const CLIENT_CURRENCIES = ["INR", "USD", "AED", "EUR", "GBP"] as const;
export type ClientCurrency = (typeof CLIENT_CURRENCIES)[number];

/** Row limits, so a dashboard document stays small and the editor stays usable. */
export const MAX_CAMPAIGNS = 40;
export const MAX_MONTHS = 12;

/** A money amount in the account's currency, whole units (no paise/cents: these are summary figures, not accounting). */
export function formatMoney(amount: number, currency: ClientCurrency): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

/** 1,234,567 → "12,34,567" for INR readers is handled by `formatMoney`; plain counts use the same grouping rule. */
export function formatCount(value: number, currency: ClientCurrency = "INR"): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 0 }).format(value);
}

/* ---- Client workspace: the sections an administrator fills in for each client (projects, content, leads, billing, support, profile) ---- */

/** The portal's sections. `overview`, `billing`, `support` and `account` are on for every client; the rest follow the services chosen (and an administrator can switch any on or off). */
export const PORTAL_SECTIONS = ["overview", "projects", "campaigns", "content", "leads", "billing", "support", "account"] as const;
export type PortalSection = (typeof PORTAL_SECTIONS)[number];
export const PORTAL_SECTION_LABEL: Record<PortalSection, string> = {
  overview: "Dashboard", projects: "Projects", campaigns: "Campaigns", content: "Content", leads: "Leads", billing: "Billing", support: "Support", account: "Account",
};
export const ALWAYS_ON_SECTIONS: readonly PortalSection[] = ["overview", "billing", "support", "account"];

/**
 * Which optional sections a client's services call for. Matching is by keyword on the offering title, so a renamed or new offering
 * that still says "Ads", "Lead", "Social" etc. lands in the right place. Only a starting point: the administrator can change it.
 */
export function defaultSections(services: readonly Pick<ClientService, "title" | "categoryName">[]): PortalSection[] {
  const on = new Set<PortalSection>(ALWAYS_ON_SECTIONS);
  for (const { title, categoryName } of services) {
    const text = `${title} ${categoryName}`.toLowerCase();
    if (/\bads?\b|lead|remarketing|conversion|seo|whatsapp/.test(text)) { on.add("campaigns"); on.add("leads"); }
    if (/social|creative|video|content|campaign concept|ai video/.test(text)) on.add("content");
    if (/website|landing|crm|automation|integration|technology/.test(text)) on.add("projects");
  }
  return PORTAL_SECTIONS.filter((s) => on.has(s));
}

export const PROJECT_STATUSES = ["PLANNING", "IN_PROGRESS", "IN_REVIEW", "ON_HOLD", "COMPLETED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = { PLANNING: "Planning", IN_PROGRESS: "In progress", IN_REVIEW: "In review", ON_HOLD: "On hold", COMPLETED: "Completed" };
/** Counted as "active" on the overview. */
export const ACTIVE_PROJECT_STATUSES: readonly ProjectStatus[] = ["PLANNING", "IN_PROGRESS", "IN_REVIEW"];

export const CREATIVE_TYPES = ["Post", "Video", "Reel", "Story", "Blog", "Ad creative", "Other"] as const;
export const CREATIVE_PLATFORMS = ["Instagram", "Facebook", "YouTube", "LinkedIn", "Google", "WhatsApp", "Website", "Other"] as const;
export const CREATIVE_STATUSES = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "REVISION"] as const;
export type CreativeStatus = (typeof CREATIVE_STATUSES)[number];
export const CREATIVE_STATUS_LABEL: Record<CreativeStatus, string> = { DRAFT: "Draft", PENDING: "Awaiting approval", APPROVED: "Approved", REJECTED: "Rejected", REVISION: "Changes requested" };

export const CLIENT_LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
export type ClientLeadStatus = (typeof CLIENT_LEAD_STATUSES)[number];
export const CLIENT_LEAD_STATUS_LABEL: Record<ClientLeadStatus, string> = { NEW: "New", CONTACTED: "Contacted", QUALIFIED: "Qualified", CONVERTED: "Converted", LOST: "Lost" };
export const CLIENT_LEAD_SOURCES = ["Meta Ads", "Google Ads", "Instagram", "WhatsApp", "Website", "Referral", "Walk-in", "Other"] as const;
export const FOLLOW_UP_STATUSES = ["NONE", "SCHEDULED", "DONE"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];
export const FOLLOW_UP_LABEL: Record<FollowUpStatus, string> = { NONE: "No follow-up", SCHEDULED: "Scheduled", DONE: "Done" };

export const INVOICE_STATUSES = ["PENDING", "PARTIAL", "PAID", "OVERDUE"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = { PENDING: "Pending", PARTIAL: "Partly paid", PAID: "Paid", OVERDUE: "Overdue" };
export const BILLING_CYCLES = ["Monthly", "Quarterly", "Yearly"] as const;

export const TICKET_KINDS = ["support", "request"] as const;
export type TicketKind = (typeof TICKET_KINDS)[number];
export const TICKET_KIND_LABEL: Record<TicketKind, string> = { support: "Support", request: "Request" };
export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = { OPEN: "Open", IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed" };
export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

export const CONNECTED_PLATFORMS = ["Meta Business", "Instagram", "Facebook Page", "Google Ads", "Google Analytics", "Google Business Profile", "YouTube", "LinkedIn", "WhatsApp Business", "Website / CMS", "Other"] as const;
export const TEAM_ACCESS_LEVELS = ["Owner", "Manager", "Viewer"] as const;
export const NOTIFICATION_LEVELS = ["info", "success", "warning"] as const;
export type NotificationLevel = (typeof NOTIFICATION_LEVELS)[number];

/** Row limits for the lists embedded in a client's workspace document. */
export const MAX_TEAM_MEMBERS = 30;
export const MAX_PLATFORMS = 20;
export const MAX_MEETINGS = 50;
export const MAX_NOTIFICATIONS = 50;
export const MAX_THREAD_MESSAGES = 200;

/** An uploaded file (invoice PDF, creative image or video) stored on Cloudinary. `type` is how it is delivered: invoices are private (`authenticated`). */
export type StoredFile = { publicId: string; url: string; resourceType: "image" | "video" | "raw"; format: string | null; bytes: number; type: "upload" | "authenticated"; name: string };

/** Date-only values are stored as `YYYY-MM-DD` text and moments as ISO text, so they sort as strings and never shift with a time zone. */
export const todayKey = (now = new Date()) => now.toISOString().slice(0, 10);
