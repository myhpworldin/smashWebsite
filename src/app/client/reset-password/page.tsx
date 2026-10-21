import type { Metadata } from "next";
import { requireClientStage } from "@/server/api/client-session";
import { ClientAuthLayout } from "@/components/client/ClientAuthLayout";
import { ResetPasswordForm } from "@/components/client/ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose your password — SMASH", robots: { index: false, follow: false } };

/** First-login step 2: replace the temporary password. Nothing else in the portal opens until this is done. */
export default async function ResetPasswordPage() {
  await requireClientStage("reset");
  return (
    <ClientAuthLayout step={3} title="Choose your password" subtitle="Replace the temporary password from your invitation with one only you know.">
      <ResetPasswordForm mode="first" />
    </ClientAuthLayout>
  );
}
