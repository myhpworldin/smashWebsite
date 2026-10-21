import { beforeEach, describe, expect, it, vi } from "vitest";

// Nothing in these tests may send real mail: the sender is replaced and every call is inspected.
const sent = vi.hoisted(() => [] as { to: string[]; subject: string; html: string }[]);
vi.mock("@/server/email/send", () => ({ sendEmail: async (m: { to: string[]; subject: string; html: string }) => { sent.push(m); return { sent: true }; } }));

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is not used here
process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
process.env.CLOUDINARY_API_KEY = "123456";
process.env.CLOUDINARY_API_SECRET = "abcd";
process.env.ENQUIRY_NOTIFY_EMAIL = "team@smash.test";

import { createTestDb } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { clientAccounts, clientDashboards } from "@/server/db/schema";
import { defaultSections } from "@/lib/client-options";
import { clientFolder, privateDownloadUrl, signParams, signUpload } from "@/server/lib/cloudinary";
import {
  clientTicketSchema, creativeDecisionSchema, creativeInputSchema, projectInputSchema, storedFileSchema, WORKSPACE_SECTIONS,
} from "@/server/modules/client-accounts/client-records.schema";
import {
  addAdminMessage, createClientTicket, createRecord, decideCreative, deleteRecord, findInvoiceFile, listClientView, listRecords, replyToTicket, updateRecord,
} from "@/server/modules/client-accounts/client-records.service";
import { acceptTerms, effectiveSections, findWorkspace, saveWorkspaceSection } from "@/server/modules/client-accounts/client-workspace.service";
import { activityEmail } from "@/server/email/client-activity-templates";
import { acceptTermsController, createRecordController, createTicketController, replyToTicketController, respondToCreativeController } from "@/server/api/client-records.controller";
import { deriveOverview, effectiveInvoiceStatus, loadAttention, loadOverview, onboardingChecklist } from "@/server/modules/client-accounts/client-overview.service";

const ADMIN = "admin@smash.test";
let db: Db;
let A: string; // two clients, to prove one can never reach the other's records
let B: string;
const account = (id: string, contactName: string) => ({ id, contactName, email: `${contactName.toLowerCase()}@x.com` });

beforeEach(async () => {
  sent.length = 0;
  ({ db } = await createTestDb());
  const mk = async (email: string) => (await insertRow(db, clientAccounts, { email, companyName: "Co", contactName: "Pat", passwordHash: "x", services: [] }, "Account")).id;
  A = await mk("a@x.com");
  B = await mk("b@x.com");
});

const file = (accountId: string, kind: "creative" | "invoice", name = "file") => ({
  publicId: `${clientFolder(accountId, kind)}/${name}`, url: `https://res.cloudinary.com/demo-cloud/image/${kind === "invoice" ? "authenticated" : "upload"}/v1/${name}.pdf`,
  resourceType: "image" as const, format: "pdf", bytes: 2048, type: kind === "invoice" ? ("authenticated" as const) : ("upload" as const), name: `${name}.pdf`,
});

