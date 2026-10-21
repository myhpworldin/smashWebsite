import "server-only";
import { col, countWhere, type Db } from "@/server/db/helpers";
import { clientCreatives, clientInvoices, clientLeads, clientProjects, clientTickets } from "@/server/db/schema";
import { ACTIVE_PROJECT_STATUSES, type ClientCurrency, type PortalSection } from "@/lib/client-options";
import { addDays, effectiveInvoiceStatus, istDay } from "@/lib/client-dates";
import { budgetStatus, type BudgetStatus } from "@/lib/client-budget";
import type { ClientDashboardRow } from "./client-dashboard.service";
import { isDailyUpdateOverdue, loadReporting } from "./client-daily.service";
import { findWorkspace, type WorkspaceRow } from "./client-workspace.service";

export { effectiveInvoiceStatus, istDay } from "@/lib/client-dates";

export const DEADLINE_WINDOW_DAYS = 30;

export type OverviewPending = { kind: "creatives" | "invoices" | "terms" | "tickets"; label: string; count: number; section: PortalSection };
export type OverviewDeadline = { date: string; title: string; kind: "project" | "invoice" | "meeting" | "content"; section: PortalSection; overdue: boolean };
export type Overview = {
  currency: ClientCurrency;
  activeProjects: number;
  activeCampaigns: number;
  totalLeads: number;
  /** Where `totalLeads` came from: the client's lead log when it has any records, otherwise what the campaigns report. */
  leadsSource: "log" | "campaigns";
  leadLogCount: number;
  campaignLeads: number;
  totalAdSpend: number;
  /** The total budget set for the client and what is left of it (see `budgetStatus`); `state` is "none" until a budget is set. */
  budget: BudgetStatus;
  pending: { total: number; items: OverviewPending[] };
  deadlines: OverviewDeadline[];
};

export type OverviewInput = {
  now: Date;
  projects: { name: string; status: string; expectedCompletion: string | null }[];
  dashboard: (Pick<ClientDashboardRow, "currency" | "campaigns" | "amountSpent" | "leads"> & { totalBudget?: number }) | null;
  leadLogCount: number;
  creatives: { title: string; status: string; scheduledFor: string | null }[];
  invoices: { number: string; status: string; dueDate: string; total: number; amountPaid: number }[];
  tickets: { status: string; lastMessageBy: string }[];
  meetings: { title: string; startsAt: string }[];
  termsPending: boolean;
};

/**
 * The numbers on a client's Dashboard Overview, worked out from what the administrator entered (nothing here is typed in by hand).
 * Pure, so the portal and the admin's overview tab show exactly the same figures.
 */
export function deriveOverview(input: OverviewInput): Overview {
  const today = istDay(input.now);
  const horizon = addDays(today, DEADLINE_WINDOW_DAYS);
  const campaigns = input.dashboard?.campaigns ?? [];
  const campaignLeads = campaigns.length ? campaigns.reduce((sum, c) => sum + c.leads, 0) : input.dashboard?.leads ?? 0;
  const leadsFromLog = input.leadLogCount > 0;
  // The dashboard it is given has the daily updates applied, so `amountSpent` already includes activity not tied to a campaign: one figure for spend everywhere.
  const totalAdSpend = input.dashboard?.amountSpent ?? 0;

  const awaitingApproval = input.creatives.filter((c) => c.status === "PENDING");
  const unpaid = input.invoices.filter((i) => i.status !== "PAID" && i.amountPaid < i.total);
  const overdue = unpaid.filter((i) => effectiveInvoiceStatus(i, today) === "OVERDUE");
  const awaitingClient = input.tickets.filter((t) => (t.status === "OPEN" || t.status === "IN_PROGRESS") && t.lastMessageBy === "admin");

  const items: OverviewPending[] = [];
  if (awaitingApproval.length) items.push({ kind: "creatives", label: awaitingApproval.length === 1 ? "Content waiting for your approval" : "Content items waiting for your approval", count: awaitingApproval.length, section: "content" });
  if (unpaid.length) items.push({ kind: "invoices", label: overdue.length ? `Unpaid invoices (${overdue.length} overdue)` : unpaid.length === 1 ? "Invoice to pay" : "Invoices to pay", count: unpaid.length, section: "billing" });
  if (input.termsPending) items.push({ kind: "terms", label: "Terms and conditions to accept", count: 1, section: "account" });
  if (awaitingClient.length) items.push({ kind: "tickets", label: awaitingClient.length === 1 ? "Support reply waiting for you" : "Support replies waiting for you", count: awaitingClient.length, section: "support" });

  const deadlines: OverviewDeadline[] = [];
  const consider = (date: string | null, d: Omit<OverviewDeadline, "date" | "overdue">, allowOverdue: boolean) => {
    if (!date) return;
    if (date < today) { if (allowOverdue) deadlines.push({ ...d, date, overdue: true }); }
    else if (date <= horizon) deadlines.push({ ...d, date, overdue: false });
  };
  for (const p of input.projects) if (p.status !== "COMPLETED") consider(p.expectedCompletion, { title: `${p.name} — expected completion`, kind: "project", section: "projects" }, true);
  for (const i of unpaid) consider(i.dueDate, { title: `Invoice ${i.number} due`, kind: "invoice", section: "billing" }, true);
  for (const m of input.meetings) { const day = istDay(new Date(m.startsAt)); if (new Date(m.startsAt) >= input.now) consider(day, { title: m.title, kind: "meeting", section: "support" }, false); }
  for (const c of awaitingApproval) consider(c.scheduledFor, { title: `${c.title} — approve before it goes live`, kind: "content", section: "content" }, true);
  deadlines.sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.date.localeCompare(b.date));

  return {
    currency: input.dashboard?.currency ?? "INR",
    activeProjects: input.projects.filter((p) => (ACTIVE_PROJECT_STATUSES as readonly string[]).includes(p.status)).length,
    activeCampaigns: campaigns.filter((c) => c.status === "ACTIVE").length,
    totalLeads: leadsFromLog ? input.leadLogCount : campaignLeads,
    leadsSource: leadsFromLog ? "log" : "campaigns",
    leadLogCount: input.leadLogCount,
    campaignLeads,
    totalAdSpend,
    budget: budgetStatus(input.dashboard?.totalBudget ?? 0, totalAdSpend),
    pending: { total: items.reduce((sum, i) => sum + i.count, 0), items },
    deadlines: deadlines.slice(0, 20),
  };
}

