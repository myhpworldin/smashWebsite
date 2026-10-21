import type { Metadata } from "next";
import { requireClientStage } from "@/server/api/client-session";
import { ClientAuthLayout } from "@/components/client/ClientAuthLayout";
import { VerifyEmailForm } from "@/components/client/VerifyEmailForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify your email — SMASH", robots: { index: false, follow: false } };

/** `ab•••@company.com`: enough for the client to recognise the address, not enough to hand it to someone looking over their shoulder. */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(6, name.length - 2)))}@${domain}`;
}

/** First-login step 1: confirm the email address with the code that was just mailed. Anyone not at this step is sent to theirs. */
export default async function VerifyEmailPage() {
  const client = await requireClientStage("verify");
  return (
    <ClientAuthLayout step={2} title="Verify your email" subtitle="This is the first time you've signed in, so we need to confirm this address belongs to you.">
      <VerifyEmailForm maskedEmail={maskEmail(client.email)} />
    </ClientAuthLayout>
  );
}
