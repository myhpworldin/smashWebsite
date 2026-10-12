/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies, same as tests/api.test.ts */
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb } from "./test-db";
import { col, findRows, getRowById, insertRow, type Db } from "@/server/db/helpers";
import { leads, leadActivity, SPEC } from "@/server/db/schema";
import { addLeadNoteSchema, leadActivityEntrySchema, leadInputSchema, leadUpdateSchema, listLeadsQuerySchema } from "@/server/modules/leads/leads.schema";
import { addLeadNote, createLead, getLeadStatusSummary, listLeads, updateLead } from "@/server/modules/leads/leads.service";
import { listLeadActivity } from "@/server/modules/leads/lead-activity.service";
import { RATE_LIMITS, resetRateLimits } from "@/server/api/rate-limit";
import { createService } from "@/server/modules/services/services.service";
import { AppError } from "@/server/lib/errors";
import { POST as leadsRoute } from "@/app/api/leads/route";

const VALID_LEAD = {
  fullName: "Peter Parker",
  companyName: "Daily Bugle Enterprises",
  websiteOrInstagram: "https://dailybugle.com",
  phone: "+91 98765 43210",
  email: "Peter@DailyBugle.com",
  location: "Mumbai, India",
  primaryService: "performance-marketing",
  monthlyMarketingBudget: "₹50,000/-",
  primaryGoal: "Scale customer acquisition",
  additionalContext: "Looking to scale paid acquisition ahead of a festive-season launch.",
};

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  resetRateLimits();
});
afterEach(() => vi.restoreAllMocks());

