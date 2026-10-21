import "server-only";
import type { SessionController } from "@/server/api/handler";
import { parseId } from "@/server/api/query";
import { sendClientInviteEmail } from "@/server/email/client-emails";
import {
  adminResetPasswordSchema,
  createClientAccountSchema,
  updateClientAccountSchema,
} from "@/server/modules/client-accounts/client-accounts.schema";
import {
  adminSetTemporaryPassword,
  createClientAccount,
  getClientAccount,
  listClientAccounts,
  toPublicClientAccount,
  updateClientAccount,
} from "@/server/modules/client-accounts/client-accounts.service";
import { saveDailyReport } from "@/server/modules/client-accounts/client-daily.service";
import { findClientDashboard, saveClientDashboard } from "@/server/modules/client-accounts/client-dashboard.service";

/** `GET /api/admin/client-accounts`. */
export const listClientAccountsController: SessionController = async ({ db }) => ({ data: await listClientAccounts(db) });

/**
 * `POST /api/admin/client-accounts` — creates a client's login with the temporary password the admin chose, and (unless switched
 * off) emails the login details. The account exists either way: `invite.sent: false` only means the email did not go out, and the
 * admin can pass the details on themselves.
 */
export const createClientAccountController: SessionController = async ({ db, body, admin }) => {
  const input = createClientAccountSchema.parse(body);
  const account = await createClientAccount(db, input, admin.email);
  const invite = input.sendInvite ? await sendClientInviteEmail(db, account, input.temporaryPassword) : null;
  return { data: { account, invite: { requested: input.sendInvite, sent: invite?.sent ?? false } } };
};

/** `GET /api/admin/client-accounts/:id`. */
export const getClientAccountController: SessionController = async ({ db, params }) => ({ data: toPublicClientAccount(await getClientAccount(db, parseId(params.id))) });

/** `PATCH /api/admin/client-accounts/:id` — company, contact name, enable/disable. */
export const updateClientAccountController: SessionController = async ({ db, params, body }) => ({ data: await updateClientAccount(db, parseId(params.id), updateClientAccountSchema.parse(body)) });

/** `POST /api/admin/client-accounts/:id/reset-password` — a new temporary password; the client verifies nothing again but must choose a password on next login, and any open session ends. */
export const resetClientPasswordController: SessionController = async ({ db, params, body }) => {
  const input = adminResetPasswordSchema.parse(body);
  const account = await adminSetTemporaryPassword(db, parseId(params.id), input.temporaryPassword);
  const invite = input.sendInvite ? await sendClientInviteEmail(db, account, input.temporaryPassword) : null;
  return { data: { account, invite: { requested: input.sendInvite, sent: invite?.sent ?? false } } };
};

/** `GET /api/admin/client-accounts/:id/dashboard`. */
export const getClientDashboardController: SessionController = async ({ db, params }) => {
  const id = parseId(params.id);
  await getClientAccount(db, id);
  return { data: await findClientDashboard(db, id) };
};

/** `PUT /api/admin/client-accounts/:id/dashboard` — publishes the figures; the client's "last updated" moves to now. */
export const saveClientDashboardController: SessionController = async ({ db, params, body, admin }) => {
  const id = parseId(params.id);
  await getClientAccount(db, id);
  return { data: await saveClientDashboard(db, id, body as never, admin.email) };
};

/** `PUT /api/admin/client-accounts/:id/daily` — records (or corrects) one day's numbers, per campaign; the client's totals and charts follow, and "last updated" moves to now. */
export const saveDailyReportController: SessionController = async ({ db, params, body, admin }) => {
  const id = parseId(params.id);
  await getClientAccount(db, id);
  return { data: await saveDailyReport(db, id, body as never, admin.email) };
};
