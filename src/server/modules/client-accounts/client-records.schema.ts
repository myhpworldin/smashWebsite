import { z } from "zod";
import {
  BILLING_CYCLES, CLIENT_CURRENCIES, CLIENT_LEAD_SOURCES, CLIENT_LEAD_STATUSES, CONNECTED_PLATFORMS, CREATIVE_PLATFORMS, CREATIVE_STATUSES, CREATIVE_TYPES, FOLLOW_UP_STATUSES, INVOICE_STATUSES,
  MAX_MEETINGS, MAX_NOTIFICATIONS, MAX_PLATFORMS, MAX_TEAM_MEMBERS, NOTIFICATION_LEVELS, PORTAL_SECTIONS, PROJECT_STATUSES, TEAM_ACCESS_LEVELS, TICKET_KINDS, TICKET_PRIORITIES, TICKET_STATUSES,
} from "@/lib/client-options";
import { emailField, money, text } from "./client-accounts.schema";

/* ---- Field building blocks ---- */

/** An optional free-text value: blank or missing becomes `null`. */
export const optText = (label: string, max: number) =>
  z.string({ error: `${label} must be text.` }).trim().max(max, `${label} is too long (${max} characters at most).`).nullish().transform((v) => v || null);

/** `YYYY-MM-DD` that is a real calendar day. */
export const dateField = (label: string) =>
  z.string({ error: `Please enter ${label}.` }).trim().regex(/^\d{4}-\d{2}-\d{2}$/, `${label[0].toUpperCase()}${label.slice(1)} must be a date.`).refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), `${label[0].toUpperCase()}${label.slice(1)} is not a real date.`);
export const optDate = (label: string) => z.union([dateField(label), z.literal(""), z.null()]).optional().transform((v) => v || null);

/** An ISO moment (`2026-10-21T10:30:00.000Z`), kept as text so it sorts and never shifts with a time zone. */
export const dateTimeField = (label: string) =>
  z.string({ error: `Please enter ${label}.` }).trim().refine((v) => !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T/.test(v), `${label[0].toUpperCase()}${label.slice(1)} must be a date and time.`).transform((v) => new Date(v).toISOString());
export const optDateTime = (label: string) => z.union([dateTimeField(label), z.literal(""), z.null()]).optional().transform((v) => v || null);

