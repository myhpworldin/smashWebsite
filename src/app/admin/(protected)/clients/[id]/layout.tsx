import type { ReactNode } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { loadAttention } from "@/server/modules/client-accounts/client-overview.service";
import { effectiveSections } from "@/server/modules/client-accounts/client-workspace.service";
import { PORTAL_SECTIONS } from "@/lib/client-options";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { ClientTabs } from "@/components/admin/workspace/ClientTabs";
import { accountStatus } from "@/components/admin/client-status";
import { loadAccount, loadWorkspace } from "./data";

export const dynamic = "force-dynamic";

/**
 * The frame of one client's workspace: the hero (company, contact, login status) and the tab bar. Every tab below renders its own
 * section; this loads only what the frame itself shows (the account, the tab badges, which portal pages are switched off).
 */
export default async function ClientWorkspaceLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const [account, workspace, attention] = await Promise.all([loadAccount(id), loadWorkspace(id), loadAttention(getDb(), id)]);
  const status = accountStatus(account);
  const on = effectiveSections(workspace, account.services);
  return (
    <AdminPage
      eyebrow="Client"
      title={account.companyName}
      description={[account.contactName, account.email, account.phone].filter(Boolean).join(" · ")}
      meta={<AdminBadge label={status.label} tone={status.tone} live={status.label === "Active"} />}
      actions={<><AdminButton href={`/admin/client-preview/${id}`} variant="onDark"><Eye size={16} strokeWidth={2} aria-hidden="true" />Preview as client</AdminButton><AdminButton href="/admin/clients" variant="onDark"><ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />Back to clients</AdminButton></>}
    >
      <ClientTabs id={id} attention={attention} off={PORTAL_SECTIONS.filter((s) => !on.includes(s))} />
      {children}
    </AdminPage>
  );
}