describe("lead schema (Zod)", () => {
  it("accepts a fully valid lead and fills in the CRM defaults", () => {
    const parsed = leadInputSchema.parse(VALID_LEAD);
    expect(parsed.status).toBe("NEW");
    expect(parsed.priority).toBe("MEDIUM");
    expect(parsed.source).toBe("WEBSITE_CONTACT");
    expect(parsed.fullName).toBe("Peter Parker");
    expect(parsed.phone).toBe("+919876543210"); // normalizePhone strips spaces
    expect(parsed.email).toBe("peter@dailybugle.com"); // lowercased for lookup, nothing else changed
  });

  it("accepts the minimum required fields alone", () => {
    const parsed = leadInputSchema.parse({ fullName: "Mary Jane", phone: "+91 98765 00000", location: "Delhi, India" });
    expect(parsed).toMatchObject({ status: "NEW", priority: "MEDIUM", source: "WEBSITE_CONTACT" });
    expect(parsed.companyName).toBeUndefined();
  });

  it("rejects a lead missing the required fullName", () => {
    const rest = { ...VALID_LEAD };
    delete (rest as Partial<typeof rest>).fullName;
    expect(leadInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a lead missing the required phone or location", () => {
    expect(leadInputSchema.safeParse({ fullName: "X", location: "Mumbai" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ fullName: "X", phone: "+919876543210" }).success).toBe(false);
  });

  it("rejects a primaryService that is not a valid slug", () => {
    expect(leadInputSchema.safeParse({ ...VALID_LEAD, primaryService: "Not A Slug!" }).success).toBe(false);
  });

  it("rejects an unsupported status", () => {
    expect(leadInputSchema.safeParse({ ...VALID_LEAD, status: "ARCHIVED" }).success).toBe(false);
  });

  it("rejects an unsupported priority", () => {
    expect(leadInputSchema.safeParse({ ...VALID_LEAD, priority: "URGENT" }).success).toBe(false);
  });

  it("rejects an unsupported source", () => {
    expect(leadInputSchema.safeParse({ ...VALID_LEAD, source: "COLD_CALL" }).success).toBe(false);
  });

  it("rejects an invalid email when one is provided", () => {
    expect(leadInputSchema.safeParse({ ...VALID_LEAD, email: "not-an-email" }).success).toBe(false);
  });

  it("validates a lead_activity entry shape", () => {
    const leadId = randomUUID();
    expect(leadActivityEntrySchema.safeParse({ leadId, type: "status_changed", previousValue: "NEW", newValue: "CONTACTED" }).success).toBe(true);
    expect(leadActivityEntrySchema.safeParse({ leadId: "not-a-uuid", type: "status_changed" }).success).toBe(false);
    expect(leadActivityEntrySchema.safeParse({ leadId, type: "" }).success).toBe(false);
  });
});

describe("lead collection (database)", () => {
  it("is created with its validator and the expected indexes", async () => {
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    expect(names).toContain("leads");
    expect(names).toContain("lead_activity");
    const idx = (await col(db, leads).indexes()).map((i) => i.name);
    for (const name of ["leads_created_at_idx", "leads_status_created_idx", "leads_priority_idx", "leads_source_idx", "leads_primary_service_idx", "leads_assigned_to_idx", "leads_phone_key_idx", "leads_email_idx"]) {
      expect(idx).toContain(name);
    }
    expect((await col(db, leadActivity).indexes()).map((i) => i.name)).toContain("lead_activity_timeline_idx");
  });

  it("applies CRM defaults on insert", async () => {
    const row = await insertRow(db, leads, { fullName: "Peter Parker", phone: "+919876543210", location: "Mumbai, India" }, "Lead");
    expect(row.status).toBe("NEW");
    expect(row.priority).toBe("MEDIUM");
    expect(row.source).toBe("WEBSITE_CONTACT");
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row.companyName).toBeNull(); // unset optional columns read as null, same as every other module
    expect(row.assignedTo).toBeNull();
  });

  it("keeps a repeat submission as its own lead (no merge-by-phone, unlike enquiries)", async () => {
    await insertRow(db, leads, { fullName: "Peter Parker", phone: "+919876543210", location: "Mumbai, India" }, "Lead");
    await insertRow(db, leads, { fullName: "Peter Parker", phone: "+919876543210", location: "Mumbai, India" }, "Lead");
    expect(await col(db, leads).countDocuments({ phone: "+919876543210" })).toBe(2);
  });

  it("enforces the status/priority/source enums at the database level, even bypassing Zod", async () => {
    await expect(col(db, leads).insertOne({ fullName: "X", phone: "+919876543210", location: "Mumbai", status: "ARCHIVED", priority: "MEDIUM", source: "WEBSITE_CONTACT" })).rejects.toThrow();
    await expect(col(db, leads).insertOne({ fullName: "X", phone: "+919876543210", location: "Mumbai", status: "NEW", priority: "URGENT", source: "WEBSITE_CONTACT" })).rejects.toThrow();
    await expect(col(db, leads).insertOne({ fullName: "X", phone: "+919876543210", location: "Mumbai", status: "NEW", priority: "MEDIUM", source: "COLD_CALL" })).rejects.toThrow();
    await expect(col(db, leads).insertOne({ fullName: "X", phone: "+919876543210", location: "Mumbai", status: "NEW", priority: "MEDIUM", source: "WEBSITE_CONTACT" })).resolves.toBeTruthy();
  });

  it("has no default/nullable spec drift (every Rows.leads field is accounted for)", () => {
    expect(SPEC.leads.nullable).toEqual(["companyName", "websiteOrInstagram", "phoneKey", "email", "primaryService", "monthlyMarketingBudget", "primaryGoal", "additionalContext", "assignedTo"]);
  });
});