describe("Cloudinary signing", () => {
  it("matches Cloudinary's documented signature example", () => {
    // From Cloudinary's docs: these parameters with the secret "abcd" sign to this value.
    expect(signParams({ eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 }, "abcd")).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
  it("signs an upload into the client's own folder with the right privacy type", () => {
    const s = signUpload(A, "invoice", new Date("2026-10-20T00:00:00Z"));
    expect(s.fields.folder).toBe(`clients/${A}/invoices`);
    expect(s.fields.type).toBe("authenticated");
    expect(s.signature).toBe(signParams(s.fields, "abcd"));
    expect(s.uploadUrl).toContain("/demo-cloud/");
    expect(JSON.stringify(s)).not.toContain("abcd"); // the secret never leaves the server
  });
  it("builds a signed, expiring private download link", () => {
    const url = new URL(privateDownloadUrl({ publicId: "clients/x/invoices/a", resourceType: "image", format: "pdf", type: "authenticated" }, { now: new Date("2026-10-20T00:00:00Z"), ttlSeconds: 300 }));
    expect(url.searchParams.get("type")).toBe("authenticated");
    expect(url.searchParams.get("signature")).toMatch(/^[0-9a-f]{40}$/);
    expect(Number(url.searchParams.get("expires_at")) - Number(url.searchParams.get("timestamp"))).toBe(300);
  });
});

describe("schemas", () => {
  it("validates real calendar dates and rejects unknown keys", () => {
    expect(projectInputSchema.safeParse({ name: "Site", startDate: "2026-02-30" }).success).toBe(false);
    expect(projectInputSchema.safeParse({ name: "Site", startDate: "2026-02-10", surprise: 1 }).success).toBe(false);
    expect(projectInputSchema.parse({ name: "Site", startDate: "" }).startDate).toBeNull();
  });
  it("accepts only Cloudinary-hosted files", () => {
    expect(storedFileSchema.safeParse({ ...file(A, "creative"), url: "https://evil.example.com/x.pdf" }).success).toBe(false);
    expect(storedFileSchema.safeParse(file(A, "creative")).success).toBe(true);
  });
  it("needs a reason unless a client approves", () => {
    expect(creativeDecisionSchema.safeParse({ decision: "APPROVED" }).success).toBe(true);
    expect(creativeDecisionSchema.safeParse({ decision: "REJECTED" }).success).toBe(false);
    expect(creativeDecisionSchema.safeParse({ decision: "REVISION", message: "Make the logo bigger" }).success).toBe(true);
  });
  it("checks the workspace sections", () => {
    expect(WORKSPACE_SECTIONS.profile.parse({ website: "example.com" }).website).toBe("https://example.com");
    expect(WORKSPACE_SECTIONS.billingPlan.safeParse({ packageName: "Growth", monthlyFee: -5, adSpendBudget: 0 }).success).toBe(false);
    expect(WORKSPACE_SECTIONS.terms.safeParse({ text: "short" }).success).toBe(false);
    expect(clientTicketSchema.safeParse({ subject: "Hi", message: "x" }).success).toBe(false);
    expect(creativeInputSchema.parse({ title: "Reel" }).status).toBe("DRAFT");
  });
});

describe("per-client records", () => {
  it("keeps every record inside its own client", async () => {
    const project = await createRecord(db, "projects", A, { name: "Website rebuild" }, ADMIN);
    expect(await listRecords(db, "projects", B)).toHaveLength(0);
    await expect(updateRecord(db, "projects", B, project.id as string, { name: "Hijacked" }, ADMIN)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteRecord(db, "projects", B, project.id as string)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listRecords(db, "projects", A)).toHaveLength(1);
    await deleteRecord(db, "projects", A, project.id as string);
    expect(await listRecords(db, "projects", A)).toHaveLength(0);
  });

  it("refuses a completion date before the start date", async () => {
    await expect(createRecord(db, "projects", A, { name: "X", startDate: "2026-05-10", expectedCompletion: "2026-05-01" }, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("works out an invoice's total, marks paid ones, and keeps numbers unique per client", async () => {
    const inv = await createRecord(db, "invoices", A, { number: "INV-1", issueDate: "2026-10-01", dueDate: "2026-10-15", agencyFee: 20000, adSpend: 30000 }, ADMIN);
    expect(inv.total).toBe(50000);
    const paid = await updateRecord(db, "invoices", A, inv.id as string, { number: "INV-1", issueDate: "2026-10-01", dueDate: "2026-10-15", agencyFee: 20000, adSpend: 30000, status: "PAID" }, ADMIN);
    expect(paid.amountPaid).toBe(50000);
    expect(paid.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(createRecord(db, "invoices", A, { number: "INV-1", issueDate: "2026-11-01", dueDate: "2026-11-15", agencyFee: 1 }, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await createRecord(db, "invoices", B, { number: "INV-1", issueDate: "2026-11-01", dueDate: "2026-11-15", agencyFee: 1000 }, ADMIN); // the same number for another client is fine
    await expect(createRecord(db, "invoices", A, { number: "INV-2", issueDate: "2026-11-01", dueDate: "2026-11-15", agencyFee: 100, amountPaid: 500 }, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("only stores files this server asked for, in this client's folder", async () => {
    await expect(createRecord(db, "invoices", A, { number: "X", issueDate: "2026-10-01", dueDate: "2026-10-02", agencyFee: 10, file: file(B, "invoice") }, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(createRecord(db, "invoices", A, { number: "X", issueDate: "2026-10-01", dueDate: "2026-10-02", agencyFee: 10, file: file(A, "creative") }, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const ok = await createRecord(db, "invoices", A, { number: "X", issueDate: "2026-10-01", dueDate: "2026-10-02", agencyFee: 10, file: file(A, "invoice") }, ADMIN);
    expect((await findInvoiceFile(db, A, ok.id as string))?.publicId).toContain(`clients/${A}/invoices`);
    expect(await findInvoiceFile(db, B, ok.id as string)).toBeNull();
    const [view] = await listClientView(db, "invoices", A);
    expect(view.file).toBeNull(); // the private link is never sent to the portal
    expect(view.hasFile).toBe(true);
  });
});

describe("content approval", () => {
  const draft = (over: Record<string, unknown> = {}) => ({ title: "Diwali reel", type: "Reel", file: file(A, "creative", "reel1"), ...over });

  it("needs a file before it can go to the client, and hides drafts from them", async () => {
    await expect(createRecord(db, "creatives", A, { title: "No file", status: "PENDING" }, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await createRecord(db, "creatives", A, draft(), ADMIN);
    expect(await listClientView(db, "creatives", A)).toHaveLength(0);
    await createRecord(db, "creatives", A, draft({ title: "Ready", status: "PENDING" }), ADMIN);
    expect(await listClientView(db, "creatives", A)).toHaveLength(1);
  });

  it("lets a client decide a pending item exactly once, and only their own", async () => {
    const item = await createRecord(db, "creatives", A, draft({ status: "PENDING" }), ADMIN);
    const id = item.id as string;
    await expect(decideCreative(db, account(B, "Bob"), id, { decision: "APPROVED" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(decideCreative(db, account(A, "Pat"), id, { decision: "REVISION" })).rejects.toThrow(/describe the changes/); // validation failures reach the API as a 422
    const done = await decideCreative(db, account(A, "Pat"), id, { decision: "REVISION", message: "Logo bigger" });
    expect(done.status).toBe("REVISION");
    expect((done.thread as { by: string; message: string }[])[0]).toMatchObject({ by: "client", message: "Logo bigger" });
    await expect(decideCreative(db, account(A, "Pat"), id, { decision: "APPROVED" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("sends a revised file back for approval with a new version", async () => {
    const item = await createRecord(db, "creatives", A, draft({ status: "PENDING" }), ADMIN);
    await decideCreative(db, account(A, "Pat"), item.id as string, { decision: "REVISION", message: "Change it" });
    const revised = await updateRecord(db, "creatives", A, item.id as string, draft({ status: "REVISION", file: file(A, "creative", "reel2") }), ADMIN);
    expect(revised.status).toBe("PENDING");
    expect(revised.version).toBe(2);
    expect(revised.thread).toHaveLength(1); // the conversation is kept
    await addAdminMessage(db, "creatives", A, item.id as string, { message: "Done — new cut attached" }, ADMIN);
    expect(((await listRecords(db, "creatives", A))[0] as { thread: unknown[] }).thread).toHaveLength(2);
  });
});

describe("support tickets", () => {
  it("opens, replies, reopens and closes properly", async () => {
    const t = await createClientTicket(db, account(A, "Pat"), { subject: "Ad not showing", message: "Since Monday" });
    const id = t.id as string;
    expect(t).toMatchObject({ status: "OPEN", createdBy: "client", lastMessageBy: "client" });
    expect((await loadAttention(db, A)).tickets).toBe(1);
    const answered = await addAdminMessage(db, "tickets", A, id, { message: "Looking into it" }, ADMIN);
    expect(answered).toMatchObject({ status: "IN_PROGRESS", lastMessageBy: "admin" });
    expect((await loadAttention(db, A)).tickets).toBe(0);
    await addAdminMessage(db, "tickets", A, id, { message: "Fixed", status: "RESOLVED" }, ADMIN);
    expect((await replyToTicket(db, account(A, "Pat"), id, { message: "Still broken" })).status).toBe("OPEN");
    await expect(replyToTicket(db, account(B, "Bob"), id, { message: "mine now" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await updateRecord(db, "tickets", A, id, { subject: "Ad not showing", status: "CLOSED" }, ADMIN);
    await expect(replyToTicket(db, account(A, "Pat"), id, { message: "hello?" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("workspace", () => {
  it("saves sections independently and stamps each", async () => {
    await saveWorkspaceSection(db, A, { section: "accountManager", value: { name: "Riya Nair", email: "riya@smash.test" } }, ADMIN);
    const ws = await saveWorkspaceSection(db, A, { section: "meetings", value: [{ title: "Monthly review", startsAt: "2026-11-02T10:00:00+05:30" }] }, ADMIN);
    expect(ws.accountManager?.name).toBe("Riya Nair");
    expect(ws.meetings[0].id).toBeTruthy();
    expect(Object.keys(ws.sectionUpdatedAt).sort()).toEqual(["accountManager", "meetings"]);
    expect(await findWorkspace(db, B)).toBeNull();
    await expect(saveWorkspaceSection(db, A, { section: "billingPlan", value: { packageName: "x" } }, ADMIN)).rejects.toThrow();
  });

  it("versions the terms and clears acceptance when the wording changes", async () => {
    const text = "These are the terms of our service agreement.";
    await saveWorkspaceSection(db, A, { section: "terms", value: { text } }, ADMIN);
    const accepted = await acceptTerms(db, { ...account(A, "Pat") });
    expect(accepted.terms).toMatchObject({ version: 1, acceptedVersion: 1 });
    expect((await saveWorkspaceSection(db, A, { section: "terms", value: { text } }, ADMIN)).terms?.acceptedVersion).toBe(1); // unchanged text keeps acceptance
    const changed = await saveWorkspaceSection(db, A, { section: "terms", value: { text: `${text} Now with a new clause.` } }, ADMIN);
    expect(changed.terms).toMatchObject({ version: 2, acceptedVersion: null, acceptedAt: null });
    await expect(acceptTerms(db, account(B, "Bob"))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("works out which sections a client sees", async () => {
    const ads = [{ title: "Meta Ads", categoryName: "Growth" }];
    expect(defaultSections(ads)).toEqual(expect.arrayContaining(["overview", "campaigns", "leads", "billing", "support", "account"]));
    expect(defaultSections(ads)).not.toContain("content");
    expect(defaultSections([{ title: "Websites", categoryName: "Technology" }])).toContain("projects");
    expect(effectiveSections(null, ads)).toContain("leads");
    const ws = await saveWorkspaceSection(db, A, { section: "enabledSections", value: ["content"] }, ADMIN);
    expect(effectiveSections(ws, ads)).toEqual(["overview", "content", "billing", "support", "account"]); // always-on ones cannot be switched off
  });
});

describe("dashboard overview", () => {
  const now = new Date("2026-10-20T06:00:00Z"); // 11:30 IST, 20 Oct
  const base = { now, projects: [], dashboard: null, leadLogCount: 0, creatives: [], invoices: [], tickets: [], meetings: [], termsPending: false };

  it("is all zeros for a client with nothing entered", () => {
    const o = deriveOverview(base);
    expect(o).toMatchObject({ activeProjects: 0, activeCampaigns: 0, totalLeads: 0, totalAdSpend: 0, pending: { total: 0, items: [] }, deadlines: [] });
  });

  it("counts active projects and campaigns, and sums spend", () => {
    const o = deriveOverview({
      ...base,
      projects: [{ name: "A", status: "IN_PROGRESS", expectedCompletion: null }, { name: "B", status: "COMPLETED", expectedCompletion: null }, { name: "C", status: "ON_HOLD", expectedCompletion: null }, { name: "D", status: "PLANNING", expectedCompletion: null }],
      dashboard: { currency: "INR", leads: 0, amountSpent: 100.5, campaigns: [
        { id: "1", name: "x", platform: "Meta Ads", status: "ACTIVE", budget: 100, spent: 40, leads: 10, calls: 0 },
        { id: "2", name: "y", platform: "Google Ads", status: "PAUSED", budget: 100, spent: 60.5, leads: 5, calls: 0 },
      ] },
    });
    expect(o.activeProjects).toBe(2);
    expect(o.activeCampaigns).toBe(1);
    expect(o.totalAdSpend).toBe(100.5);
    expect(o).toMatchObject({ totalLeads: 15, leadsSource: "campaigns" });
  });

  it("prefers the lead log over campaign-reported leads once it has records", () => {
    const o = deriveOverview({ ...base, leadLogCount: 31, dashboard: { currency: "INR", leads: 0, amountSpent: 0, campaigns: [{ id: "1", name: "x", platform: "Meta Ads", status: "ACTIVE", budget: 0, spent: 0, leads: 40, calls: 0 }] } });
    expect(o).toMatchObject({ totalLeads: 31, leadsSource: "log", campaignLeads: 40 });
  });

  it("falls back to the typed headline figures when there are no campaigns", () => {
    expect(deriveOverview({ ...base, dashboard: { currency: "INR", leads: 12, amountSpent: 900, campaigns: [] } })).toMatchObject({ totalLeads: 12, totalAdSpend: 900 });
  });

  it("collects what needs the client and the next deadlines, overdue first", () => {
    const o = deriveOverview({
      ...base,
      termsPending: true,
      creatives: [{ title: "Diwali reel", status: "PENDING", scheduledFor: "2026-10-25" }],
      invoices: [{ number: "INV-9", status: "PENDING", dueDate: "2026-10-10", total: 100, amountPaid: 0 }, { number: "INV-10", status: "PENDING", dueDate: "2026-10-28", total: 100, amountPaid: 0 }],
      projects: [{ name: "Site", status: "IN_PROGRESS", expectedCompletion: "2026-12-30" }], // outside the 30-day window
      meetings: [{ title: "Review", startsAt: "2026-10-22T05:30:00Z" }, { title: "Past call", startsAt: "2026-10-01T05:30:00Z" }],
      tickets: [{ status: "OPEN", lastMessageBy: "admin" }, { status: "OPEN", lastMessageBy: "client" }],
    });
    expect(o.pending.items.map((i) => i.kind)).toEqual(["creatives", "invoices", "terms", "tickets"]);
    expect(o.pending.total).toBe(1 + 2 + 1 + 1);
    expect(o.pending.items[1].label).toContain("1 overdue");
    expect(o.deadlines.map((d) => d.title)).toEqual(["Invoice INV-9 due", "Review", "Diwali reel — approve before it goes live", "Invoice INV-10 due"]);
    expect(o.deadlines[0].overdue).toBe(true);
  });

  it("treats an unpaid invoice past its due date as overdue", () => {
    expect(effectiveInvoiceStatus({ status: "PENDING", dueDate: "2026-10-01" }, "2026-10-20")).toBe("OVERDUE");
    expect(effectiveInvoiceStatus({ status: "PAID", dueDate: "2026-10-01" }, "2026-10-20")).toBe("PAID");
    expect(effectiveInvoiceStatus({ status: "PENDING", dueDate: "2026-10-30" }, "2026-10-20")).toBe("PENDING");
  });

  it("loads the same numbers from the database", async () => {
    await createRecord(db, "projects", A, { name: "Site", status: "IN_PROGRESS" }, ADMIN);
    await createRecord(db, "projects", B, { name: "Other client's", status: "IN_PROGRESS" }, ADMIN);
    await createRecord(db, "leads", A, { name: "Lead 1", receivedAt: "2026-10-01" }, ADMIN);
    await insertRow(db, clientDashboards, { id: A, currency: "INR", amountSpent: 7, campaigns: [{ id: "c", name: "n", platform: "Meta Ads", status: "ACTIVE", budget: 10, spent: 7, leads: 3, calls: 0 }] } as never, "Dashboard");
    const o = await loadOverview(db, A, now);
    expect(o).toMatchObject({ activeProjects: 1, activeCampaigns: 1, totalLeads: 1, leadsSource: "log", totalAdSpend: 7 });
    expect(o.budget.state).toBe("none"); // no total budget set yet
  });

  it("builds the onboarding checklist from what exists", async () => {
    expect(onboardingChecklist(null, { projects: 0, campaigns: 0, services: 1, budget: false }).every((i) => !i.done)).toBe(true);
    const ws = await saveWorkspaceSection(db, A, { section: "accountManager", value: { name: "Riya Nair" } }, ADMIN);
    const items = onboardingChecklist(ws, { projects: 1, campaigns: 0, services: 1, budget: true });
    expect(items.find((i) => i.key === "manager")?.done).toBe(true);
    expect(items.find((i) => i.key === "project")?.done).toBe(true);
    expect(items.find((i) => i.key === "campaign")?.done).toBe(false);
    expect(items.find((i) => i.key === "budget")?.done).toBe(true);
  });
});

describe("notification emails", () => {
  const pat = { id: "", contactName: "Pat", email: "a@x.com", companyName: "Co" };

  it("escapes everything that varies", () => {
    const company = { name: "SMASH", siteUrl: "https://smash.test", email: null, phone: null, whatsapp: null, address: null, socials: [] };
    const mail = activityEmail(company, { audience: "client", name: "<b>Pat</b>", eyebrow: "E", title: "T", intro: "hello <script>x</script>", rows: [["Label", "<img src=x onerror=1>"]], quote: "<a href=evil>", cta: { url: "https://smash.test/client", label: "Go" }, subject: "Line one\nLine two" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img");
    expect(mail.subject).not.toContain("\n");
  });

  it("tells the client when content is sent for approval or an invoice is added, and the team when the client decides", async () => {
    const ctx = (kind: string, body: unknown) => ({ db, url: new URL("http://x"), params: { id: A, kind }, body, admin: { email: ADMIN } }) as never;
    const item = (await createRecordController(ctx("creatives", { title: "Diwali reel", type: "Reel", status: "PENDING", file: file(A, "creative", "reel") }))).data as { id: string };
    expect(sent.at(-1)).toMatchObject({ to: ["a@x.com"], subject: "Please review: Diwali reel" });
    await createRecordController(ctx("invoices", { number: "INV-7", issueDate: "2026-10-01", dueDate: "2026-10-10", agencyFee: 5000 }));
    expect(sent.at(-1)?.subject).toContain("INV-7");
    sent.length = 0;
    await respondToCreativeController({ db, url: new URL("http://x"), params: { id: item.id }, body: { decision: "REVISION", message: "Bigger logo" }, account: { ...pat, id: A } } as never);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["team@smash.test"]);
    expect(sent[0].subject).toContain("asked for changes");
    expect(sent[0].html).toContain("Bigger logo");
  });

  it("tells the team about a client's ticket and the client about the team's reply", async () => {
    const base = { db, url: new URL("http://x"), account: { ...pat, id: A } };
    const t = (await createTicketController({ ...base, params: {}, body: { subject: "Ad not showing", message: "Since Monday" } } as never)).data as { id: string };
    expect(sent.at(-1)).toMatchObject({ to: ["team@smash.test"] });
    expect(sent.at(-1)?.subject).toContain("New ticket");
    await replyToTicketController({ ...base, params: { id: t.id }, body: { message: "Still down" } } as never);
    expect(sent.at(-1)?.subject).toContain("Reply from");
  });

  it("does not let a mail failure undo the save", async () => {
    sent.length = 0;
    const { sendEmail } = await import("@/server/email/send");
    expect(typeof sendEmail).toBe("function");
    await expect(acceptTermsController({ db, url: new URL("http://x"), params: {}, body: {}, account: { ...pat, id: A } } as never)).rejects.toMatchObject({ code: "NOT_FOUND" }); // no terms yet: a clean error, no email
    expect(sent).toHaveLength(0);
  });
});
