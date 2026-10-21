import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { logger } from "@/server/lib/logger";
import { listClientAccounts, type PublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { accountStatus } from "@/components/admin/client-status";
import styles from "@/components/admin/AdminClients.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clients — SMASH CRM", robots: { index: false, follow: false } };

const when = (value: Date | null) => (value ? value.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

/** `/admin/clients` — every client portal login, how far each has got through first sign-in, and when they last visited. */
export default async function AdminClientsPage() {
  await requireCurrentAdmin();
  let accounts: PublicClientAccount[] | null = null;
  try {
    accounts = await listClientAccounts(getDb());
  } catch (error) {
    logger.error("admin clients: failed to load accounts", { error: error instanceof Error ? error.message : String(error) });
  }

  const active = accounts?.filter((a) => a.isActive).length ?? 0;

  return (
    <AdminPage
      eyebrow="Client portal"
      title="Clients"
      description="Client portal logins. Create an account, publish their figures, and they can view them (read-only) after verifying their email and choosing a password."
      meta={accounts ? <span className={styles.heroChip}>{accounts.length} account{accounts.length === 1 ? "" : "s"} · {active} active</span> : undefined}
      actions={<AdminButton href="/admin/clients/new" variant="onDark"><Plus size={16} strokeWidth={2} aria-hidden="true" />New client</AdminButton>}
    >
      {!accounts ? (
        <AdminErrorState message="Unable to load client accounts. Please try again." retryHref="/admin/clients" />
      ) : accounts.length === 0 ? (
        <AdminEmptyState icon={Building2} title="No client accounts yet" message="Create one to give a client access to their dashboard." action={<AdminButton href="/admin/clients/new" size="sm"><Plus size={15} strokeWidth={2} aria-hidden="true" />New client</AdminButton>} />
      ) : (
        <AdminCard flush reveal>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Client</th><th>Login email</th><th>Mobile</th><th>Services</th><th>Status</th><th>Last sign-in</th><th>Created</th></tr></thead>
              <tbody>
                {accounts.map((a, i) => {
                  const status = accountStatus(a);
                  return (
                    <tr key={a.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                      <td><Link href={`/admin/clients/${a.id}`} className={styles.rowLink}><strong>{a.companyName}</strong><span className={styles.muted}>{a.contactName}</span></Link></td>
                      <td>{a.email}</td>
                      <td className={styles.muted}>{a.phone ?? "—"}</td>
                      <td className={styles.muted}>{a.services.length ? `${a.services.length} chosen` : "—"}</td>
                      <td><AdminBadge label={status.label} tone={status.tone} live={status.label === "Active"} /></td>
                      <td className={styles.muted}>{when(a.lastLoginAt)}</td>
                      <td className={styles.muted}>{when(a.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}
    </AdminPage>
  );
}
