import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { DashboardView } from "@/components/client/DashboardView";
import portal from "@/components/client/Portal.module.css";
import { loadAccount } from "../../clients/[id]/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client preview — SMASH CRM", robots: { index: false, follow: false } };

/**
 * `/admin/client-preview/:id` — the client's Dashboard exactly as they see it (the same component the portal renders), for checking what
 * has been entered. Read-only: nothing is recorded as a visit, and no client signs in for it. Lives outside the client workspace so
 * the workspace's own hero does not sit on top of the dashboard's.
 */
export default async function ClientPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const client = await loadAccount(id);
  return (
    <div data-client-theme="" style={{ minHeight: "100%" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "20px 24px 0" }}>
        <div className={portal.previewBanner}>
          <Eye size={18} strokeWidth={2} aria-hidden="true" />
          <span>Previewing {client.companyName}&apos;s dashboard. This is what they see; nothing here can be changed.</span>
          <Link href={`/admin/clients/${id}`} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", fontWeight: 700, textDecoration: "none" }}><ArrowLeft size={15} aria-hidden="true" />Back to workspace</Link>
        </div>
      </div>
      <DashboardView client={client} preview />
    </div>
  );
}
