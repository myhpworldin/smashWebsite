import "server-only";
import { z } from "zod";
import type { SessionController } from "@/server/api/handler";
import type { ClientController } from "@/server/api/client-handler";
import { parseId } from "@/server/api/query";
import { AppError } from "@/server/lib/errors";
import { privateDownloadUrl, signUpload, UPLOAD_KINDS } from "@/server/lib/cloudinary";
import { getClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import { emailContentDecision, emailContentForApproval, emailInvoiceIssued, emailTicketFromClient, emailTicketReply } from "@/server/email/client-activity-emails";
import { findWorkspace } from "@/server/modules/client-accounts/client-workspace.service";
import {
  addAdminMessage, createClientTicket, createRecord, decideCreative, deleteRecord, findInvoiceFile, isRecordKind, listRecords, replyToTicket, updateRecord, type RecordKind,
} from "@/server/modules/client-accounts/client-records.service";
import { acceptTerms, saveWorkspaceSection } from "@/server/modules/client-accounts/client-workspace.service";

/** `kind` in the URL must be one of the known lists; anything else is a plain 404, never a collection name passed through. */
function kindOf(raw: string | undefined): RecordKind {
  if (!raw || !isRecordKind(raw)) throw AppError.notFound("Record type");
  return raw;
}

/** The account in the URL must exist; every list below is then filtered by it. */
async function accountId(ctx: { db: Parameters<typeof getClientAccount>[0]; params: Record<string, string | undefined> }): Promise<string> {
  const id = parseId(ctx.params.id);
  await getClientAccount(ctx.db, id);
  return id;
}

/** `GET /api/admin/client-accounts/:id/records/:kind`. */
export const listRecordsController: SessionController = async (ctx) => ({ data: await listRecords(ctx.db, kindOf(ctx.params.kind), await accountId(ctx)) });

/** Seconds since an ISO moment: how a save tells "just sent for approval" from "was already waiting". */
const secondsSince = (iso: unknown) => (typeof iso === "string" ? (Date.now() - Date.parse(iso)) / 1000 : Infinity);

/**
 * Tells the client about something that just became theirs to act on: content sent for approval, a new invoice, a ticket opened for them.
 * Sent after the save has succeeded and never allowed to fail it.
 */
async function notifyClientOfSave(ctx: Parameters<SessionController>[0], kind: RecordKind, saved: Record<string, unknown>, created: boolean) {
  const account = await getClientAccount(ctx.db, parseId(ctx.params.id));
  if (kind === "creatives" && saved.status === "PENDING" && secondsSince(saved.submittedAt) < 10) await emailContentForApproval(ctx.db, account, { title: String(saved.title), type: String(saved.type), scheduledFor: (saved.scheduledFor as string | null) ?? null });
  if (kind === "invoices" && created) {
    const currency = (await findWorkspace(ctx.db, account.id))?.billingPlan?.currency ?? "INR";
    await emailInvoiceIssued(ctx.db, account, { number: String(saved.number), total: Number(saved.total), dueDate: String(saved.dueDate), currency });
  }
  if (kind === "tickets" && created && Array.isArray(saved.thread) && saved.thread.length) await emailTicketReply(ctx.db, account, { subject: String(saved.subject), message: String((saved.thread[0] as { message: string }).message) });
}

/** `POST /api/admin/client-accounts/:id/records/:kind` — adds one. */
export const createRecordController: SessionController = async (ctx) => {
  const kind = kindOf(ctx.params.kind);
  const data = await createRecord(ctx.db, kind, await accountId(ctx), ctx.body, ctx.admin.email);
  await notifyClientOfSave(ctx, kind, data, true).catch(() => null);
  return { data };
};

/** `PUT /api/admin/client-accounts/:id/records/:kind/:recordId` — replaces the editable fields. */
export const updateRecordController: SessionController = async (ctx) => {
  const kind = kindOf(ctx.params.kind);
  const data = await updateRecord(ctx.db, kind, await accountId(ctx), parseId(ctx.params.recordId), ctx.body, ctx.admin.email);
  await notifyClientOfSave(ctx, kind, data, false).catch(() => null);
  return { data };
};

/** `DELETE /api/admin/client-accounts/:id/records/:kind/:recordId`. */
export const deleteRecordController: SessionController = async (ctx) => {
  await deleteRecord(ctx.db, kindOf(ctx.params.kind), await accountId(ctx), parseId(ctx.params.recordId));
  return { data: { deleted: true } };
};

/** `POST /api/admin/client-accounts/:id/records/:kind/:recordId/messages` — a reply on a content item or a ticket. */
export const adminMessageController: SessionController = async (ctx) => {
  const kind = kindOf(ctx.params.kind);
  if (kind !== "creatives" && kind !== "tickets") throw AppError.notFound("Record type");
  const data = await addAdminMessage(ctx.db, kind, await accountId(ctx), parseId(ctx.params.recordId), ctx.body, ctx.admin.email);
  if (kind === "tickets" && Array.isArray(data.thread) && data.thread.length) {
    const account = await getClientAccount(ctx.db, parseId(ctx.params.id));
    await emailTicketReply(ctx.db, account, { subject: String(data.subject), message: String((data.thread[data.thread.length - 1] as { message: string }).message) });
  }
  return { data };
};

/** `GET /api/admin/client-accounts/:id/workspace`. */
export const getWorkspaceController: SessionController = async (ctx) => ({ data: await findWorkspace(ctx.db, await accountId(ctx)) });

/** `PUT /api/admin/client-accounts/:id/workspace` — `{ section, value }`. */
export const saveWorkspaceController: SessionController = async (ctx) => ({ data: await saveWorkspaceSection(ctx.db, await accountId(ctx), ctx.body, ctx.admin.email) });

const signBodySchema = z.object({ accountId: z.string().trim().min(1).max(64), kind: z.enum(Object.keys(UPLOAD_KINDS) as [keyof typeof UPLOAD_KINDS, ...(keyof typeof UPLOAD_KINDS)[]]) }).strict();

/** `POST /api/admin/uploads/sign` — what the browser needs to upload one file straight to Cloudinary into this client's folder. */
export const signUploadController: SessionController = async ({ db, body }) => {
  const input = signBodySchema.parse(body);
  await getClientAccount(db, parseId(input.accountId));
  return { data: signUpload(input.accountId, input.kind) };
};

/* ---- The client's own side. The account always comes from the session, never from the URL. ---- */

/** `POST /api/client/creatives/:id/respond`. */
export const respondToCreativeController: ClientController = async ({ db, account, params, body }) => {
  const data = await decideCreative(db, account, parseId(params.id), body);
  const thread = Array.isArray(data.thread) ? (data.thread as { by: string; message: string }[]) : [];
  const last = thread.filter((m) => m.by === "client").pop();
  await emailContentDecision(db, account, { title: String(data.title), decision: data.status as "APPROVED" | "REJECTED" | "REVISION", message: last?.message ?? null });
  return { data };
};

/** `POST /api/client/tickets`. */
export const createTicketController: ClientController = async ({ db, account, body }) => {
  const data = await createClientTicket(db, account, body);
  await emailTicketFromClient(db, account, { subject: String(data.subject), message: String((data.thread as { message: string }[])[0].message), isNew: true });
  return { data };
};

/** `POST /api/client/tickets/:id/messages`. */
export const replyToTicketController: ClientController = async ({ db, account, params, body }) => {
  const data = await replyToTicket(db, account, parseId(params.id), body);
  const thread = data.thread as { message: string }[];
  await emailTicketFromClient(db, account, { subject: String(data.subject), message: thread[thread.length - 1].message, isNew: false });
  return { data };
};

/** `POST /api/client/terms/accept`. */
export const acceptTermsController: ClientController = async ({ db, account }) => ({ data: { accepted: !!(await acceptTerms(db, account)).terms?.acceptedAt } });

/** `GET /api/client/files/invoice/:id` — a signed link that works for five minutes, for the invoice's file if (and only if) it is this client's. */
export const invoiceDownloadController: ClientController = async ({ db, account, params }) => {
  const file = await findInvoiceFile(db, account.id, parseId(params.id));
  if (!file) throw AppError.notFound("Invoice file");
  return { data: { url: privateDownloadUrl(file) } };
};
