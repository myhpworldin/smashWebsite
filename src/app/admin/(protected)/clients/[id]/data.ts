import "server-only";
import { cache } from "react";
import { getDb } from "@/server/db/client";
import { orNotFound } from "@/server/seo/page-resolver";
import { getClientAccount, listServiceOptions, toPublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import { findWorkspace } from "@/server/modules/client-accounts/client-workspace.service";
import { findClientDashboard } from "@/server/modules/client-accounts/client-dashboard.service";
import type { RecordContext } from "@/components/admin/workspace/record-configs";

/** The account behind `/admin/clients/[id]/**`, read once per request however many of the layout and pages ask for it. */
export const loadAccount = cache(async (id: string) => toPublicClientAccount(await orNotFound(() => getClientAccount(getDb(), id))));
export const loadWorkspace = cache(async (id: string) => findWorkspace(getDb(), id));
export const loadDashboard = cache(async (id: string) => findClientDashboard(getDb(), id));

/** What the record forms offer as suggestions and how they format money for this client. */
export async function recordContext(id: string): Promise<RecordContext> {
  const [account, workspace, dashboard, catalogue] = await Promise.all([loadAccount(id), loadWorkspace(id), loadDashboard(id), listServiceOptions(getDb())]);
  // The client's own services first, then everything else SMASH offers, so any service can be picked.
  const own = new Set(account.services.map((s) => s.title));
  const serviceGroups = [
    ...(own.size ? [{ label: "This client's services", options: [...own] }] : []),
    ...catalogue.map((g) => ({ label: g.name, options: g.titles.filter((t) => !own.has(t)) })).filter((g) => g.options.length),
  ];
  return {
    currency: workspace?.billingPlan?.currency ?? dashboard?.currency ?? "INR",
    serviceGroups,
    campaignNames: dashboard?.campaigns.map((c) => c.name) ?? [],
  };
}

/** Rows come from the database with `Date` fields; the tables only read plain values, so pass them through as they are. */
export const asRows = <T extends { id: string }>(rows: T[]) => rows as unknown as (Record<string, unknown> & { id: string })[];
