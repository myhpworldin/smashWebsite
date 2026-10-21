import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listServiceOptions } from "@/server/modules/client-accounts/client-accounts.service";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { ClientAccountForm } from "@/components/admin/ClientAccountForm";
import styles from "@/components/admin/AdminClients.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New client — SMASH CRM", robots: { index: false, follow: false } };

/** `/admin/clients/new` — create a client's portal login. */
export default async function NewClientPage() {
  await requireCurrentAdmin();
  const serviceGroups = await listServiceOptions(getDb());
  return (
    <AdminPage
      eyebrow="Client portal"
      title="New client"
      description="Create their portal login. On first sign-in they verify the email with a code, then replace the temporary password."
      actions={<AdminButton href="/admin/clients" variant="onDark"><ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />Back to clients</AdminButton>}
    >
      <div className={styles.narrow}>
        <AdminCard reveal><ClientAccountForm serviceGroups={serviceGroups} /></AdminCard>
      </div>
    </AdminPage>
  );
}