const termsPending = (ws: Pick<WorkspaceRow, "terms"> | null) => !!ws?.terms && ws.terms.acceptedVersion !== ws.terms.version;

/** Reads what the overview needs for one client and derives it. */
export async function loadOverview(db: Db, accountId: string, now: Date = new Date()): Promise<Overview> {
  const [projects, dashboard, leadLogCount, creatives, invoices, tickets, ws] = await Promise.all([
    col(db, clientProjects).find({ accountId }, { projection: { name: 1, status: 1, expectedCompletion: 1 } }).toArray(),
    loadReporting(db, accountId).then((r) => r.dashboard),
    countWhere(db, clientLeads, { accountId }),
    col(db, clientCreatives).find({ accountId, status: "PENDING" }, { projection: { title: 1, status: 1, scheduledFor: 1 } }).toArray(),
    col(db, clientInvoices).find({ accountId, status: { $ne: "PAID" } }, { projection: { number: 1, status: 1, dueDate: 1, total: 1, amountPaid: 1 } }).toArray(),
    col(db, clientTickets).find({ accountId, status: { $in: ["OPEN", "IN_PROGRESS"] } }, { projection: { status: 1, lastMessageBy: 1 } }).toArray(),
    findWorkspace(db, accountId),
  ]);
  return deriveOverview({
    now,
    projects: projects.map((p) => ({ name: p.name, status: p.status, expectedCompletion: p.expectedCompletion ?? null })),
    dashboard,
    leadLogCount,
    creatives: creatives.map((c) => ({ title: c.title, status: c.status, scheduledFor: c.scheduledFor ?? null })),
    invoices: invoices.map((i) => ({ number: i.number, status: i.status, dueDate: i.dueDate, total: i.total, amountPaid: i.amountPaid ?? 0 })),
    tickets: tickets.map((t) => ({ status: t.status, lastMessageBy: t.lastMessageBy })),
    meetings: (ws?.meetings ?? []).map((m) => ({ title: m.title, startsAt: m.startsAt })),
    termsPending: termsPending(ws),
  });
}

/** What needs the SMASH team's attention for one client — the dots on the workspace tabs. */
export type Attention = { creatives: number; tickets: number; invoices: number; daily: number };
export async function loadAttention(db: Db, accountId: string, now: Date = new Date()): Promise<Attention> {
  const today = istDay(now);
  const [creatives, tickets, invoices, dailyOverdue] = await Promise.all([
    countWhere(db, clientCreatives, { accountId, status: { $in: ["REVISION", "REJECTED"] } }),
    countWhere(db, clientTickets, { accountId, status: { $in: ["OPEN", "IN_PROGRESS"] }, lastMessageBy: "client" }),
    countWhere(db, clientInvoices, { accountId, status: { $ne: "PAID" }, dueDate: { $lt: today } }),
    isDailyUpdateOverdue(db, accountId, now),
  ]);
  return { creatives, tickets, invoices, daily: dailyOverdue ? 1 : 0 };
}

/** The setup steps an administrator works through when onboarding a client: done when the data exists. */
export type ChecklistItem = { key: string; label: string; done: boolean; tab: string };
export function onboardingChecklist(ws: WorkspaceRow | null, counts: { projects: number; campaigns: number; services: number; budget: boolean }): ChecklistItem[] {
  return [
    { key: "profile", label: "Company profile (website, business type)", done: !!(ws?.profile?.website || ws?.profile?.businessType), tab: "profile" },
    { key: "manager", label: "Account manager assigned", done: !!ws?.accountManager, tab: "profile" },
    { key: "plan", label: "Service package and billing plan", done: !!ws?.billingPlan, tab: "billing" },
    { key: "terms", label: "Terms and conditions set", done: !!ws?.terms, tab: "profile" },
    { key: "platforms", label: "Connected platforms listed", done: (ws?.connectedPlatforms.length ?? 0) > 0, tab: "profile" },
    { key: "project", label: "First project added", done: counts.projects > 0, tab: "projects" },
    { key: "budget", label: "Total ad budget set", done: counts.budget, tab: "campaigns?view=setup" },
    { key: "campaign", label: "Campaign figures published", done: counts.campaigns > 0, tab: "campaigns" },
  ];
}
