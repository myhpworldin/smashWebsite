/**
 * The notification emails around a client's workspace — to the client (content to approve, an invoice, a support reply) and to the SMASH
 * team (a client's decision, a new ticket). One layout for all of them, in the same style as the other client emails. Pure functions;
 * everything that varies goes through `esc`, and a subject is one bounded line.
 */
import { BLUE, FONT, INK, MUTED, RED, band, button, companyText, esc, firstName, layout, oneLine, type CompanyInfo, type RenderedEmail } from "./templates";

export type ActivityEmailInput = {
  /** Who is reading: the greeting and footer differ. */
  audience: "client" | "team";
  name: string;
  eyebrow: string;
  title: string;
  intro: string;
  rows?: [string, string][];
  /** A quoted message (a client's feedback, a ticket reply). */
  quote?: string | null;
  cta: { url: string; label: string };
  subject: string;
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function activityEmail(company: CompanyInfo, o: ActivityEmailInput): RenderedEmail {
  const rows = (o.rows ?? []).map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #E6E9F0;"><div style="font:700 11.5px ${FONT};letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">${esc(label)}</div><div style="margin-top:4px;font:400 17px ${FONT};color:${INK};">${esc(value)}</div></td></tr>`).join("");
  const quote = o.quote ? `<blockquote style="margin:0 0 26px;padding:14px 18px;border-left:4px solid ${RED};background:#F6F8FD;font:400 16px/1.7 ${FONT};color:${INK};white-space:pre-line;">${esc(clip(o.quote, 1200))}</blockquote>` : "";
  const hero = band(
    "#ffffff",
    `<p style="margin:0 0 12px;font:700 12.5px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${RED};">${esc(o.eyebrow)}</p>
<h1 class="h1" style="margin:0;font:700 34px/1.15 ${FONT};color:${BLUE};">${esc(o.title)}</h1>
<p class="sub" style="margin:16px 0 0;max-width:500px;font:400 18px/1.65 ${FONT};color:${MUTED};">Hi ${esc(firstName(o.name))}, ${esc(o.intro)}</p>`,
    "44px 24px 28px",
  );
  const body = `${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${BLUE};margin:0 0 24px;">${rows}</table>` : ""}${quote}<p style="margin:0;">${button(o.cta.url, o.cta.label, RED)}</p>`;
  const html = layout(company, {
    preheader: oneLine(`${o.title} — ${o.intro}`),
    title: o.title,
    hero,
    body,
    footerNote: o.audience === "client" ? `You are receiving this because of activity on your SMASH client portal for ${esc(company.name)}.` : "An internal notification from the SMASH CRM.",
  });
  const text = [`Hi ${firstName(o.name)},`, "", o.intro, "", ...(o.rows ?? []).map(([l, v]) => `${l}: ${v}`), ...(o.quote ? ["", `"${clip(o.quote, 1200)}"`] : []), "", `${o.cta.label}: ${o.cta.url}`, "", "--", companyText(company)].join("\n");
  return { subject: oneLine(o.subject), html, text };
}
