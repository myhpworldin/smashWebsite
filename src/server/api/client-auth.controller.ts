import "server-only";
import { after } from "next/server";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import type { WriteController } from "@/server/api/handler";
import type { ClientController } from "@/server/api/client-handler";
import { clearClientSessionCookie, setClientSessionCookie } from "@/server/api/client-session";
import { sendPasswordResetEmail, sendVerificationCodeEmail } from "@/server/email/client-emails";
import type { Db } from "@/server/db/helpers";
import { changePasswordSchema, checkResetCodeSchema, clientLoginSchema, forgotPasswordSchema, resetWithCodeSchema, verifyEmailSchema } from "@/server/modules/client-accounts/client-accounts.schema";
import { findClientDashboardMeta } from "@/server/modules/client-accounts/client-dashboard.service";
import {
  CLIENT_STAGE_PATH,
  VERIFICATION_RESEND_SECONDS,
  changeClientPassword,
  checkResetCode,
  clientStage,
  confirmVerificationCode,
  issueResetCode,
  issueVerificationCode,
  markClientViewed,
  recordClientLogin,
  resetPasswordWithCode,
  verifyClientCredentials,
  type ClientAccountRow,
} from "@/server/modules/client-accounts/client-accounts.service";

/**
 * Mails a fresh verification code and says whether it went out. A resend inside the cooldown is not an error here (the earlier
 * code is still good), so login simply reports that one was already sent. With email unconfigured in development the code is
 * printed to the server log instead, so the flow can be tried without a mail account; that never happens in staging or production.
 */
async function deliverCode(db: Db, account: ClientAccountRow): Promise<{ sent: boolean; throttled: boolean }> {
  let code: string;
  try {
    code = await issueVerificationCode(db, account);
  } catch (err) {
    if (err instanceof AppError && err.code === "RATE_LIMITED") return { sent: true, throttled: true };
    throw err;
  }
  const result = await sendVerificationCodeEmail(db, account, code);
  if (!result.sent && getEnv().APP_ENV === "development") logger.warn(`DEV ONLY: email is not set up, so the verification code for ${account.email} is ${code}`);
  return { sent: result.sent, throttled: false };
}

/**
 * `POST /api/client/auth/login`. Generic on every failure (unknown email, wrong password, disabled account), like the admin login.
 * On success the session cookie is set and the response says where the client goes next: first-time clients are sent to verify
 * their email (and get the code emailed right away), then to replace their password, and only then to the dashboard.
 */
export const clientLoginController: WriteController = async ({ db, body }) => {
  const { email, password } = clientLoginSchema.parse(body);
  const account = await verifyClientCredentials(db, email, password);
  if (!account) {
    logger.warn("Client login failed");
    throw new AppError("UNAUTHORIZED", 401, "Invalid email or password.");
  }
  await setClientSessionCookie(account);
  await recordClientLogin(db, account.id);
  const stage = clientStage(account);
  const delivery = stage === "verify" ? await deliverCode(db, account) : null;
  return { data: { next: CLIENT_STAGE_PATH[stage], codeSent: delivery?.sent ?? null } };
};

export const clientLogoutController: ClientController = async () => {
  await clearClientSessionCookie();
  return { data: { loggedOut: true } };
};

/** `POST /api/client/auth/verify-email` — the 6-digit code from the email. Wrong codes are counted and the code dies after five. */
export const verifyEmailController: ClientController = async ({ db, body, account }) => {
  const { code } = verifyEmailSchema.parse(body);
  await confirmVerificationCode(db, account, code);
  return { data: { next: account.mustResetPassword ? CLIENT_STAGE_PATH.reset : CLIENT_STAGE_PATH.ready } };
};

/** `POST /api/client/auth/resend-code` — a new code, at most one a minute. */
export const resendCodeController: ClientController = async ({ db, account }) => {
  const code = await issueVerificationCode(db, account);
  const result = await sendVerificationCodeEmail(db, account, code);
  if (!result.sent && getEnv().APP_ENV === "development") logger.warn(`DEV ONLY: email is not set up, so the verification code for ${account.email} is ${code}`);
  return { data: { sent: result.sent, cooldownSeconds: VERIFICATION_RESEND_SECONDS } };
};

/** `POST /api/client/auth/reset-password` — replaces the temporary password (first login) or any later password. The cookie is re-issued because the change ends every older session. */
export const resetPasswordController: ClientController = async ({ db, body, account }) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(body);
  const updated = await changeClientPassword(db, account, currentPassword, newPassword);
  await setClientSessionCookie(updated);
  return { data: { next: CLIENT_STAGE_PATH.ready } };
};

/** `POST /api/client/seen` — the client has looked at the dashboard, so the "new update" highlight can clear on their next visit. */
export const markSeenController: ClientController = async ({ db, account }) => {
  await markClientViewed(db, account.id);
  return { data: { seen: true } };
};

/** `GET /api/client/updates` — when the figures were last published, so an open dashboard can offer a refresh the moment an admin saves. */
export const updatesController: ClientController = async ({ db, account }) => ({ data: { dataUpdatedAt: await findClientDashboardMeta(db, account.id) } });

/**
 * `POST /api/client/auth/forgot-password` — checks the email is a registered, active client account and emails a reset code. An
 * unregistered or disabled address is answered with a field error on `email` (no email is sent), so the form can say so before
 * asking for a code. The mail goes out after the response. A code sent under a minute ago is still valid: the reply says how long
 * until another can be sent (`waitSeconds`) instead of sending one. Asking again after that re-sends the same code while it is still
 * valid (`resent: true`); a new one is made only when it has expired or its tries are used up.
 */
export const forgotPasswordController: WriteController = async ({ db, body }) => {
  const { email } = forgotPasswordSchema.parse(body);
  const issued = await issueResetCode(db, email);
  if (issued.status === "unknown") throw AppError.validation({ email: "We couldn't find a client account with this email." });
  if (issued.status === "disabled") throw AppError.validation({ email: "This account has been disabled. Please contact your SMASH account manager." });
  if (issued.status === "wait") return { data: { requested: true, resent: false, waitSeconds: issued.seconds } };
  const send = async () => {
    const result = await sendPasswordResetEmail(db, issued.account, issued.code, issued.minutesLeft);
    if (!result.sent && getEnv().APP_ENV === "development") logger.warn(`DEV ONLY: email is not set up, so the password reset code for ${issued.account.email} is ${issued.code}`);
  };
  try {
    after(send);
  } catch {
    await send();
  }
  return { data: { requested: true, resent: issued.reused, waitSeconds: VERIFICATION_RESEND_SECONDS } };
};

/** `POST /api/client/auth/forgot-password/verify` — is this the right code? Called the moment the sixth digit is typed; it does not use the code up, and the form shows the new-password fields only after it passes. */
export const verifyResetCodeController: WriteController = async ({ db, body }) => {
  const { email, code } = checkResetCodeSchema.parse(body);
  await checkResetCode(db, email, code);
  return { data: { valid: true } };
};

/** `POST /api/client/auth/forgot-password/confirm` — the emailed code plus a new password. It does not sign the client in: they go back to the sign-in form and use the new password. */
export const resetWithCodeController: WriteController = async ({ db, body }) => {
  const { email, code, newPassword } = resetWithCodeSchema.parse(body);
  await resetPasswordWithCode(db, email, code, newPassword);
  return { data: { changed: true } };
};
