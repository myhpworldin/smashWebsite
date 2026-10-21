import "server-only";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db/client";
import { requireClientStage } from "@/server/api/client-session";
import { effectiveSections, findWorkspace } from "@/server/modules/client-accounts/client-workspace.service";
import type { PortalSection } from "@/lib/client-options";

/**
 * The gate every portal page passes: a signed-in client at the `ready` stage whose portal has this page switched on. A page an
 * administrator has hidden answers 404 exactly like one that does not exist, so its URL gives nothing away. Everything the page then
 * reads is scoped by `client.id` from the session, never from the URL.
 */
export async function requirePortalSection(section: PortalSection) {
  const client = await requireClientStage("ready");
  const db = getDb();
  const workspace = await findWorkspace(db, client.id);
  const sections = effectiveSections(workspace, client.services);
  if (!sections.includes(section)) notFound();
  return { client, db, workspace, sections };
}
