"use client";

import type { ReactNode } from "react";
import { Briefcase, FileText, Image as ImageIcon, LifeBuoy, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CLIENT_LEAD_SOURCES, CLIENT_LEAD_STATUSES, CLIENT_LEAD_STATUS_LABEL, CREATIVE_PLATFORMS, CREATIVE_STATUSES, CREATIVE_STATUS_LABEL, CREATIVE_TYPES, FOLLOW_UP_LABEL, FOLLOW_UP_STATUSES, INVOICE_STATUSES,
  INVOICE_STATUS_LABEL, PROJECT_STATUSES, PROJECT_STATUS_LABEL, TICKET_KINDS, TICKET_KIND_LABEL, TICKET_PRIORITIES, TICKET_PRIORITY_LABEL, TICKET_STATUSES, TICKET_STATUS_LABEL, todayKey,
  type ClientCurrency,
} from "@/lib/client-options";
import { effectiveInvoiceStatus, istDay } from "@/lib/client-dates";
import { AdminBadge } from "../AdminBadge";
import type { FieldDef } from "./fields";
import { ago, fmtDay, money } from "./format";
import styles from "./Workspace.module.css";

export type Row = Record<string, unknown> & { id: string };
export type RecordContext = { currency: ClientCurrency; serviceGroups: { label: string; options: string[] }[]; campaignNames: string[] };
type Tone = "neutral" | "accent" | "warning" | "success" | "danger";

export type RecordConfig = {
  singular: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyText: string;
  hasThread?: boolean;
  fields: (ctx: RecordContext) => FieldDef[];
  columns: (ctx: RecordContext) => { header: string; num?: boolean; cell: (row: Row) => ReactNode }[];
  summary?: (rows: Row[], ctx: RecordContext) => { label: string; value: string }[];
  /** Pre-filled values for a new record. */
  defaults?: () => Record<string, string>;
  /** Shown above the form when adding, e.g. why something needs to exist first. */
  notice?: (rows: Row[], ctx: RecordContext) => string | null;
};

const opts = <T extends string>(list: readonly T[], labels: Record<T, string>) => list.map((v) => ({ value: v, label: labels[v] }));
const plain = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));
const stacked = (top: ReactNode, bottom?: ReactNode) => <span className={styles.rowTitle}><strong>{top}</strong>{bottom ? <span style={{ fontSize: "0.8125rem", color: "var(--admin-text-muted)" }}>{bottom}</span> : null}</span>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

const PROJECT_TONE: Record<string, Tone> = { PLANNING: "neutral", IN_PROGRESS: "accent", IN_REVIEW: "warning", ON_HOLD: "danger", COMPLETED: "success" };
const CREATIVE_TONE: Record<string, Tone> = { DRAFT: "neutral", PENDING: "warning", APPROVED: "success", REJECTED: "danger", REVISION: "accent" };
const LEAD_TONE: Record<string, Tone> = { NEW: "accent", CONTACTED: "warning", QUALIFIED: "accent", CONVERTED: "success", LOST: "danger" };
const INVOICE_TONE: Record<string, Tone> = { PENDING: "warning", PARTIAL: "accent", PAID: "success", OVERDUE: "danger" };
const TICKET_TONE: Record<string, Tone> = { OPEN: "warning", IN_PROGRESS: "accent", RESOLVED: "success", CLOSED: "neutral" };

