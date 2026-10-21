import "server-only";
import { getEnv } from "@/server/config/env";
import type { Db } from "@/server/db/helpers";
import { logger } from "@/server/lib/logger";
import { fmtDay } from "@/lib/client-format";
import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import type { ClientAccountRow } from "@/server/modules/client-accounts/client-accounts.service";
import { sendEmail } from "./send";
import { LOGO_IMAGE, loadCompany } from "./enquiry-emails";
import { activityEmail, type ActivityEmailInput } from "./client-activity-templates";

type Account = Pick<ClientAccountRow, "id" | "email" | "contactName" | "companyName">;

/** Sends one notification and never throws: a mail problem must not undo or fail the save that caused it. Resolves to whether it went out. */
async function notify(db: Db, to: "client" | "team", account: Account, build: (siteUrl: string, name: string) => Omit<ActivityEmailInput, "audience" | "name">): Promise<boolean> {
  try {
    const company = await loadCompany(db);
    let recipients: string[];
    if (to === "client") recipients = [account.email];
    else {
      const configured = getEnv().ENQUIRY_NOTIFY_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean) ?? [];
      recipients = configured.length ? configured : company.email ? [company.email] : [];
    }
    if (!recipients.length) { logger.warn("Client activity email not sent: no team address (ENQUIRY_NOTIFY_EMAIL or the contact email in Site Settings)"); return false; }
    const name = to === "client" ? account.contactName : "SMASH team";
    const mail = activityEmail(company, { audience: to, name, ...build(company.siteUrl, name) });
    return (await sendEmail({ to: recipients, ...mail, replyTo: to === "client" ? company.email ?? undefined : account.email, inlineImages: [LOGO_IMAGE] })).sent;
  } catch (err) {
    logger.error("Client activity email failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** To the client: something is waiting for their approval. */
export const emailContentForApproval = (db: Db, a: Account, item: { title: string; type: string; scheduledFor: string | null }) =>
  notify(db, "client", a, (site) => ({
    eyebrow: "Needs your approval", title: "New content to review", intro: "your SMASH team has a new piece of content ready for you to approve.",
    rows: [["Content", item.title], ["Type", item.type], ...(item.scheduledFor ? ([["Goes live", fmtDay(item.scheduledFor)]] as [string, string][]) : [])],
    cta: { url: `${site}/client/content`, label: "Review in your portal" }, subject: `Please review: ${item.title}`,
  }));

/** To the client: a new invoice. */
export const emailInvoiceIssued = (db: Db, a: Account, inv: { number: string; total: number; dueDate: string; currency: ClientCurrency }) =>
  notify(db, "client", a, (site) => ({
    eyebrow: "Billing", title: `Invoice ${inv.number}`, intro: "a new invoice has been added to your portal.",
    rows: [["Invoice", inv.number], ["Total", formatMoney(inv.total, inv.currency)], ["Due", fmtDay(inv.dueDate)]],
    cta: { url: `${site}/client/billing`, label: "View invoice" }, subject: `Invoice ${inv.number} — due ${fmtDay(inv.dueDate)}`,
  }));

/** To the client: the SMASH team replied on a ticket. */
export const emailTicketReply = (db: Db, a: Account, t: { subject: string; message: string }) =>
  notify(db, "client", a, (site) => ({
    eyebrow: "Support", title: "We replied to your ticket", intro: `there is a new reply on “${t.subject}”.`, quote: t.message,
    cta: { url: `${site}/client/support`, label: "Open the conversation" }, subject: `Re: ${t.subject}`,
  }));

/** To the SMASH team: a client approved, rejected or asked for changes. */
export const emailContentDecision = (db: Db, a: Account, d: { title: string; decision: "APPROVED" | "REJECTED" | "REVISION"; message: string | null }) => {
  const verb = d.decision === "APPROVED" ? "approved" : d.decision === "REJECTED" ? "rejected" : "asked for changes on";
  return notify(db, "team", a, (site) => ({
    eyebrow: `${a.companyName}`, title: `Content ${d.decision === "REVISION" ? "needs changes" : verb}`, intro: `${a.contactName} (${a.companyName}) ${verb} “${d.title}”.`, quote: d.message,
    cta: { url: `${site}/admin/clients/${a.id}/creative`, label: "Open in the CRM" }, subject: `${a.companyName} ${verb} “${d.title}”`,
  }));
};

/** To the SMASH team: a client opened a ticket or replied on one. */
export const emailTicketFromClient = (db: Db, a: Account, t: { subject: string; message: string; isNew: boolean }) =>
  notify(db, "team", a, (site) => ({
    eyebrow: a.companyName, title: t.isNew ? "New support ticket" : "New reply on a ticket", intro: `${a.contactName} (${a.companyName}) ${t.isNew ? "opened a ticket" : "replied on a ticket"}: “${t.subject}”.`, quote: t.message,
    cta: { url: `${site}/admin/clients/${a.id}/support`, label: "Reply in the CRM" }, subject: `${t.isNew ? "New ticket" : "Reply"} from ${a.companyName}: ${t.subject}`,
  }));
