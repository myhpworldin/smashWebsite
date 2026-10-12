import { z } from "zod";
import { type ContactField, normalizePhone, validateContactField } from "@/lib/contact-validation";
import { DEFAULT_LEAD_PRIORITY, DEFAULT_LEAD_SOURCE, DEFAULT_LEAD_STATUS, LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES } from "@/lib/lead-options";
import { slugSchema } from "@/server/validation/common";
import { pageQuerySchema, printable } from "@/server/api/query";
import { DEFAULT_LEAD_PAGE_SIZE, LEAD_PAGE_SIZES } from "@/lib/lead-options";

/**
 * The Lead model's input validation — the data-layer foundation Phase 3's `POST /api/leads` will use.
 * Contact-detail fields reuse the exact rule each one already has on the public Contact form
 * (`contact-validation.ts`), the same single source of truth `enquiries.schema.ts` builds on, so a Lead
 * and an Enquiry can never silently diverge on what counts as a valid name/phone/location/etc.
 */
const field = (name: ContactField) =>
  z
    .string({ error: validateContactField(name, "") ?? "This field must be text." })
    .trim()
    .superRefine((value, ctx) => {
      const problem = validateContactField(name, value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });
const optional = (name: ContactField) => field(name).transform((v) => v || undefined).optional();

/** Lowercased in addition to the shared email rule, purely so future duplicate lookups (`leads_email_idx`) are case-insensitive — never a destructive change to what the visitor actually typed. */
const optionalEmail = field("email").transform((v) => (v ? v.toLowerCase() : undefined)).optional();

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const leadPrioritySchema = z.enum(LEAD_PRIORITIES);
export const leadSourceSchema = z.enum(LEAD_SOURCES);

/**
 * One lead, as the future `POST /api/leads` controller will receive it. `primaryService`, when
 * present, must be an existing service's `slug` (the stable identifier, not its display name) —
 * only the slug *format* is checked here; confirming that slug names a currently published service
 * is an async database lookup, so — matching how `enquiries.service.ts`'s `createEnquiry` checks
 * `serviceOfInterest` — that belongs to the future `createLead` service function, not this schema.
 */
export const leadInputSchema = z.object({
  fullName: field("name"),
  companyName: optional("companyName"),
  websiteOrInstagram: optional("website"),
  phone: field("phone").transform(normalizePhone),
  email: optionalEmail,
  location: field("location"),
  primaryService: slugSchema.optional(),
  monthlyMarketingBudget: optional("monthlyBudget"),
  primaryGoal: optional("primaryGoal"),
  additionalContext: optional("message"),
  status: leadStatusSchema.default(DEFAULT_LEAD_STATUS),
  priority: leadPrioritySchema.default(DEFAULT_LEAD_PRIORITY),
  source: leadSourceSchema.default(DEFAULT_LEAD_SOURCE),
  /**
   * A future admin identity. There is no user/admin-account model yet (Phase 0 audit: auth is two
   * shared bearer tokens, not per-user rows) — Phase 2 must introduce one before assignment can mean
   * anything beyond a free-text label. Any non-empty string is accepted here so this schema does not
   * have to change once that model exists; only the eventual service-layer lookup does.
   */
  assignedTo: z.string().trim().min(1).optional(),
}).strict();
export type LeadInput = z.infer<typeof leadInputSchema>;

/**
 * One future `lead_activity` row (the Phase 7 activity timeline and audit trail share this shape —
 * see `schema.ts`'s comment on why they are one collection, not two). Not read or written by any API
 * yet; establishing the shape now so later phases insert a consistent record instead of each
 * inventing its own ad hoc one.
 */
export const leadActivityEntrySchema = z.object({
  leadId: z.uuid(),
  type: z.string().trim().min(1).max(60),
  message: z.string().trim().max(2000).optional(),
  previousValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  actor: z.string().trim().min(1).max(200).optional(),
});
export type LeadActivityEntry = z.infer<typeof leadActivityEntrySchema>;

/** The admin Leads workspace's sort options (Phase 5 brief, Step 10) — deliberately only the fields a plain `createdAt`/`updatedAt`/`fullName` sort can serve without a new index. */
export const LEAD_SORTS = ["newest", "oldest", "updated", "name_asc", "name_desc"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

/** A plain `<input type="date">` value (`YYYY-MM-DD`) — the browser's own native date picker already produces exactly this format, so no client-side parsing/formatting is needed before it reaches the query string. */
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date").optional();

/**
 * `GET /api/admin/leads` (and the `/admin/leads` page, which calls `listLeads` directly — same
 * pattern as every other listing page in this project, e.g. `/work`, `/insights`: the page is not a
 * client of its own public API). `search` matches name/company/email/phone/website; `service` is the
 * service's slug (the stable identifier the table also displays by); `source` is a real Phase 1 field
 * (`WEBSITE_CONTACT` today, extensible later). `dateFrom`/`dateTo` are an actual inclusive calendar
 * range (either end optional) rather than a fixed set of presets — a deliberate change from the
 * original "All time/Today/7d/30d" dropdown, matching an explicit admin-panel reference the CRM's
 * layout was asked to follow. No `assignedTo` filter: every lead's `assignedTo` is still `null` today
 * (Phase 1/2 — no admin-identity model exists yet to assign to), so a filter for it would have
 * nothing real to filter by.
 */
export const listLeadsQuerySchema = pageQuerySchema.extend({
  // Overrides the generic `pageQuerySchema.limit` (max 50, default 12) with the Leads workspace's own
  // fixed set of page sizes, rather than accepting any 1–50 value — a UI control offering 15/25/50/100
  // should not silently also accept, say, 13.
  limit: z.coerce.number().refine((v): v is (typeof LEAD_PAGE_SIZES)[number] => LEAD_PAGE_SIZES.includes(v as never), "Must be 15, 25, 50, or 100").default(DEFAULT_LEAD_PAGE_SIZE),
  search: printable.optional(),
  status: leadStatusSchema.optional(),
  service: slugSchema.optional(),
  source: leadSourceSchema.optional(),
  sort: z.enum(LEAD_SORTS).default("newest"),
  dateFrom: dateOnly,
  dateTo: dateOnly,
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

/**
 * `PATCH /api/admin/leads/:id`. Deliberately CRM-metadata only — `status`, `priority`, and
 * `assignedTo` — never the lead's own submitted contact/business fields (name, company, email,
 * phone, website, location, service, budget, goal, context). Those are a record of what the visitor
 * actually told SMASH through the Contact form; an admin changing them after the fact would quietly
 * rewrite that record, which is exactly what this schema exists to prevent by construction (there is
 * no key here for any of them, so a request containing one is a hard `.strict()` rejection, not a
 * silently ignored field). The Lead Detail page shows them read-only for this same reason.
 *
 * `assignedTo` accepts an explicit `null` to mean "unassign," distinguishable from "omitted" because
 * the unassign action needs a real way to clear it.
 */
export const leadUpdateSchema = z.object({
  status: leadStatusSchema.optional(),
  priority: leadPrioritySchema.optional(),
  assignedTo: z.union([z.string().trim().min(1).max(200), z.null()]).optional(),
}).strict();
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

/** `POST /api/admin/leads/:id/notes` (CRM Phase 6). Unlike every other lead field, a note has no "leave it alone" case — the whole point of the request is to add one, so `content` is required here, not optional. */
export const addLeadNoteSchema = z.object({
  content: z.string().trim().min(1, "Note cannot be empty.").max(2000, "Note is too long (2000 characters max)."),
}).strict();
export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>;
