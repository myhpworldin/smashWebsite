import "server-only";
import { col, type Db } from "@/server/db/helpers";
import { logger } from "@/server/lib/logger";
import { clientLeads } from "@/server/db/schema";
import { CLIENT_LEAD_STATUSES, type ClientLeadStatus } from "@/lib/client-options";
import { listClientAccounts, type PublicClientAccount } from "./client-accounts.service";
import { loadAttention, loadOverview, type Attention, type Overview } from "./client-overview.service";

export const RECENT_LEADS_PER_CLIENT = 3;

export type LeadsByStatus = Record<ClientLeadStatus, number>;
export type CardLead = { id: string; name: string; status: ClientLeadStatus; source: string; receivedAt: string };
export type ClientCardData = { overview: Overview; attention: Attention; leadsByStatus: LeadsByStatus; leadLogCount: number; recentLeads: CardLead[] };
/** One client on the dashboard. `data` is null when this client's figures could not be loaded, so one broken client never takes the page down. */
export type ClientCard = { account: PublicClientAccount; data: ClientCardData | null };

/** Fills in the statuses a client has no leads in, so every client reads the same five numbers. */
export function rollLeadStatuses(rows: { status: string; count: number }[]): LeadsByStatus {
  const out = Object.fromEntries(CLIENT_LEAD_STATUSES.map((s) => [s, 0])) as LeadsByStatus;
  for (const { status, count } of rows) if (status in out) out[status as ClientLeadStatus] += count;
  return out;
}

export const attentionTotal = (a: Attention) => a.creatives + a.tickets + a.invoices + a.daily;

/** Clients with something waiting on the SMASH team first (most items first; a missing, low or used-up budget counts as one), disabled accounts last, then A–Z. */
export function sortCards(cards: ClientCard[]): ClientCard[] {
  const need = (c: ClientCard) => (c.data ? attentionTotal(c.data.attention) + (c.data.overview?.budget.state === "ok" || !c.data.overview ? 0 : 1) : 0);
  return [...cards].sort((a, b) => Number(!a.account.isActive) - Number(!b.account.isActive) || need(b) - need(a) || a.account.companyName.localeCompare(b.account.companyName));
}

/**
 * Per-client lead figures for every account, in two passes over `client_leads` (one grouped count, one top-N per client). Always grouped
 * by `accountId`: nothing here adds one client's leads to another's.
 */
async function loadLeadFigures(db: Db) {
  const [counts, recent] = await Promise.all([
    col(db, clientLeads).aggregate<{ _id: { accountId: string; status: string }; count: number }>([{ $group: { _id: { accountId: "$accountId", status: "$status" }, count: { $sum: 1 } } }]).toArray(),
    col(db, clientLeads)
      .aggregate<{ _id: string; leads: { id: string; name: string; status: ClientLeadStatus; source: string; receivedAt: string }[] }>([
        { $sort: { receivedAt: -1, createdAt: -1 } },
        { $group: { _id: "$accountId", leads: { $push: { id: "$_id", name: "$name", status: "$status", source: "$source", receivedAt: "$receivedAt" } } } },
        { $project: { leads: { $slice: ["$leads", RECENT_LEADS_PER_CLIENT] } } },
      ])
      .toArray(),
  ]);
  const byAccount = new Map<string, { status: string; count: number }[]>();
  for (const { _id, count } of counts) byAccount.set(_id.accountId, [...(byAccount.get(_id.accountId) ?? []), { status: _id.status, count }]);
  return { byAccount, recent: new Map(recent.map((r) => [r._id, r.leads])) };
}

/** One card per client account for the admin dashboard. Each client's overview and attention use the same functions as the client's portal and the admin's per-client Overview, so the figures always agree. */
export async function loadClientCards(db: Db, now: Date = new Date()): Promise<ClientCard[]> {
  const [accounts, figures] = await Promise.all([listClientAccounts(db), loadLeadFigures(db)]);
  const cards = await Promise.all(
    accounts.map(async (account): Promise<ClientCard> => {
      try {
        const [overview, attention] = await Promise.all([loadOverview(db, account.id, now), loadAttention(db, account.id, now)]);
        const rows = figures.byAccount.get(account.id) ?? [];
        return { account, data: { overview, attention, leadsByStatus: rollLeadStatuses(rows), leadLogCount: rows.reduce((n, r) => n + r.count, 0), recentLeads: figures.recent.get(account.id) ?? [] } };
      } catch (error) {
        logger.error("admin dashboard: failed to load a client card", { accountId: account.id, error: error instanceof Error ? error.message : String(error) });
        return { account, data: null };
      }
    }),
  );
  return sortCards(cards);
}
