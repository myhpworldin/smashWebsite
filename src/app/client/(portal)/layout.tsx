import type { ReactNode } from "react";
import { getDb } from "@/server/db/client";
import { requireClientStage } from "@/server/api/client-session";
import { effectiveSections, findWorkspace } from "@/server/modules/client-accounts/client-workspace.service";
import { ClientShell } from "@/components/client/ClientShell";

export const dynamic = "force-dynamic";

/**
 * Everything in the portal sits behind the first-login steps: a client whose email is unverified or whose password is still the
 * temporary one is sent back to that step, whichever portal page they asked for. Each page also checks for itself (a layout does
 * not gate the segments below it); the request-level cache makes that free. The sidebar lists only the pages their administrator
 * has switched on for them.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const client = await requireClientStage("ready");
  const sections = effectiveSections(await findWorkspace(getDb(), client.id), client.services);
  return <ClientShell client={client} sections={sections}>{children}</ClientShell>;
}
