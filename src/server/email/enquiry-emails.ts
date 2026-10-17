import "server-only";
import type { Db } from "@/server/db/helpers";
import { getEnv } from "@/server/config/env";
import { getSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { logger } from "@/server/lib/logger";
import { sendEmail } from "./send";
import { CHECK_CID, CHECK_PNG_BASE64, LOGO_CID, LOGO_PNG_BASE64 } from "./logo";
import { confirmationEmail, teamNotificationEmail, type CompanyInfo, type EnquiryDetails } from "./templates";

/** Images the emails refer to as `cid:...` (templates.ts): every email has the logo, the visitor's also has the welcome check. */
const LOGO_IMAGE = { cid: LOGO_CID, filename: "smash-logo.png", contentBase64: LOGO_PNG_BASE64, contentType: "image/png" };
const CHECK_IMAGE = { cid: CHECK_CID, filename: "smash-check.png", contentBase64: CHECK_PNG_BASE64, contentType: "image/png" };

/** The legal name, used only until Site Settings has one (the same fallback the Legal pages use). */
const FALLBACK_COMPANY = "SMASH Digital Media Private Limited";

/** The company block of every email, read from Site Settings so an editor's change shows in the next email. */
async function loadCompany(db: Db): Promise<CompanyInfo> {
  const settings = await getSiteSettings(db).catch(() => null);
  const origin = new URL(getEnv().NEXT_PUBLIC_SITE_URL).origin;
  return {
    name: settings?.siteName?.trim() || FALLBACK_COMPANY,
    siteUrl: origin,
    email: settings?.contact?.email ?? null,
    phone: settings?.contact?.phone ?? null,
    whatsapp: settings?.contact?.whatsapp ?? null,
    address: settings?.contact?.address ?? null,
    socials: (settings?.socialLinks ?? []).filter((s) => /^https?:\/\//i.test(s.url)).map((s) => ({ label: s.platform.charAt(0).toUpperCase() + s.platform.slice(1), url: s.url })),
  };
}

/**
 * Emails for one new enquiry: the team is told, and the visitor (when they gave an email address) gets a confirmation
 * that says what happens next and carries the company's details. The two sends are independent — one failing never
 * stops the other — and neither can throw, so a saved lead is never affected. Run it after the response is sent.
 */
export async function sendEnquiryEmails(db: Db, lead: { id: string; details: EnquiryDetails; submittedAt: Date }): Promise<void> {
  try {
    const company = await loadCompany(db);
    const notify = (getEnv().ENQUIRY_NOTIFY_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean) ?? []);
    const team = notify.length ? notify : company.email ? [company.email] : [];

    const jobs: Promise<unknown>[] = [];
    if (team.length) {
      const mail = teamNotificationEmail(company, lead.details, { leadUrl: `${company.siteUrl}/admin/leads/${lead.id}`, submittedAt: lead.submittedAt });
      jobs.push(sendEmail({ to: team, ...mail, replyTo: lead.details.email, inlineImages: [LOGO_IMAGE], idempotencyKey: `lead-${lead.id}-team` }));
    } else {
      logger.warn("Enquiry notification not sent: set ENQUIRY_NOTIFY_EMAIL or the contact email in Site Settings");
    }
    if (lead.details.email) {
      const mail = confirmationEmail(company, lead.details);
      jobs.push(sendEmail({ to: [lead.details.email], ...mail, replyTo: company.email ?? team[0], inlineImages: [LOGO_IMAGE, CHECK_IMAGE], idempotencyKey: `lead-${lead.id}-visitor` }));
    }
    await Promise.allSettled(jobs);
  } catch (err) {
    logger.error("Enquiry emails failed", { error: err instanceof Error ? err.message : String(err) });
  }
}
