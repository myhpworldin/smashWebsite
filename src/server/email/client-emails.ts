import "server-only";
import type { Db } from "@/server/db/helpers";
import { logger } from "@/server/lib/logger";
import { sendEmail, type EmailResult } from "./send";
import { LOGO_IMAGE, loadCompany } from "./enquiry-emails";
import { clientInviteEmail, passwordResetEmail, verificationCodeEmail } from "./client-templates";
import { VERIFICATION_CODE_MINUTES, type ClientAccountRow } from "@/server/modules/client-accounts/client-accounts.service";

/**
 * Emails the verification code. Never throws (an email problem must not break a login), and reports whether it went out so the
 * portal can tell the client when it did not. The code itself is never logged.
 */
export async function sendVerificationCodeEmail(db: Db, account: Pick<ClientAccountRow, "id" | "email" | "contactName">, code: string): Promise<EmailResult> {
  try {
    const company = await loadCompany(db);
    const mail = verificationCodeEmail(company, { name: account.contactName, code, minutes: VERIFICATION_CODE_MINUTES });
    return await sendEmail({ to: [account.email], ...mail, replyTo: company.email ?? undefined, inlineImages: [LOGO_IMAGE] });
  } catch (err) {
    logger.error("Verification email failed", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false, reason: "network" };
  }
}

/** Emails the "forgot password" code; `minutes` is how long it still works (less than ten on a resend). Never throws, and never logs the code. */
export async function sendPasswordResetEmail(db: Db, account: Pick<ClientAccountRow, "email" | "contactName">, code: string, minutes: number = VERIFICATION_CODE_MINUTES): Promise<EmailResult> {
  try {
    const company = await loadCompany(db);
    const mail = passwordResetEmail(company, { name: account.contactName, code, minutes });
    return await sendEmail({ to: [account.email], ...mail, replyTo: company.email ?? undefined, inlineImages: [LOGO_IMAGE] });
  } catch (err) {
    logger.error("Password reset email failed", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false, reason: "network" };
  }
}

/** Emails the login details to a new client (or after an admin reset). The temporary password is in the message by design; it only works until the client's first password change. */
export async function sendClientInviteEmail(db: Db, account: Pick<ClientAccountRow, "email" | "contactName" | "companyName">, temporaryPassword: string): Promise<EmailResult> {
  try {
    const company = await loadCompany(db);
    const mail = clientInviteEmail(company, { name: account.contactName, companyName: account.companyName, email: account.email, temporaryPassword, loginUrl: `${company.siteUrl}/client/login` });
    return await sendEmail({ to: [account.email], ...mail, replyTo: company.email ?? undefined, inlineImages: [LOGO_IMAGE] });
  } catch (err) {
    logger.error("Client invite email failed", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false, reason: "network" };
  }
}
