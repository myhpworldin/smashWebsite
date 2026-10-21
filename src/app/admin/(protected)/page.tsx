import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { logger } from "@/server/lib/logger";
import { loadClientCards, type ClientCard as ClientCardModel } from "@/server/modules/client-accounts/client-portfolio.service";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ClientCard } from "@/components/admin/ClientCard";
import { ClientPicker } from "@/components/admin/ClientPicker";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — SMASH CRM", robots: { index: false, follow: false } };

/**
 * The CRM home is a list of clients, not a rolled-up total: one card per client with only that client's leads, campaigns, spend and open
 * items, and a way straight into the workspace where they are updated. Nothing here adds one client's figures to another's. SMASH's own
 * website enquiries are a different thing and live on `/admin/leads`.
 */
export default async function AdminDashboardPage() {
  const admin = await requireCurrentAdmin();

  let cards: ClientCardModel[] | null = null;
  try {
    cards = await loadClientCards(getDb());
  } catch (error) {
    logger.error("admin dashboard: failed to load clients", { error: error instanceof Error ? error.message : String(error) });
  }

  return (
    <AdminPage
      eyebrow="Dashboard"
      title="Your clients"
      description={`Signed in as ${admin.email}. Pick a client to review their numbers and update their records.`}
      meta={cards ? <span className={styles.heroChip}>{cards.length} client{cards.length === 1 ? "" : "s"}</span> : undefined}
      actions={<AdminButton href="/admin/clients/new" variant="onDark"><Plus size={16} strokeWidth={2} aria-hidden="true" />New client</AdminButton>}
    >
      {!cards ? (
        <AdminErrorState message="Unable to load your clients. Please try again." retryHref="/admin" />
      ) : cards.length === 0 ? (
        <AdminEmptyState icon={Building2} title="No clients yet" message="Create a client account to give them a dashboard and start recording their leads." action={<AdminButton href="/admin/clients/new" size="sm"><Plus size={15} strokeWidth={2} aria-hidden="true" />New client</AdminButton>} />
      ) : (
        <ClientPicker items={cards.map((c, i) => ({ id: c.account.id, text: [c.account.companyName, c.account.contactName, c.account.email].join(" "), card: <ClientCard card={c} index={i} /> }))} />
      )}
    </AdminPage>
  );
}