describe("leads API — POST /api/leads (CRM Phase 3)", () => {
  type Body = { success: boolean; data?: any; error?: { code: string; fields?: Record<string, string> } };
  const post = async (json: unknown, headers: Record<string, string> = {}) => {
    const res = await leadsRoute(new Request("http://evil.example/api/leads", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(json) }));
    return { status: res.status, body: (await res.json()) as Body, res };
  };
  const valid = { name: "Ada Lovelace", phone: "+91 98765 43210", location: "Mumbai, India" };

  it("creates a lead with the server-assigned CRM defaults, never echoes the data back, and is never cached", async () => {
    const { status, body, res } = await post({ ...valid, email: "ada@example.com", message: "We'd like to talk about a project." });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { received: true } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    const rows = await findRows(db, leads);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      fullName: "Ada Lovelace", phone: "+919876543210", phoneKey: "9876543210", location: "Mumbai, India",
      email: "ada@example.com", additionalContext: "We'd like to talk about a project.",
      status: "NEW", priority: "MEDIUM", source: "WEBSITE_CONTACT", assignedTo: null,
    });
    expect(rows[0].createdAt).toBeInstanceOf(Date);
    expect(rows[0].updatedAt).toBeInstanceOf(Date);
  });

  it("needs only name, phone and location; every other field is optional", async () => {
    expect((await post(valid)).status).toBe(200);
    expect((await findRows(db, leads))[0]).toMatchObject({ email: null, additionalContext: null, companyName: null, websiteOrInstagram: null, monthlyMarketingBudget: null, primaryGoal: null, primaryService: null });
  });

  it("resolves serviceOfInterest (the form's display-name field) to the matching published service's slug", async () => {
    await createService(db, { name: "Performance Marketing", slug: "performance-marketing", shortDescription: "d", description: "d", status: "published" });
    const full = { ...valid, companyName: "Daily Bugle", website: "dailybugle.com", monthlyBudget: "₹50,000/-", primaryGoal: "Generate more leads", serviceOfInterest: "Performance Marketing" };
    expect((await post(full)).status).toBe(200);
    expect((await findRows(db, leads))[0]).toMatchObject({
      companyName: "Daily Bugle", websiteOrInstagram: "dailybugle.com", monthlyMarketingBudget: "₹50,000/-", primaryGoal: "Generate more leads",
      primaryService: "performance-marketing", // the slug, not "Performance Marketing"
    });
  });

  it("rejects a serviceOfInterest that does not match any real, published service", async () => {
    const { status, body } = await post({ ...valid, serviceOfInterest: "Something Made Up" });
    expect(status).toBe(422);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
    expect(await findRows(db, leads)).toHaveLength(0);

    // A real but still-draft service doesn't count either — it was never actually offered in the form's dropdown.
    await createService(db, { name: "Unpublished Service", slug: "unpublished-service", shortDescription: "d" });
    expect((await post({ ...valid, serviceOfInterest: "Unpublished Service" })).status).toBe(422);
  });

  it("creates one lead per submission — unlike /api/contact, a repeat enquiry from the same phone is not merged", async () => {
    await post({ ...valid, message: "First question" });
    await post({ name: "Ada L.", phone: "+91 98765 43210", location: "Pune", message: "A genuinely new enquiry, well outside the duplicate window" });
    // The second call differs enough (location) that it is not the same accidental resubmission; both are real rows.
    expect(await findRows(db, leads)).toHaveLength(2);
  });

  it("treats an immediate identical resubmission (double-click, retry) as one lead, not two", async () => {
    const first = await post(valid);
    const second = await post(valid); // same name/phone/location, no meaningful time has passed
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await findRows(db, leads)).toHaveLength(1);
  });

  it("rejects invalid input with a plain-language message per field, and persists nothing", async () => {
    const bad = { name: "A1!", phone: "12ab", location: "", email: "not-an-email", website: "javascript:alert(1)", monthlyBudget: "lots", primaryGoal: "Something else" };
    const { status, body } = await post(bad);
    expect(status).toBe(422);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
    expect(body.error?.fields).toMatchObject({ name: expect.any(String), phone: expect.any(String), location: expect.any(String), email: expect.any(String) });
    expect((await post({})).body.error?.fields).toMatchObject({ name: expect.any(String), phone: expect.any(String), location: expect.any(String) });
    expect(await findRows(db, leads)).toHaveLength(0);
  });

  it("rejects malformed JSON as a plain 400, not a raw parser error", async () => {
    const res = await leadsRoute(new Request("http://evil.example/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });

  it("silently drops a submission with a filled honeypot — accepted, but never stored", async () => {
    const { status, body } = await post({ ...valid, honeypot: "http://spam.example" });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { received: true } }); // identical to a real success — no signal is given to the bot
    expect(await findRows(db, leads)).toHaveLength(0);
  });

  it("rejects a client-supplied status, priority or source — those keys don't exist on the public schema at all", async () => {
    for (const extra of [{ status: "CONVERTED" }, { priority: "HIGH" }, { source: "MANUAL" }, { assignedTo: "someone" }]) {
      const { status, body } = await post({ ...valid, ...extra });
      expect(status, JSON.stringify(extra)).toBe(422);
      expect(body.error?.code).toBe("VALIDATION_ERROR");
    }
    expect(await findRows(db, leads)).toHaveLength(0);
  });

  it("rate limits writes at the publicWrite limit, same bucket shape as /api/contact", async () => {
    for (let i = 0; i < RATE_LIMITS.publicWrite.limit; i++) {
      expect((await post(valid, { "x-forwarded-for": "9.9.9.2" })).status).toBe(200);
    }
    const blocked = await post(valid, { "x-forwarded-for": "9.9.9.2" });
    expect(blocked.status).toBe(429);
  });
});

