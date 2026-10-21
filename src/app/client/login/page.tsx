import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/server/api/client-session";
import { CLIENT_STAGE_PATH, clientStage } from "@/server/modules/client-accounts/client-accounts.service";
import { ClientLoginScreen } from "@/components/client/ClientLoginScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client Login — SMASH", robots: { index: false, follow: false } };

/** `/client/login` — already signed in means straight to wherever that client belongs (the dashboard, or the first-login step they are on). */
export default async function ClientLoginPage() {
  const client = await getCurrentClient();
  if (client) redirect(CLIENT_STAGE_PATH[clientStage(client)]);
  return <ClientLoginScreen />;
}