export const RECORD_CONFIGS: Record<"projects" | "creatives" | "leads" | "invoices" | "tickets", RecordConfig> = {
  projects: {
    singular: "project", title: "Projects", subtitle: "What SMASH is building for this client, who is on it and when it lands.", icon: Briefcase,
    emptyTitle: "No projects yet", emptyText: "Add the work in progress — a website build, a campaign launch, a rebrand — and the client sees it on their Projects page.",
    fields: ({ serviceGroups }) => [
      { name: "name", label: "Project name", type: "text", span: 4, required: true, maxLength: 120, placeholder: "e.g. Website redesign" },
      { name: "serviceType", label: "Service type", type: "select", span: 2, groups: serviceGroups, placeholder: "Select a service" },
      { name: "status", label: "Current status", type: "select", span: 2, required: true, options: opts(PROJECT_STATUSES, PROJECT_STATUS_LABEL) },
      { name: "startDate", label: "Start date", type: "date", span: 2 },
      { name: "expectedCompletion", label: "Expected completion", type: "date", span: 2 },
      { name: "team", label: "Assigned team", type: "tags", span: 4, hint: "Names, separated by commas." },
      { name: "notes", label: "Notes for the client", type: "textarea", span: 4, rows: 3, maxLength: 1000 },
    ],
    columns: () => [
      { header: "Project", cell: (r) => stacked(str(r.name), str(r.serviceType)) },
      { header: "Team", cell: (r) => (Array.isArray(r.team) && r.team.length ? <span className={styles.chip}>{r.team.slice(0, 2).join(", ")}{r.team.length > 2 ? ` +${r.team.length - 2}` : ""}</span> : <span style={{ color: "var(--admin-text-subtle)" }}>—</span>) },
      { header: "Started", cell: (r) => fmtDay(str(r.startDate) || null) },
      { header: "Expected", cell: (r) => fmtDay(str(r.expectedCompletion) || null) },
      { header: "Status", cell: (r) => <AdminBadge label={PROJECT_STATUS_LABEL[r.status as keyof typeof PROJECT_STATUS_LABEL]} tone={PROJECT_TONE[str(r.status)]} /> },
    ],
    summary: (rows) => [
      { label: "Total", value: String(rows.length) },
      { label: "Active", value: String(rows.filter((r) => ["PLANNING", "IN_PROGRESS", "IN_REVIEW"].includes(str(r.status))).length) },
      { label: "Completed", value: String(rows.filter((r) => r.status === "COMPLETED").length) },
    ],
    defaults: () => ({ status: "PLANNING" }),
  },

  creatives: {
    singular: "content item", title: "Creative & content", subtitle: "Posts, videos and designs for the client to approve. Items marked “Awaiting approval” appear in their portal.", icon: ImageIcon, hasThread: true,
    emptyTitle: "No content yet", emptyText: "Upload a post, reel or design and send it for approval. The client can approve it, reject it or ask for changes from their portal.",
    fields: () => [
      { name: "title", label: "Title", type: "text", span: 4, required: true, maxLength: 140, placeholder: "e.g. Diwali offer reel" },
      { name: "type", label: "Type", type: "select", span: 2, required: true, options: plain(CREATIVE_TYPES) },
      { name: "platform", label: "Platform", type: "select", span: 2, options: plain(CREATIVE_PLATFORMS), placeholder: "—" },
      { name: "scheduledFor", label: "Scheduled to go live", type: "date", span: 2, hint: "Feeds the client's content calendar." },
      { name: "status", label: "Status", type: "select", span: 2, required: true, options: opts(CREATIVE_STATUSES, CREATIVE_STATUS_LABEL), hint: "Choose “Awaiting approval” to send it to the client." },
      { name: "file", label: "File", type: "file", span: 4, uploadKind: "creative" },
      { name: "caption", label: "Caption / copy", type: "textarea", span: 4, rows: 4, maxLength: 2000 },
    ],
    columns: () => [
      { header: "Content", cell: (r) => stacked(str(r.title), [str(r.type), str(r.platform)].filter(Boolean).join(" · ")) },
      { header: "Scheduled", cell: (r) => fmtDay(str(r.scheduledFor) || null) },
      { header: "Version", cell: (r) => `v${Number(r.version ?? 1)}` },
      { header: "Feedback", cell: (r) => { const n = Array.isArray(r.thread) ? r.thread.length : 0; return n ? <span className={styles.chip}>{n} message{n === 1 ? "" : "s"}</span> : <span style={{ color: "var(--admin-text-subtle)" }}>—</span>; } },
      { header: "Status", cell: (r) => <AdminBadge label={CREATIVE_STATUS_LABEL[r.status as keyof typeof CREATIVE_STATUS_LABEL]} tone={CREATIVE_TONE[str(r.status)]} live={r.status === "PENDING"} /> },
    ],
    summary: (rows) => [
      { label: "Awaiting approval", value: String(rows.filter((r) => r.status === "PENDING").length) },
      { label: "Approved", value: String(rows.filter((r) => r.status === "APPROVED").length) },
      { label: "Needs changes", value: String(rows.filter((r) => r.status === "REVISION" || r.status === "REJECTED").length) },
    ],
    defaults: () => ({ type: "Post", status: "DRAFT" }),
  },

  leads: {
    singular: "lead", title: "Leads & follow-ups", subtitle: "Enquiries generated for this client's campaigns — kept apart from SMASH's own sales leads.", icon: UserPlus,
    emptyTitle: "No leads logged yet", emptyText: "Add the leads the client's campaigns bring in, with their source and follow-up. Once there are records, the overview counts from this log.",
    fields: ({ campaignNames }) => [
      { name: "name", label: "Lead's name", type: "text", span: 2, required: true, maxLength: 120 },
      { name: "receivedAt", label: "Date received", type: "date", span: 2, required: true },
      { name: "phone", label: "Phone", type: "text", span: 2, placeholder: "+91 98765 43210" },
      { name: "email", label: "Email", type: "text", span: 2 },
      { name: "source", label: "Source", type: "select", span: 2, required: true, options: plain(CLIENT_LEAD_SOURCES) },
      { name: "campaignName", label: "Campaign", type: "text", span: 2, suggestions: campaignNames, maxLength: 120 },
      { name: "status", label: "Status", type: "select", span: 2, required: true, options: opts(CLIENT_LEAD_STATUSES, CLIENT_LEAD_STATUS_LABEL) },
      { name: "value", label: "Deal value", type: "money", span: 2, hint: "Optional." },
      { name: "followUpStatus", label: "Follow-up", type: "select", span: 2, required: true, options: opts(FOLLOW_UP_STATUSES, FOLLOW_UP_LABEL) },
      { name: "followUpAt", label: "Follow-up date", type: "date", span: 2, when: (v) => v.followUpStatus === "SCHEDULED" },
      { name: "notes", label: "Notes", type: "textarea", span: 4, rows: 3, maxLength: 1000 },
    ],
    columns: (ctx) => [
      { header: "Lead", cell: (r) => stacked(str(r.name), [str(r.phone), str(r.email)].filter(Boolean).join(" · ")) },
      { header: "Source", cell: (r) => stacked(str(r.source), str(r.campaignName)) },
      { header: "Received", cell: (r) => fmtDay(str(r.receivedAt)) },
      { header: "Status", cell: (r) => <AdminBadge label={CLIENT_LEAD_STATUS_LABEL[r.status as keyof typeof CLIENT_LEAD_STATUS_LABEL]} tone={LEAD_TONE[str(r.status)]} /> },
      { header: "Follow-up", cell: (r) => (r.followUpStatus === "NONE" ? <span style={{ color: "var(--admin-text-subtle)" }}>—</span> : <span className={styles.chip}>{FOLLOW_UP_LABEL[r.followUpStatus as keyof typeof FOLLOW_UP_LABEL]}{r.followUpAt ? ` · ${fmtDay(str(r.followUpAt))}` : ""}</span>) },
      { header: "Value", num: true, cell: (r) => (typeof r.value === "number" ? money(r.value, ctx.currency) : "—") },
    ],
    summary: (rows) => {
      const converted = rows.filter((r) => r.status === "CONVERTED").length;
      return [
        { label: "Total leads", value: String(rows.length) },
        { label: "New", value: String(rows.filter((r) => r.status === "NEW").length) },
        { label: "Converted", value: String(converted) },
        { label: "Conversion rate", value: rows.length ? `${Math.round((converted / rows.length) * 100)}%` : "—" },
      ];
    },
    defaults: () => ({ receivedAt: todayKey(), source: "Meta Ads", status: "NEW", followUpStatus: "NONE" }),
  },

  invoices: {
    singular: "invoice", title: "Billing & invoices", subtitle: "What the client has been billed and whether it is paid. Invoice files are private to this client.", icon: FileText,
    emptyTitle: "No invoices yet", emptyText: "Add an invoice with its PDF and the client sees it, with its status and due date, on their Billing page.",
    fields: ({ currency }) => [
      { name: "number", label: "Invoice number", type: "text", span: 2, required: true, maxLength: 40, placeholder: "INV-2026-014" },
      { name: "period", label: "Billing period", type: "text", span: 2, maxLength: 60, placeholder: "October 2026" },
      { name: "issueDate", label: "Issue date", type: "date", span: 2, required: true },
      { name: "dueDate", label: "Due date", type: "date", span: 2, required: true },
      { name: "agencyFee", label: `Agency fee (${currency})`, type: "money", span: 2, emptyAs: "zero" },
      { name: "adSpend", label: `Ad spend (${currency})`, type: "money", span: 2, emptyAs: "zero" },
      { name: "total", label: `Total (${currency})`, type: "money", span: 2, hint: "Leave blank to add the fee and the ad spend." },
      { name: "amountPaid", label: `Amount paid (${currency})`, type: "money", span: 2, emptyAs: "zero" },
      { name: "status", label: "Status", type: "select", span: 2, required: true, options: opts(INVOICE_STATUSES, INVOICE_STATUS_LABEL), hint: "An unpaid invoice past its due date shows as overdue on its own." },
      { name: "paidAt", label: "Paid on", type: "date", span: 2, when: (v) => v.status === "PAID" },
      { name: "file", label: "Invoice file", type: "file", span: 4, uploadKind: "invoice" },
      { name: "notes", label: "Notes", type: "textarea", span: 4, rows: 2, maxLength: 500 },
    ],
    columns: (ctx) => {
      const today = istDay(new Date());
      return [
        { header: "Invoice", cell: (r) => stacked(str(r.number), str(r.period)) },
        { header: "Issued", cell: (r) => fmtDay(str(r.issueDate)) },
        { header: "Due", cell: (r) => { const late = effectiveInvoiceStatus({ status: str(r.status), dueDate: str(r.dueDate) }, today) === "OVERDUE"; return <span style={late ? { color: "var(--admin-accent)", fontWeight: 700 } : undefined}>{fmtDay(str(r.dueDate))}</span>; } },
        { header: "Total", num: true, cell: (r) => money(Number(r.total), ctx.currency) },
        { header: "Paid", num: true, cell: (r) => money(Number(r.amountPaid ?? 0), ctx.currency) },
        { header: "Status", cell: (r) => { const s = effectiveInvoiceStatus({ status: str(r.status), dueDate: str(r.dueDate) }, today); return <AdminBadge label={INVOICE_STATUS_LABEL[s as keyof typeof INVOICE_STATUS_LABEL]} tone={INVOICE_TONE[s]} />; } },
      ];
    },
    summary: (rows, ctx) => {
      const today = istDay(new Date());
      const billed = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
      const paid = rows.reduce((s, r) => s + Number(r.amountPaid ?? 0), 0);
      const overdue = rows.filter((r) => effectiveInvoiceStatus({ status: str(r.status), dueDate: str(r.dueDate) }, today) === "OVERDUE").length;
      return [
        { label: "Billed", value: money(billed, ctx.currency) },
        { label: "Paid", value: money(paid, ctx.currency) },
        { label: "Outstanding", value: money(Math.max(0, billed - paid), ctx.currency) },
        { label: "Overdue invoices", value: String(overdue) },
      ];
    },
    defaults: () => ({ status: "PENDING", issueDate: todayKey() }),
  },

  tickets: {
    singular: "ticket", title: "Support & requests", subtitle: "Questions and requests from the client, and what you opened for them. Replies are visible in their portal.", icon: LifeBuoy, hasThread: true,
    emptyTitle: "No tickets", emptyText: "When the client raises a support ticket or request from their portal it shows up here. You can also open one on their behalf.",
    fields: () => [
      { name: "subject", label: "Subject", type: "text", span: 4, required: true, maxLength: 160 },
      { name: "kind", label: "Kind", type: "select", span: 1, required: true, options: opts(TICKET_KINDS, TICKET_KIND_LABEL) },
      { name: "priority", label: "Priority", type: "select", span: 1, required: true, options: opts(TICKET_PRIORITIES, TICKET_PRIORITY_LABEL) },
      { name: "status", label: "Status", type: "select", span: 2, required: true, options: opts(TICKET_STATUSES, TICKET_STATUS_LABEL) },
      { name: "message", label: "First message", type: "textarea", span: 4, rows: 4, maxLength: 4000, hint: "Optional. Sent to the client as the first message on this ticket.", createOnly: true },
    ],
    columns: () => [
      { header: "Ticket", cell: (r) => stacked(str(r.subject), `${TICKET_KIND_LABEL[r.kind as keyof typeof TICKET_KIND_LABEL]} · opened by ${r.createdBy === "client" ? "client" : "SMASH"}`) },
      { header: "Priority", cell: (r) => <AdminBadge label={TICKET_PRIORITY_LABEL[r.priority as keyof typeof TICKET_PRIORITY_LABEL]} tone={r.priority === "HIGH" ? "danger" : r.priority === "MEDIUM" ? "accent" : "neutral"} /> },
      { header: "Status", cell: (r) => <AdminBadge label={TICKET_STATUS_LABEL[r.status as keyof typeof TICKET_STATUS_LABEL]} tone={TICKET_TONE[str(r.status)]} /> },
      { header: "Last message", cell: (r) => stacked(r.lastMessageBy === "client" ? "From the client" : "From SMASH", ago(str(r.lastMessageAt))) },
    ],
    summary: (rows) => [
      { label: "Open", value: String(rows.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length) },
      { label: "Waiting for SMASH", value: String(rows.filter((r) => (r.status === "OPEN" || r.status === "IN_PROGRESS") && r.lastMessageBy === "client").length) },
      { label: "Resolved", value: String(rows.filter((r) => r.status === "RESOLVED" || r.status === "CLOSED").length) },
    ],
    defaults: () => ({ kind: "support", priority: "MEDIUM", status: "OPEN" }),
  },
};
