import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listRecords } from "@/server/modules/client-accounts/client-records.service";
import { RecordManager } from "@/components/admin/workspace/RecordManager";
import { WorkspaceEditor } from "@/components/admin/workspace/WorkspaceEditor";
import clients from "@/components/admin/AdminClients.module.css";
import { asRows, loadWorkspace, recordContext } from "../data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support — SMASH CRM", robots: { index: false, follow: false } };

/** Support — tickets and requests first (they are the part that needs answering), then the meeting schedule and the notifications the client sees. */
export default async function ClientSupportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const [rows, context, workspace] = await Promise.all([listRecords(getDb(), "tickets", id), recordContext(id), loadWorkspace(id)]);
  const stamps = workspace?.sectionUpdatedAt ?? {};
  return (
    <div className={clients.stack}>
      <div><RecordManager accountId={id} kind="tickets" rows={asRows(rows)} context={context} /></div>
      <WorkspaceEditor accountId={id} section="meetings" title="Meeting schedule" hint="Upcoming calls and reviews. They appear on the client's Support page and in their deadlines." value={workspace?.meetings ?? []} updatedAt={stamps.meetings} />
      <WorkspaceEditor accountId={id} section="notifications" title="Important notifications" hint="Announcements for the client — a policy change, a campaign pause, a reminder." value={workspace?.notifications ?? []} updatedAt={stamps.notifications} />
    </div>
  );
}
