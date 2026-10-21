import type { Metadata } from "next";
import { requireClientStage } from "@/server/api/client-session";
import { DashboardView } from "@/components/client/DashboardView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — SMASH Client Portal", robots: { index: false, follow: false } };

/**
 * The client's dashboard: read-only figures an administrator published or entered for this account only (the account id comes from the
 * verified session, never from the URL). The "last updated" time is the headline of the page, repeated on each block, and a "New" tag
 * shows when figures were published since the client's last visit.
 */
export default async function ClientDashboardPage() {
  const client = await requireClientStage("ready");
  return <DashboardView client={client} />;
}