describe("listLeadsQuerySchema (CRM Phase 5)", () => {
  it("defaults to newest-first, page 1, 25 rows, no date range", () => {
    const q = listLeadsQuerySchema.parse({});
    expect(q).toMatchObject({ page: 1, limit: 25, sort: "newest" });
    expect(q.search).toBeUndefined();
    expect(q.status).toBeUndefined();
    expect(q.dateFrom).toBeUndefined();
    expect(q.dateTo).toBeUndefined();
  });

  it("rejects an unsupported status, sort, source, or malformed date", () => {
    expect(listLeadsQuerySchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
    expect(listLeadsQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
    expect(listLeadsQuerySchema.safeParse({ source: "COLD_CALL" }).success).toBe(false);
    expect(listLeadsQuerySchema.safeParse({ dateFrom: "5 Oct 2026" }).success).toBe(false);
  });

  it("accepts a real status/sort/source/date and a search string", () => {
    const q = listLeadsQuerySchema.parse({ status: "NEW", sort: "oldest", source: "WEBSITE_CONTACT", dateFrom: "2026-10-01", dateTo: "2026-10-05", search: "Ada" });
    expect(q).toMatchObject({ status: "NEW", sort: "oldest", source: "WEBSITE_CONTACT", dateFrom: "2026-10-01", dateTo: "2026-10-05", search: "Ada" });
  });
});

describe("listLeads (CRM Phase 5)", () => {
  const seed = (overrides: Record<string, unknown> = {}) =>
    insertRow(db, leads, { fullName: "Ada Lovelace", phone: "+919876543210", location: "Mumbai, India", ...overrides }, "Lead");

  it("searches across name, company, email, phone, and website — case-insensitively", async () => {
    await seed({ fullName: "Ada Lovelace", companyName: "Analytical Engines" });
    await seed({ fullName: "Grace Hopper", phone: "+911234567890" });
    const base = listLeadsQuerySchema.parse({});

    expect((await listLeads(db, { ...base, search: "ada" })).items).toHaveLength(1);
    expect((await listLeads(db, { ...base, search: "ANALYTICAL" })).items).toHaveLength(1);
    expect((await listLeads(db, { ...base, search: "nobody" })).items).toHaveLength(0);
  });

  it("treats regex special characters in the search term as literal text, not a pattern", async () => {
    await seed({ fullName: "Ada Lovelace", companyName: "A+B (Co.)" });
    const base = listLeadsQuerySchema.parse({});
    const result = await listLeads(db, { ...base, search: "A+B (Co.)" });
    expect(result.items).toHaveLength(1);
    // A pathological pattern must not be interpreted as regex syntax (ReDoS/crash risk) — it simply matches nothing.
    await expect(listLeads(db, { ...base, search: "(a+)+$" })).resolves.toMatchObject({ items: [], total: 0 });
  });

  it("filters by status and by service slug", async () => {
    await seed({ fullName: "New One", status: "NEW", primaryService: "performance-marketing" });
    await seed({ fullName: "Converted One", status: "CONVERTED", primaryService: "social-media" });
    const base = listLeadsQuerySchema.parse({});

    expect((await listLeads(db, { ...base, status: "CONVERTED" })).items).toMatchObject([{ fullName: "Converted One" }]);
    expect((await listLeads(db, { ...base, service: "performance-marketing" })).items).toMatchObject([{ fullName: "New One" }]);
  });

  it("filters by an inclusive dateFrom/dateTo calendar range", async () => {
    await seed({ fullName: "Early Lead", createdAt: new Date("2026-10-01T08:00:00Z") });
    await seed({ fullName: "Mid Lead", createdAt: new Date("2026-10-05T23:59:00Z") }); // still within dateTo's inclusive end-of-day
    await seed({ fullName: "Late Lead", createdAt: new Date("2026-10-10T00:00:01Z") });
    const base = listLeadsQuerySchema.parse({});

    expect((await listLeads(db, { ...base, dateFrom: "2026-10-01", dateTo: "2026-10-05" })).items.map((l) => l.fullName)).toEqual(["Mid Lead", "Early Lead"]); // default sort is newest-first
    expect((await listLeads(db, { ...base, dateFrom: "2026-10-10" })).items).toMatchObject([{ fullName: "Late Lead" }]);
    expect((await listLeads(db, base)).total).toBe(3); // no date bound at all → every lead
  });

  it("filters by source", async () => {
    await seed({ fullName: "Contact Form Lead", source: "WEBSITE_CONTACT" });
    await seed({ fullName: "Manual Lead", source: "MANUAL" });
    const base = listLeadsQuerySchema.parse({});
    expect((await listLeads(db, { ...base, source: "MANUAL" })).items).toMatchObject([{ fullName: "Manual Lead" }]);
  });

  it("sorts by newest, oldest, name A–Z and Z–A", async () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    await seed({ fullName: "Bob", createdAt: new Date(t0.getTime() + 1000) });
    await seed({ fullName: "Amy", createdAt: t0 });
    const base = listLeadsQuerySchema.parse({});

    expect((await listLeads(db, { ...base, sort: "newest" })).items.map((l) => l.fullName)).toEqual(["Bob", "Amy"]);
    expect((await listLeads(db, { ...base, sort: "oldest" })).items.map((l) => l.fullName)).toEqual(["Amy", "Bob"]);
    expect((await listLeads(db, { ...base, sort: "name_asc" })).items.map((l) => l.fullName)).toEqual(["Amy", "Bob"]);
    expect((await listLeads(db, { ...base, sort: "name_desc" })).items.map((l) => l.fullName)).toEqual(["Bob", "Amy"]);
  });

  it("paginates with a correct total independent of the current page", async () => {
    for (let i = 0; i < 20; i++) await seed({ fullName: `Lead ${i}` });
    const page1 = await listLeads(db, listLeadsQuerySchema.parse({ limit: 15, page: 1 }));
    const page2 = await listLeads(db, listLeadsQuerySchema.parse({ limit: 15, page: 2 }));
    expect(page1.items).toHaveLength(15);
    expect(page2.items).toHaveLength(5);
    expect(page1.total).toBe(20);
    expect(page2.total).toBe(20);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
  });

  it("only accepts the Leads workspace's fixed rows-per-page choices", () => {
    expect(listLeadsQuerySchema.safeParse({ limit: 13 }).success).toBe(false);
    for (const size of [15, 25, 50, 100]) expect(listLeadsQuerySchema.safeParse({ limit: size }).success, String(size)).toBe(true);
  });
});

describe("getLeadStatusSummary (CRM Phase 5)", () => {
  it("counts every status, including zero-count ones, and a grand total — unaffected by filters", async () => {
    await insertRow(db, leads, { fullName: "A", phone: "+919876543210", location: "Mumbai", status: "NEW" }, "Lead");
    await insertRow(db, leads, { fullName: "B", phone: "+919876543211", location: "Mumbai", status: "NEW" }, "Lead");
    await insertRow(db, leads, { fullName: "C", phone: "+919876543212", location: "Mumbai", status: "CONVERTED" }, "Lead");

    const summary = await getLeadStatusSummary(db);
    expect(summary).toMatchObject({ total: 3, NEW: 2, CONVERTED: 1, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, LOST: 0 });
  });

  it("returns all-zero counts for an empty collection", async () => {
    const summary = await getLeadStatusSummary(db);
    expect(summary).toEqual({ total: 0, NEW: 0, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, CONVERTED: 0, LOST: 0 });
  });
});

describe("leadUpdateSchema / addLeadNoteSchema (CRM Phase 6)", () => {
  it("accepts a sparse partial update — every key optional", () => {
    expect(leadUpdateSchema.safeParse({}).success).toBe(true);
    expect(leadUpdateSchema.safeParse({ status: "CONTACTED" }).success).toBe(true);
    expect(leadUpdateSchema.safeParse({ priority: "HIGH" }).success).toBe(true);
  });

  it("rejects an unsupported status or priority, and any key outside the allowlist", () => {
    expect(leadUpdateSchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ priority: "URGENT" }).success).toBe(false);
    expect(leadUpdateSchema.safeParse({ source: "MANUAL" }).success).toBe(false); // not editable — mass-assignment guard
    expect(leadUpdateSchema.safeParse({ passwordHash: "x" }).success).toBe(false);
  });

  it("never accepts the lead's own submitted contact/business fields — an admin cannot edit what a visitor said", () => {
    for (const field of ["fullName", "companyName", "websiteOrInstagram", "phone", "email", "location", "primaryService", "monthlyMarketingBudget", "primaryGoal", "additionalContext"]) {
      expect(leadUpdateSchema.safeParse({ [field]: "anything" }).success, field).toBe(false);
    }
  });

  it("assignedTo accepts a name, or an explicit null to unassign, distinct from omitted", () => {
    expect(leadUpdateSchema.parse({ assignedTo: "admin@smash.international" }).assignedTo).toBe("admin@smash.international");
    expect(leadUpdateSchema.parse({ assignedTo: null }).assignedTo).toBeNull();
    expect("assignedTo" in leadUpdateSchema.parse({})).toBe(false);
  });

  it("addLeadNoteSchema requires non-empty, bounded content", () => {
    expect(addLeadNoteSchema.safeParse({ content: "" }).success).toBe(false);
    expect(addLeadNoteSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(addLeadNoteSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
    expect(addLeadNoteSchema.parse({ content: "  Called client.  " }).content).toBe("Called client.");
  });
});

describe("updateLead (CRM Phase 6)", () => {
  const seedLead = () => insertRow(db, leads, { fullName: "Ada Lovelace", phone: "+919876543210", location: "Mumbai, India" }, "Lead");

  it("changes status and records exactly one STATUS_CHANGED activity entry", async () => {
    const lead = await seedLead();
    const updated = await updateLead(db, lead.id, "admin@smash.international", { status: "CONTACTED" });
    expect(updated.status).toBe("CONTACTED");
    const activity = await listLeadActivity(db, lead.id);
    expect(activity).toMatchObject([{ type: "STATUS_CHANGED", previousValue: "NEW", newValue: "CONTACTED", actor: "admin@smash.international" }]);
  });

  it("records no activity when the submitted status/priority is identical to the current value", async () => {
    const lead = await seedLead();
    await updateLead(db, lead.id, "admin@smash.international", { status: "NEW", priority: "MEDIUM" }); // same as the defaults
    expect(await listLeadActivity(db, lead.id)).toEqual([]);
  });

  it("distinguishes ASSIGNED, REASSIGNED and UNASSIGNED", async () => {
    const lead = await seedLead();
    await updateLead(db, lead.id, "admin@smash.international", { assignedTo: "ada@smash.international" });
    await updateLead(db, lead.id, "admin@smash.international", { assignedTo: "grace@smash.international" });
    await updateLead(db, lead.id, "admin@smash.international", { assignedTo: null });
    const types = (await listLeadActivity(db, lead.id)).map((a) => a.type);
    expect(types).toEqual(["ASSIGNED", "REASSIGNED", "UNASSIGNED"]);
  });

  it("records one activity entry per kind of change in a single combined request", async () => {
    const lead = await seedLead();
    await updateLead(db, lead.id, "admin@smash.international", { status: "QUALIFIED", priority: "HIGH" });
    const types = (await listLeadActivity(db, lead.id)).map((a) => a.type);
    expect(types.sort()).toEqual(["PRIORITY_CHANGED", "STATUS_CHANGED"]);
  });

  it("never touches the lead's own submitted fields, even if somehow present in the input object", async () => {
    const lead = await seedLead();
    // `updateLead` parses through `leadUpdateSchema` first, so an extra key is rejected outright —
    // this exercises that rejection, not a successful update that happened to leave the field alone.
    // (The schema's own `.strict()` throws a ZodError directly here; the HTTP controller is what
    // converts that into the public `AppError.validation` shape — see `handler.ts`'s `fail()`.)
    await expect(updateLead(db, lead.id, "admin@smash.international", { status: "CONTACTED", companyName: "Daily Bugle Enterprises" })).rejects.toThrow();
    const unchanged = await getRowById(db, leads, lead.id, "Lead");
    expect(unchanged.companyName).toBeNull();
    expect(unchanged.status).toBe("NEW"); // the whole request was rejected — not even the valid `status` key was applied
  });

  it("throws a not-found error for a lead id that does not exist", async () => {
    await expect(updateLead(db, randomUUID(), "admin@smash.international", { status: "NEW" })).rejects.toBeInstanceOf(AppError);
  });
});

describe("addLeadNote (CRM Phase 6)", () => {
  it("adds a note as a NOTE_ADDED activity entry with the actor and content", async () => {
    const lead = await insertRow(db, leads, { fullName: "Ada Lovelace", phone: "+919876543210", location: "Mumbai, India" }, "Lead");
    const note = await addLeadNote(db, lead.id, "admin@smash.international", { content: "Called client. Requested proposal for Meta Ads." });
    expect(note).toMatchObject({ type: "NOTE_ADDED", message: "Called client. Requested proposal for Meta Ads.", actor: "admin@smash.international" });
    expect(await listLeadActivity(db, lead.id)).toHaveLength(1);
  });

  it("rejects an empty note and persists nothing", async () => {
    const lead = await insertRow(db, leads, { fullName: "Ada Lovelace", phone: "+919876543210", location: "Mumbai, India" }, "Lead");
    await expect(addLeadNote(db, lead.id, "admin@smash.international", { content: "   " })).rejects.toThrow();
    expect(await listLeadActivity(db, lead.id)).toEqual([]);
  });

  it("throws a not-found error for a lead id that does not exist, rather than writing an orphaned note", async () => {
    await expect(addLeadNote(db, randomUUID(), "admin@smash.international", { content: "x" })).rejects.toBeInstanceOf(AppError);
  });
});

describe("lead activity on creation (CRM Phase 6)", () => {
  it("records a LEAD_CREATED activity entry with no human actor when a public submission creates a lead", async () => {
    const result = await createLead(db, { name: "Ada Lovelace", phone: "+91 98765 43210", location: "Mumbai, India" });
    const activity = await listLeadActivity(db, result.id!);
    expect(activity).toMatchObject([{ type: "LEAD_CREATED", actor: null }]);
  });

  it("lists activity oldest-first", async () => {
    const lead = await insertRow(db, leads, { fullName: "Ada Lovelace", phone: "+919876543210", location: "Mumbai, India" }, "Lead");
    await updateLead(db, lead.id, "a@smash.international", { status: "CONTACTED" });
    await updateLead(db, lead.id, "a@smash.international", { status: "QUALIFIED" });
    const activity = await listLeadActivity(db, lead.id);
    expect(activity.map((a) => a.newValue)).toEqual(["CONTACTED", "QUALIFIED"]);
    expect(activity[0].createdAt.getTime()).toBeLessThanOrEqual(activity[1].createdAt.getTime());
  });
});
