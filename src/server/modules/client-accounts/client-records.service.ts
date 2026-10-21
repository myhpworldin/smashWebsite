import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { UPLOAD_KINDS, type UploadKind } from "@/server/lib/cloudinary";
import { getEnv } from "@/server/config/env";
import { col, findRows, insertRow, toRow, type Db } from "@/server/db/helpers";
import { clientCreatives, clientInvoices, clientLeads, clientProjects, clientTickets, type ClientThreadMessage, type CollectionName, type RowOf } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { MAX_THREAD_MESSAGES, TICKET_STATUSES, type StoredFile, type TicketStatus } from "@/lib/client-options";
import {
  adminThreadMessageSchema, clientReplySchema, clientTicketSchema, creativeDecisionSchema, creativeInputSchema, invoiceInputSchema, leadInputSchema, projectInputSchema, ticketInputSchema,
} from "./client-records.schema";
import type { ClientAccountRow } from "./client-accounts.service";

export const RECORD_KINDS = ["projects", "creatives", "leads", "invoices", "tickets"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export const isRecordKind = (v: string): v is RecordKind => (RECORD_KINDS as readonly string[]).includes(v);

type Data = Record<string, unknown>;
type Ctx = { accountId: string; adminEmail: string; now: Date };
type KindConfig = {
  collection: CollectionName;
  label: string;
  schema: z.ZodType<Data>;
  sort: Record<string, 1 | -1>;
  /** Turns validated input into the fields to store. `existing` is the stored row on an update, `null` on a create. */
  prepare?: (data: Data, existing: Data | null, ctx: Ctx, db: Db) => Promise<Data> | Data;
};

const fail = (fields: Record<string, string>): never => { throw AppError.validation(fields); };
const iso = (d: Date) => d.toISOString();
const istDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** A stored file must be one this server asked for: our Cloudinary cloud, this client's folder, and the delivery type its purpose needs. */
function checkFile(file: StoredFile | null | undefined, accountId: string, kind: UploadKind): void {
  if (!file) return;
  const cloudName = getEnv().CLOUDINARY_CLOUD_NAME;
  if (!cloudName) fail({ file: "File storage is not configured on this server." });
  const spec = UPLOAD_KINDS[kind];
  if (!file.publicId.startsWith(`clients/${accountId}/${kind}s/`)) fail({ file: "This file was not uploaded for this client." });
  if (!file.url.includes(`/${cloudName}/`)) fail({ file: "This file is not stored in our account." });
  if (file.type !== spec.type) fail({ file: "This file was stored with the wrong privacy setting." });
  if (file.bytes > spec.maxBytes) fail({ file: `The file is too large (${Math.round(spec.maxBytes / 1024 / 1024)} MB at most).` });
}

/** Appends to a thread, keeping only the newest messages so a document can never grow without bound. */
const pushThread = (m: ClientThreadMessage) => ({ thread: { $each: [m], $slice: -MAX_THREAD_MESSAGES } }) as never;

const message = (by: "client" | "admin", name: string, text: string, now: Date): ClientThreadMessage => ({ id: randomUUID(), by, name, message: text, at: iso(now) });

const KINDS: Record<RecordKind, KindConfig> = {
  projects: {
    collection: clientProjects, label: "Project", schema: projectInputSchema as never, sort: { createdAt: -1 },
    prepare(data) {
      if (data.startDate && data.expectedCompletion && String(data.expectedCompletion) < String(data.startDate)) fail({ expectedCompletion: "The completion date cannot be before the start date." });
      return data;
    },
  },
  creatives: {
    collection: clientCreatives, label: "Content item", schema: creativeInputSchema as never, sort: { createdAt: -1 },
    prepare(data, existing, { accountId, now }) {
      checkFile(data.file as StoredFile | null, accountId, "creative");
      const out: Data = { ...data };
      const previous = existing?.status as string | undefined;
      const newFile = !!data.file && (existing?.file as StoredFile | null)?.publicId !== (data.file as StoredFile).publicId;
      out.version = existing ? Number(existing.version ?? 1) + (newFile ? 1 : 0) : 1;
      // A replaced file on something the client sent back (or turned down) goes straight back to them for a decision.
      if (existing && newFile && data.status === previous && (previous === "REVISION" || previous === "REJECTED")) out.status = "PENDING";
      if (out.status === "PENDING") {
        if (!out.file) fail({ file: "Upload the content before sending it for approval." });
        if (previous !== "PENDING") { out.submittedAt = iso(now); out.decidedAt = null; }
      } else if (out.status !== previous && ["APPROVED", "REJECTED", "REVISION"].includes(String(out.status))) out.decidedAt = iso(now);
      return out;
    },
  },
  leads: {
    collection: clientLeads, label: "Lead", schema: leadInputSchema as never, sort: { receivedAt: -1, createdAt: -1 },
    prepare(data) {
      if (data.followUpStatus === "SCHEDULED" && !data.followUpAt) fail({ followUpAt: "Choose the follow-up date." });
      return data;
    },
  },
  invoices: {
    collection: clientInvoices, label: "Invoice", schema: invoiceInputSchema as never, sort: { issueDate: -1, createdAt: -1 },
    async prepare(data, existing, { accountId, now }, db) {
      checkFile(data.file as StoredFile | null, accountId, "invoice");
      const out: Data = { ...data };
      if (String(data.dueDate) < String(data.issueDate)) fail({ dueDate: "The due date cannot be before the issue date." });
      const total = (data.total as number | null) ?? Math.round(((data.agencyFee as number) + (data.adSpend as number)) * 100) / 100;
      if (!(total > 0)) fail({ total: "The invoice total must be more than zero." });
      out.total = total;
      if ((data.amountPaid as number) > total) fail({ amountPaid: "The amount paid cannot be more than the total." });
      if (out.status === "PAID") { out.amountPaid = total; out.paidAt = data.paidAt ?? istDay(now); }
      else { out.paidAt = null; if ((data.amountPaid as number) > 0 && out.status === "PENDING") out.status = "PARTIAL"; }
      const clash = await col(db, clientInvoices).findOne({ accountId, number: data.number, ...(existing ? { _id: { $ne: existing.id } as never } : {}) }, { projection: { _id: 1 } });
      if (clash) fail({ number: "This invoice number is already used for this client." });
      return out;
    },
  },
  tickets: {
    collection: clientTickets, label: "Ticket", schema: ticketInputSchema as never, sort: { lastMessageAt: -1 },
    prepare(data, existing, { adminEmail, now }) {
      const { message: first, ...rest } = data;
      if (existing) return rest; // an update changes the ticket's own fields; the thread only grows through replies
      return { ...rest, createdBy: "admin", thread: first ? [message("admin", adminEmail, String(first), now)] : [], lastMessageBy: "admin", lastMessageAt: iso(now) };
    },
  },
};

const rowOrNull = async (db: Db, kind: RecordKind, accountId: string, id: string): Promise<Data | null> => {
  const doc = await col(db, KINDS[kind].collection).findOne({ _id: id as never, accountId });
  return doc ? (toRow(KINDS[kind].collection, doc) as unknown as Data) : null;
};

/** Every record of one kind for one client, newest first. The `accountId` filter is the only way in. */
export async function listRecords<K extends RecordKind>(db: Db, kind: K, accountId: string): Promise<RowOf<(typeof KINDS)[K]["collection"] & CollectionName>[]> {
  return (await findRows(db, KINDS[kind].collection, { accountId }, { sort: KINDS[kind].sort, limit: 500 })) as never;
}

export async function createRecord(db: Db, kind: RecordKind, accountId: string, body: unknown, adminEmail: string): Promise<Data> {
  const cfg = KINDS[kind];
  const data = cfg.schema.parse(body);
  const fields = (await cfg.prepare?.(data, null, { accountId, adminEmail, now: new Date() }, db)) ?? data;
  return (await insertRow(db, cfg.collection, { ...fields, accountId, updatedBy: adminEmail } as never, cfg.label)) as unknown as Data;
}

/** A full replacement of the editable fields (the editor always sends the whole record); anything the server manages (thread, version, timestamps) is kept. */
export async function updateRecord(db: Db, kind: RecordKind, accountId: string, id: string, body: unknown, adminEmail: string): Promise<Data> {
  const cfg = KINDS[kind];
  const existing = await rowOrNull(db, kind, accountId, id);
  if (!existing) throw AppError.notFound(cfg.label);
  const data = cfg.schema.parse(body);
  const fields = (await cfg.prepare?.(data, existing, { accountId, adminEmail, now: new Date() }, db)) ?? data;
  const doc = await col(db, cfg.collection).findOneAndUpdate({ _id: id as never, accountId }, { $set: { ...fields, updatedBy: adminEmail, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!doc) throw AppError.notFound(cfg.label);
  return toRow(cfg.collection, doc) as unknown as Data;
}

export async function deleteRecord(db: Db, kind: RecordKind, accountId: string, id: string): Promise<void> {
  const result = await col(db, KINDS[kind].collection).deleteOne({ _id: id as never, accountId });
  if (result.deletedCount === 0) throw AppError.notFound(KINDS[kind].label);
}

/** A reply from the SMASH side on a creative or a ticket. On a ticket the admin can also move its status (a first reply opens it up as "In progress"). */
export async function addAdminMessage(db: Db, kind: "creatives" | "tickets", accountId: string, id: string, body: unknown, adminEmail: string): Promise<Data> {
  const input = adminThreadMessageSchema.parse(body);
  const now = new Date();
  const set: Data = { updatedBy: adminEmail, updatedAt: now };
  if (kind === "tickets") {
    const existing = await rowOrNull(db, "tickets", accountId, id);
    if (!existing) throw AppError.notFound("Ticket");
    let status = existing.status as TicketStatus;
    if (input.status) {
      if (!(TICKET_STATUSES as readonly string[]).includes(input.status)) fail({ status: "Choose a status." });
      status = input.status as TicketStatus;
    } else if (status === "OPEN") status = "IN_PROGRESS";
    set.status = status; set.lastMessageBy = "admin"; set.lastMessageAt = iso(now);
  }
  const doc = await col(db, KINDS[kind].collection).findOneAndUpdate(
    { _id: id as never, accountId },
    { $set: set, $push: pushThread(message("admin", adminEmail, input.message, now)) },
    { returnDocument: "after" },
  );
  if (!doc) throw AppError.notFound(KINDS[kind].label);
  return toRow(KINDS[kind].collection, doc) as unknown as Data;
}

/* ---- What a client may do (every call is scoped to the signed-in account) ---- */

/** Approve, reject or ask for changes on something awaiting a decision. Only a PENDING item can be decided, atomically, so a double click or a stale tab cannot decide it twice. */
export async function decideCreative(db: Db, account: Pick<ClientAccountRow, "id" | "contactName">, id: string, body: unknown): Promise<Data> {
  const input = creativeDecisionSchema.parse(body);
  const now = new Date();
  const update: Data = { $set: { status: input.decision, decidedAt: iso(now), updatedAt: now } };
  if (input.message) update.$push = pushThread(message("client", account.contactName, input.message, now));
  const doc = await col(db, clientCreatives).findOneAndUpdate({ _id: id as never, accountId: account.id, status: "PENDING" }, update, { returnDocument: "after" });
  if (!doc) {
    const exists = await col(db, clientCreatives).findOne({ _id: id as never, accountId: account.id }, { projection: { status: 1 } });
    throw exists && exists.status !== "DRAFT" ? AppError.conflict("This item is no longer waiting for a decision.") : AppError.notFound("Content item");
  }
  return toRow(clientCreatives, doc) as unknown as Data;
}

export async function createClientTicket(db: Db, account: Pick<ClientAccountRow, "id" | "contactName">, body: unknown): Promise<Data> {
  const input = clientTicketSchema.parse(body);
  const now = new Date();
  const open = await col(db, clientTickets).countDocuments({ accountId: account.id, status: { $in: ["OPEN", "IN_PROGRESS"] } });
  if (open >= 25) throw AppError.conflict("You have a lot of open tickets already. Please wait for some to be resolved.");
  return (await insertRow(db, clientTickets, {
    accountId: account.id, subject: input.subject, kind: input.kind, priority: input.priority, status: "OPEN", createdBy: "client",
    thread: [message("client", account.contactName, input.message, now)], lastMessageBy: "client", lastMessageAt: iso(now),
  }, "Ticket")) as unknown as Data;
}

/** A client's reply on one of their own tickets. A resolved ticket reopens; a closed one stays closed. */
export async function replyToTicket(db: Db, account: Pick<ClientAccountRow, "id" | "contactName">, id: string, body: unknown): Promise<Data> {
  const input = clientReplySchema.parse(body);
  const now = new Date();
  const doc = await col(db, clientTickets).findOneAndUpdate(
    { _id: id as never, accountId: account.id, status: { $ne: "CLOSED" } },
    { $set: { status: "OPEN", lastMessageBy: "client", lastMessageAt: iso(now), updatedAt: now }, $push: pushThread(message("client", account.contactName, input.message, now)) },
    { returnDocument: "after" },
  );
  if (!doc) {
    const exists = await col(db, clientTickets).findOne({ _id: id as never, accountId: account.id }, { projection: { _id: 1 } });
    throw exists ? AppError.conflict("This ticket is closed. Please open a new one.") : AppError.notFound("Ticket");
  }
  return toRow(clientTickets, doc) as unknown as Data;
}

/** What the portal may show of each kind: no draft content, no internal bookkeeping, and an invoice's private file link is never exposed (it is fetched through a signed download). */
export async function listClientView(db: Db, kind: RecordKind, accountId: string): Promise<Data[]> {
  const rows = (await listRecords(db, kind, accountId)) as unknown as Data[];
  const visible = kind === "creatives" ? rows.filter((r) => r.status !== "DRAFT") : rows;
  return visible.map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- pulled out only to exclude them from the client's copy
    const { updatedBy, accountId: _a, ...rest } = r;
    if (kind === "invoices") {
      const file = r.file as StoredFile | null;
      return { ...rest, file: null, hasFile: !!file, fileName: file?.name ?? null };
    }
    return rest;
  });
}

/** The invoice's file, only if it belongs to this account. */
export async function findInvoiceFile(db: Db, accountId: string, id: string): Promise<StoredFile | null> {
  const doc = await col(db, clientInvoices).findOne({ _id: id as never, accountId }, { projection: { file: 1 } });
  return (doc?.file as StoredFile | undefined) ?? null;
}
