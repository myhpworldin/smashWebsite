import "server-only";
import { randomUUID } from "node:crypto";
import { col, toRow, type Db } from "@/server/db/helpers";
import { SPEC, clientWorkspaces, type RowOf } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { ALWAYS_ON_SECTIONS, PORTAL_SECTIONS, defaultSections, type ClientService, type PortalSection } from "@/lib/client-options";
import { WORKSPACE_SECTIONS, workspaceSectionBodySchema, type WorkspaceSectionKey } from "./client-records.schema";
import type { ClientAccountRow } from "./client-accounts.service";

export type WorkspaceRow = RowOf<"client_workspaces">;

/** A workspace read back from the database: the list fields are always arrays, even on a document that has only ever had one section saved. */
function normalize(row: WorkspaceRow): WorkspaceRow {
  const { connectedPlatforms, teamMembers, meetings, notifications, sectionUpdatedAt } = SPEC.client_workspaces.defaults() as Pick<WorkspaceRow, "connectedPlatforms" | "teamMembers" | "meetings" | "notifications" | "sectionUpdatedAt">;
  return { ...row, connectedPlatforms: row.connectedPlatforms ?? connectedPlatforms, teamMembers: row.teamMembers ?? teamMembers, meetings: row.meetings ?? meetings, notifications: row.notifications ?? notifications, sectionUpdatedAt: row.sectionUpdatedAt ?? sectionUpdatedAt };
}

/** The workspace for an account, or `null` when nothing has been saved for it yet. */
export async function findWorkspace(db: Db, accountId: string): Promise<WorkspaceRow | null> {
  const doc = await col(db, clientWorkspaces).findOne({ _id: accountId as never });
  return doc ? normalize(toRow(clientWorkspaces, doc) as WorkspaceRow) : null;
}

/** The sections this client sees: what the administrator chose, or what their services call for. The always-on ones are included either way. */
export function effectiveSections(workspace: Pick<WorkspaceRow, "enabledSections"> | null, services: readonly Pick<ClientService, "title" | "categoryName">[]): PortalSection[] {
  const chosen = workspace?.enabledSections ?? defaultSections(services);
  const on = new Set<PortalSection>([...chosen, ...ALWAYS_ON_SECTIONS]);
  return PORTAL_SECTIONS.filter((s) => on.has(s));
}

const withIds = <T extends { id?: string }>(items: T[]) => items.map((item) => ({ ...item, id: item.id || randomUUID() }));

/**
 * Saves one section of a client's workspace (the editor sends `{ section, value }`): validated, stamped with its own "last updated"
 * time, and written without touching the other sections. Terms keep a version number: changing the wording bumps it and clears the
 * client's acceptance, so an old "I accept" never covers new text.
 */
export async function saveWorkspaceSection(db: Db, accountId: string, body: unknown, adminEmail: string): Promise<WorkspaceRow> {
  const { section, value } = workspaceSectionBodySchema.parse(body);
  const parsed = WORKSPACE_SECTIONS[section].parse(value) as unknown;
  const now = new Date();
  const nowIso = now.toISOString();
  let stored: unknown = parsed;

  switch (section as WorkspaceSectionKey) {
    case "teamMembers":
      stored = withIds(parsed as { id?: string }[]);
      break;
    case "meetings":
      stored = withIds(parsed as { id?: string; startsAt: string }[]).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      break;
    case "notifications":
      stored = withIds((parsed as { id?: string; at: string | null }[]).map((n) => ({ ...n, at: n.at ?? nowIso }))).sort((a, b) => b.at.localeCompare(a.at));
      break;
    case "enabledSections": {
      const on = new Set<PortalSection>([...(parsed as PortalSection[]), ...ALWAYS_ON_SECTIONS]);
      stored = PORTAL_SECTIONS.filter((s) => on.has(s));
      break;
    }
    case "terms": {
      const { text } = parsed as { text: string };
      const existing = (await findWorkspace(db, accountId))?.terms ?? null;
      const same = existing?.text === text;
      stored = same
        ? existing
        : { version: (existing?.version ?? 0) + 1, text, updatedAt: nowIso, acceptedAt: null, acceptedBy: null, acceptedVersion: null };
      break;
    }
  }

  const doc = await col(db, clientWorkspaces).findOneAndUpdate(
    { _id: accountId as never },
    { $set: { [section]: stored, [`sectionUpdatedAt.${section}`]: nowIso, updatedBy: adminEmail, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after" },
  );
  return normalize(toRow(clientWorkspaces, doc!) as WorkspaceRow);
}

/** The client accepts the terms currently in force. Nothing to accept (or already accepted) is a quiet no-op for the second case and an error for the first. */
export async function acceptTerms(db: Db, account: Pick<ClientAccountRow, "id" | "contactName" | "email">): Promise<WorkspaceRow> {
  const ws = await findWorkspace(db, account.id);
  if (!ws?.terms) throw AppError.notFound("Terms");
  if (ws.terms.acceptedVersion === ws.terms.version) return ws;
  const now = new Date();
  const doc = await col(db, clientWorkspaces).findOneAndUpdate(
    { _id: account.id as never, "terms.version": ws.terms.version },
    { $set: { "terms.acceptedAt": now.toISOString(), "terms.acceptedBy": `${account.contactName} <${account.email}>`, "terms.acceptedVersion": ws.terms.version, updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!doc) throw AppError.conflict("The terms changed while you were reading them. Please review them again.");
  return normalize(toRow(clientWorkspaces, doc) as WorkspaceRow);
}