export const optEmail = z.union([emailField, z.literal(""), z.null()]).optional().transform((v) => v || null);
export const optUrl = (label: string) =>
  z.union([z.string().trim().max(300, `${label} is too long.`).refine((v) => { try { const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`); return !!u.hostname.includes("."); } catch { return false; } }, `${label} is not a valid web address.`), z.literal(""), z.null()])
    .optional().transform((v) => (v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : null));
export const optPhone = z.string().trim().max(30, "The number is too long.").regex(/^[+()\d\s.-]*$/, "Use digits, spaces and + ( ) - only.").nullish().transform((v) => v || null);

/** What the browser reports after a direct Cloudinary upload. Whether it is really ours (cloud name, folder) is checked by the service, which knows the account and the environment. */
export const storedFileSchema = z.object({
  publicId: z.string().trim().min(1).max(240).regex(/^[\w./-]+$/, "Invalid file reference."),
  url: z.string().trim().url().max(600).refine((v) => new URL(v).protocol === "https:" && new URL(v).hostname === "res.cloudinary.com", "The file must be hosted on Cloudinary."),
  resourceType: z.enum(["image", "video", "raw"]),
  format: z.string().trim().max(10).nullish().transform((v) => v || null),
  bytes: z.number().int().min(1).max(120 * 1024 * 1024, "The file is too large."),
  type: z.enum(["upload", "authenticated"]),
  name: z.string().trim().min(1).max(200),
}).strict();

const oneOf = <T extends readonly [string, ...string[]]>(list: T, message: string) => z.enum(list, { error: message });

/* ---- Per-client lists ---- */

export const projectInputSchema = z.object({
  name: text("the project name", 1, 120),
  serviceType: optText("The service", 120),
  startDate: optDate("the start date"),
  team: z.array(text("a team member's name", 1, 80)).max(20, "At most 20 team members.").default([]),
  status: oneOf(PROJECT_STATUSES, "Choose a status.").default("PLANNING"),
  expectedCompletion: optDate("the completion date"),
  notes: optText("The notes", 1000),
}).strict();

export const creativeInputSchema = z.object({
  title: text("the title", 1, 140),
  type: oneOf(CREATIVE_TYPES, "Choose a type.").default("Post"),
  platform: z.union([oneOf(CREATIVE_PLATFORMS, "Choose a platform."), z.literal(""), z.null()]).optional().transform((v) => v || null),
  scheduledFor: optDate("the scheduled date"),
  caption: optText("The caption", 2000),
  file: storedFileSchema.nullish().transform((v) => v ?? null),
  status: oneOf(CREATIVE_STATUSES, "Choose a status.").default("DRAFT"),
}).strict();

export const leadInputSchema = z.object({
  name: text("the lead's name", 1, 120),
  phone: optPhone,
  email: optEmail,
  source: oneOf(CLIENT_LEAD_SOURCES, "Choose a source.").default("Other"),
  campaignName: optText("The campaign", 120),
  status: oneOf(CLIENT_LEAD_STATUSES, "Choose a status.").default("NEW"),
  receivedAt: dateField("the date received"),
  value: z.union([money("The value"), z.null()]).optional().transform((v) => v ?? null),
  followUpStatus: oneOf(FOLLOW_UP_STATUSES, "Choose a follow-up status.").default("NONE"),
  followUpAt: optDate("the follow-up date"),
  notes: optText("The notes", 1000),
}).strict();

export const invoiceInputSchema = z.object({
  number: text("the invoice number", 1, 40),
  period: optText("The period", 60),
  issueDate: dateField("the issue date"),
  dueDate: dateField("the due date"),
  agencyFee: money("The agency fee").default(0),
  adSpend: money("The ad spend").default(0),
  total: z.union([money("The total"), z.null()]).optional().transform((v) => v ?? null),
  amountPaid: money("The amount paid").default(0),
  status: oneOf(INVOICE_STATUSES, "Choose a status.").default("PENDING"),
  paidAt: optDate("the payment date"),
  file: storedFileSchema.nullish().transform((v) => v ?? null),
  notes: optText("The notes", 500),
}).strict();

export const ticketInputSchema = z.object({
  subject: text("the subject", 3, 160),
  kind: oneOf(TICKET_KINDS, "Choose a kind.").default("support"),
  priority: oneOf(TICKET_PRIORITIES, "Choose a priority.").default("MEDIUM"),
  status: oneOf(TICKET_STATUSES, "Choose a status.").default("OPEN"),
  message: optText("The message", 4000),
}).strict();

/** A message on a ticket or creative thread. `status` lets the admin move the item along while replying. */
export const adminThreadMessageSchema = z.object({
  message: text("a message", 1, 4000),
  status: z.string().optional(),
}).strict();

/* ---- Client responses ---- */

export const creativeDecisionSchema = z.object({
  decision: oneOf(["APPROVED", "REJECTED", "REVISION"] as const, "Choose approve, reject or request changes."),
  message: optText("The message", 2000),
}).strict().superRefine((v, ctx) => {
  if (v.decision !== "APPROVED" && !v.message) ctx.addIssue({ code: "custom", path: ["message"], message: v.decision === "REJECTED" ? "Please tell us why this was rejected." : "Please describe the changes you would like." });
});

export const clientTicketSchema = z.object({
  subject: text("a subject", 3, 160),
  kind: oneOf(TICKET_KINDS, "Choose a kind.").default("support"),
  priority: oneOf(TICKET_PRIORITIES, "Choose a priority.").default("MEDIUM"),
  message: text("a message", 3, 4000),
}).strict();

export const clientReplySchema = z.object({ message: text("a message", 1, 4000) }).strict();

/* ---- Workspace sections (one document per client) ---- */

const withId = { id: z.string().trim().min(1).max(64).optional() };

export const WORKSPACE_SECTIONS = {
  accountManager: z.union([z.object({ name: text("the manager's name", 2, 100), email: optEmail, phone: optPhone, whatsapp: optPhone }).strict(), z.null()]),
  profile: z.object({ website: optUrl("The website"), businessType: optText("The business type", 100), address: optText("The address", 300) }).strict(),
  connectedPlatforms: z.array(z.object({ platform: oneOf(CONNECTED_PLATFORMS, "Choose a platform."), handle: optText("The handle or link", 200) }).strict()).max(MAX_PLATFORMS, `At most ${MAX_PLATFORMS} platforms.`),
  teamMembers: z.array(z.object({ ...withId, name: text("the member's name", 2, 100), email: optEmail, phone: optPhone, role: optText("The role", 80), access: oneOf(TEAM_ACCESS_LEVELS, "Choose an access level.").default("Viewer") }).strict()).max(MAX_TEAM_MEMBERS, `At most ${MAX_TEAM_MEMBERS} people.`),
  billingPlan: z.union([z.object({
    packageName: text("the package name", 2, 120), monthlyFee: money("The fee"), adSpendBudget: money("The ad spend budget"),
    currency: oneOf(CLIENT_CURRENCIES, "Choose a currency.").default("INR"), cycle: oneOf(BILLING_CYCLES, "Choose a billing cycle.").default("Monthly"), nextDueDate: optDate("the next due date"),
  }).strict(), z.null()]),
  meetings: z.array(z.object({ ...withId, title: text("the meeting title", 2, 140), startsAt: dateTimeField("the start time"), link: optUrl("The meeting link"), notes: optText("The notes", 500) }).strict()).max(MAX_MEETINGS, `At most ${MAX_MEETINGS} meetings.`),
  notifications: z.array(z.object({ ...withId, title: text("the title", 2, 120), body: optText("The message", 500), level: oneOf(NOTIFICATION_LEVELS, "Choose a level.").default("info"), at: optDateTime("the time") }).strict()).max(MAX_NOTIFICATIONS, `At most ${MAX_NOTIFICATIONS} notifications.`),
  terms: z.object({ text: text("the terms", 20, 20000) }).strict(),
  enabledSections: z.array(oneOf(PORTAL_SECTIONS, "Unknown section.")).max(PORTAL_SECTIONS.length),
} as const;
export type WorkspaceSectionKey = keyof typeof WORKSPACE_SECTIONS;
export const workspaceSectionBodySchema = z.object({ section: z.enum(Object.keys(WORKSPACE_SECTIONS) as [WorkspaceSectionKey, ...WorkspaceSectionKey[]]), value: z.unknown() }).strict();
