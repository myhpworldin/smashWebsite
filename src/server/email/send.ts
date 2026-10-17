import "server-only";
import { getEnv } from "@/server/config/env";
import { logger } from "@/server/lib/logger";

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  /** The plain-text twin of `html`: sent alongside it, so clients that block HTML and spam filters both see real text. */
  text: string;
  replyTo?: string;
  /** Images shown inside the body through `<img src="cid:...">`, so they need no remote host and no "load images" prompt. */
  inlineImages?: { cid: string; filename: string; contentBase64: string; contentType: string }[];
  /** Resend ignores a repeat of the same key, so a retried send can never deliver twice. */
  idempotencyKey?: string;
};
export type EmailResult = { sent: true } | { sent: false; reason: "not_configured" | "rejected" | "network" };

const ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/**
 * Sends one email through Resend's REST API (no SDK: one POST). It never throws — an email problem must not undo a
 * saved enquiry — and reports what happened instead. With `RESEND_API_KEY` or `EMAIL_FROM` unset nothing is sent and
 * a warning is logged. Only the outcome is logged, never the recipient, subject or body (they are personal data).
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const { RESEND_API_KEY: key, EMAIL_FROM: from } = getEnv();
  if (!key || !from) {
    logger.warn("Email not sent: RESEND_API_KEY and EMAIL_FROM must both be set");
    return { sent: false, reason: "not_configured" };
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}) },
      body: JSON.stringify({ from, to: message.to, subject: message.subject, html: message.html, text: message.text, ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.inlineImages?.length ? { attachments: message.inlineImages.map((i) => ({ filename: i.filename, content: i.contentBase64, content_type: i.contentType, content_id: i.cid })) } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // Resend's error body names the problem (e.g. "domain is not verified") and holds no submitted data.
      const detail = (await res.json().catch(() => null)) as { name?: string; message?: string } | null;
      logger.error("Email rejected by Resend", { status: res.status, name: detail?.name, message: detail?.message?.slice(0, 200) });
      return { sent: false, reason: "rejected" };
    }
    return { sent: true };
  } catch (err) {
    logger.error("Email could not be sent", { error: err instanceof Error ? err.message : String(err) });
    return { sent: false, reason: "network" };
  }
}
