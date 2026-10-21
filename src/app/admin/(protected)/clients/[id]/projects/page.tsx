import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listRecords } from "@/server/modules/client-accounts/client-records.service";
import { RecordManager } from "@/components/admin/workspace/RecordManager";
import { asRows, recordContext } from "../data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects — SMASH CRM", robots: { index: false, follow: false } };

export default async function ClientProjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const [rows, context] = await Promise.all([listRecords(getDb(), "projects", id), recordContext(id)]);
  return <RecordManager accountId={id} kind="projects" rows={asRows(rows)} context={context} />;
}
