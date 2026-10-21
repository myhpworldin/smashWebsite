import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listRecords } from "@/server/modules/client-accounts/client-records.service";
import { RecordManager } from "@/components/admin/workspace/RecordManager";
import { WorkspaceEditor } from "@/components/admin/workspace/WorkspaceEditor";
import clients from "@/components/admin/AdminClients.module.css";
import { asRows, loadWorkspace, recordContext } from "../data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing — SMASH CRM", robots: { index: false, follow: false } };

/** Billing — the service package and fee, then the invoice history with files and payment status. */
export default async function ClientBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const [rows, context, workspace] = await Promise.all([listRecords(getDb(), "invoices", id), recordContext(id), loadWorkspace(id)]);
  return (
    <div className={clients.stack}>
      <WorkspaceEditor accountId={id} section="billingPlan" title="Service package & fees" hint="The plan the client is on: what they pay SMASH and the ad spend budget. Shown at the top of their Billing page." value={workspace?.billingPlan ?? null} updatedAt={workspace?.sectionUpdatedAt?.billingPlan} />
      <div><RecordManager accountId={id} kind="invoices" rows={asRows(rows)} context={context} /></div>
    </div>
  );
}
