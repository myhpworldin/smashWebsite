/**
 * The two emails an enquiry sends, as table-based HTML with inline styles (the only layout every mail client
 * renders) plus a plain-text twin. Pure functions of their input: no I/O, so they are easy to test and preview.
 *
 * Both are full-width: stacked bands that run edge to edge (a blue logo band, a white welcome and body, a soft grey
 * contact band, a plain footer) with the readable content kept to a 600px column, instead of a card on a grey page.
 * The logo and the welcome's check are inline images (`cid:smash-logo`, `cid:smash-check`), attached by `enquiry-emails.ts`.
 *
 * Built to survive a mail client's automatic dark mode (Gmail inverts colours on its own): no text is ever light-on-a-colour.
 * The only coloured band holds an image, and every word sits dark on white or on a pale tint, which such a client
 * flips to light on dark consistently. A white heading on a blue hero is what it breaks, so there is none.
 *
 * Everything that came from the visitor or from Site Settings goes through `esc` before it reaches the HTML, and
 * links are only built from values that were checked (`tel`, `mailto`, `webHref`), so a submission can never inject
 * markup or a script into an email, and a subject can never carry a header-breaking newline.
 */
import { CHECK_CID, LOGO_CID } from "./logo";

export type CompanyInfo = {
  name: string;
  /** Absolute origin of the public site, no trailing slash. */
  siteUrl: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  socials: { label: string; url: string }[];
};

export type EnquiryDetails = {
  name: string;
  companyName?: string;
  website?: string;
  phone: string;
  email?: string;
  location: string;
  service?: string;
  budget?: string;
  goal?: string;
  message?: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

/** How soon the team replies: the same promise the contact form makes under its button. */
export const RESPONSE_PROMISE = "within 12 business hours";

export const BLUE = "#01124A";
export const BRIGHT = "#0058C8";
export const RED = "#E90101";
export const INK = "#0B0F19";
export const MUTED = "#5B6275";
export const LINE = "#E6E9F0";
export const SOFT = "#F4F6FB";
export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** One line, bounded: safe as a subject. */
export const oneLine = (value: string, max = 150) => value.replace(/[\r\n\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const waHref = (number: string) => `https://wa.me/${number.replace(/\D/g, "")}`;
/** The website a visitor typed (`dailybugle.com`, `instagram.com/x`) as a clickable https link, or null when it is not a web address. */
const webHref = (raw: string): string | null => {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  if (!URL.canParse(candidate)) return null;
  const { protocol } = new URL(candidate);
  return protocol === "https:" || protocol === "http:" ? candidate : null;
};
export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const link = (href: string, label: string, color = BRIGHT) => `<a href="${esc(href)}" style="color:${color};text-decoration:none;font-weight:600;">${esc(label)}</a>`;

/** A pill button, drawn as an outline in its own colour so its text is dark-on-light like everything else. */
export const button = (href: string, label: string, color: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 10px 12px 0;"><tr><td bgcolor="#ffffff" style="border:2px solid ${color};border-radius:999px;background:#ffffff;"><a href="${esc(href)}" style="display:inline-block;padding:12px 26px;font:700 15px ${FONT};color:${color};text-decoration:none;border-radius:999px;">${esc(label)}</a></td></tr></table>`;

/** One edge-to-edge band: it fills the width with `bg`, and its content sits in a centred 600px column. */
export const band = (bg: string, inner: string, pad: string, align = "left") =>
  `<tr><td bgcolor="${bg}" align="center" style="background-color:${bg};padding:${pad};"><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;"><tr><td align="${align}" style="font-family:${FONT};">${inner}</td></tr></table></td></tr>`;

const image = (cid: string, width: number, height: number, alt: string, extra = "") =>
  `<img src="cid:${cid}" width="${width}" height="${height}" alt="${esc(alt)}" style="display:block;border:0;outline:none;${extra}">`;

type Row = { label: string; html: string; text: string };
const row = (label: string, value: string | null | undefined, html?: string): Row | null => (value ? { label, html: html ?? esc(value), text: value } : null);
const present = (rows: (Row | null)[]) => rows.filter((r): r is Row => r !== null);

function detailRows(d: EnquiryDetails): Row[] {
  const site = d.website ? webHref(d.website) : null;
  return present([
    row("Name", d.name),
    row("Company", d.companyName),
    row("Phone", d.phone, link(telHref(d.phone), d.phone)),
    row("Email", d.email, d.email ? link(`mailto:${d.email}`, d.email) : undefined),
    row("Location", d.location),
    row("Website / Instagram", d.website, d.website && site ? link(site, d.website) : undefined),
    row("Service", d.service),
    row("Monthly budget", d.budget),
    row("Primary goal", d.goal),
    row("Message", d.message, d.message ? esc(d.message).replace(/\r?\n/g, "<br>") : undefined),
  ]);
}

/**
 * Each fact is a small label over its value, stacked (not two columns), so it reads the same on a phone as on a desk
 * and a long email address or message never gets squeezed. Hairlines separate them; there is no box.
 */
const detailTable = (rows: Row[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${BLUE};">${rows
    .map(
      (r) =>
        `<tr><td style="padding:16px 0;border-bottom:1px solid ${LINE};"><div style="font:700 11.5px ${FONT};letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">${esc(r.label)}</div><div style="margin-top:5px;font:400 17px/1.55 ${FONT};color:${INK};word-break:break-word;">${r.html}</div></td></tr>`,
    )
    .join("")}</table>`;

const detailText = (rows: Row[]) => rows.map((r) => `${r.label}: ${r.text}`).join("\n");

/**
 * The shared page, top to bottom: the logo band, a red rule, the hero and body, an optional contact band, then the
 * company footer. The head's media query steps the headline down on a phone.
 */
export function layout(company: CompanyInfo, o: { preheader: string; title: string; hero: string; body: string; contact?: string; footerNote: string }): string {
  const socials = company.socials.length ? `<p style="margin:12px 0 0;font:400 14px ${FONT};">${company.socials.map((s) => link(s.url, s.label)).join(" &nbsp;·&nbsp; ")}</p>` : "";
  const footer = `
<p style="margin:0;font:700 16px ${FONT};color:${BLUE};">${esc(company.name)}</p>
<p style="margin:8px 0 0;font:400 14px/1.7 ${FONT};color:${MUTED};">${company.address ? `${esc(company.address)}<br>` : ""}${company.phone ? link(telHref(company.phone), company.phone) : ""}${company.phone && company.email ? " &nbsp;·&nbsp; " : ""}${company.email ? link(`mailto:${company.email}`, company.email) : ""}<br>${link(company.siteUrl, company.siteUrl.replace(/^https?:\/\//, ""))}</p>
${socials}
<p style="margin:22px 0 0;font:400 12.5px/1.6 ${FONT};color:${MUTED};">${o.footerNote}</p>`;
  const logo = image(LOGO_CID, 132, 47, company.name, `height:auto;font:700 20px ${FONT};color:#ffffff;`);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(o.title)}</title>
<style>@media (max-width:480px){.h1{font-size:31px !important}.sub{font-size:17px !important}}</style></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(o.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
<tr><td bgcolor="${BLUE}" style="background-color:${BLUE};background-image:linear-gradient(135deg,${BLUE} 0%,#0A2F8F 100%);padding:24px 24px;"><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto;"><tr><td>${logo}</td></tr></table></td></tr>
<tr><td bgcolor="${RED}" height="4" style="background:${RED};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
${o.hero}
${band("#ffffff", o.body, "8px 24px 40px")}
${o.contact ? band(SOFT, o.contact, "36px 24px") : ""}
${band("#ffffff", footer, "36px 24px 40px")}
<tr><td bgcolor="${BLUE}" height="8" style="background:${BLUE};height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
</table></body></html>`;
}

export const companyText = (c: CompanyInfo) =>
  [c.name, c.address, [c.phone, c.email].filter(Boolean).join(" | "), c.siteUrl, ...c.socials.map((s) => `${s.label}: ${s.url}`)].filter(Boolean).join("\n");

/** What the visitor gets: a warm welcome, the promise, a copy of what they sent, and the company's details. */
export function confirmationEmail(company: CompanyInfo, d: EnquiryDetails): RenderedEmail {
  const rows = detailRows(d);
  const first = firstName(d.name);
  const reach = present([
    row("Call us", company.phone, company.phone ? link(telHref(company.phone), company.phone) : undefined),
    row("Email us", company.email, company.email ? link(`mailto:${company.email}`, company.email) : undefined),
    row("WhatsApp", company.whatsapp, company.whatsapp ? link(waHref(company.whatsapp), company.whatsapp) : undefined),
  ]);

  const hero = band(
    "#ffffff",
    `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px;"><tr><td>${image(CHECK_CID, 88, 88, "")}</td></tr></table>
<p style="margin:0 0 12px;font:700 12.5px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${RED};">Request received</p>
<h1 class="h1" style="margin:0;font:700 40px/1.15 ${FONT};color:${BLUE};">Welcome to SMASH, ${esc(first)}!</h1>
<p class="sub" style="margin:18px auto 0;max-width:460px;font:400 18px/1.65 ${FONT};color:${MUTED};">Thank you for reaching out. We are excited to learn about your business and help it grow.</p>`,
    "48px 24px 36px",
    "center",
  );

  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 38px;"><tr><td bgcolor="#F1F5FF" style="background:#F1F5FF;border-left:4px solid ${RED};padding:20px 22px;"><p style="margin:0;font:700 20px/1.4 ${FONT};color:${BLUE};">Our team will contact you ${RESPONSE_PROMISE}.</p><p style="margin:6px 0 0;font:400 16px/1.6 ${FONT};color:${MUTED};">Hi ${esc(first)}, we have received your strategy request. Until then, here is a copy of what you sent us.</p></td></tr></table>
<h2 style="margin:0 0 14px;font:700 13px ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${RED};">Your request</h2>
${detailTable(rows)}
<p style="margin:38px 0 4px;font:400 17px/1.7 ${FONT};color:${INK};">We look forward to speaking with you.</p>
<p style="margin:0 0 30px;font:400 17px/1.7 ${FONT};color:${INK};">Warm regards,<br><strong style="color:${BLUE};">The SMASH team</strong></p>
<p style="margin:0;">${button(company.siteUrl, "Visit our website", BRIGHT)}${button(`${company.siteUrl}/work`, "See our work", BLUE)}</p>`;

  const contact = reach.length
    ? `<h2 style="margin:0 0 4px;font:700 22px ${FONT};color:${BLUE};">Need us sooner?</h2>
<p style="margin:0 0 18px;font:400 16px/1.6 ${FONT};color:${MUTED};">We are only a message away.</p>
<table role="presentation" cellpadding="0" cellspacing="0">${reach.map((r) => `<tr><td style="padding:4px 18px 4px 0;font:700 11.5px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${MUTED};">${esc(r.label)}</td><td style="padding:4px 0;font:400 16px/1.6 ${FONT};">${r.html}</td></tr>`).join("")}</table>`
    : undefined;

  const html = layout(company, {
    preheader: `Hi ${first}, we have received your request and will contact you ${RESPONSE_PROMISE}.`,
    title: "Welcome to SMASH",
    hero,
    body,
    contact,
    footerNote: `You are receiving this because a strategy request was submitted on ${esc(company.siteUrl.replace(/^https?:\/\//, ""))} using this email address. This is an automated confirmation; replying to it reaches our team.`,
  });
  const text = [
    `Welcome to SMASH, ${first}!`,
    "",
    "Thank you for reaching out. We are excited to learn about your business and help it grow.",
    "",
    `Our team will contact you ${RESPONSE_PROMISE}.`,
    `Hi ${first}, we have received your strategy request. Until then, here is a copy of what you sent us.`,
    "",
    "YOUR REQUEST",
    detailText(rows),
    "",
    "We look forward to speaking with you.",
    "Warm regards,",
    "The SMASH team",
    ...(reach.length ? ["", "NEED US SOONER?", ...reach.map((r) => `${r.label}: ${r.text}`)] : []),
    "",
    "--",
    companyText(company),
  ].join("\n");
  return { subject: oneLine(`Welcome to SMASH, ${first}! We have received your request`), html, text };
}

/** What the team gets: the whole submission, click-to-call and reply buttons, and a link to the lead in the CRM. */
export function teamNotificationEmail(company: CompanyInfo, d: EnquiryDetails, o: { leadUrl: string; submittedAt: Date }): RenderedEmail {
  const rows = detailRows(d);
  const when = `${o.submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`;
  const hero = band(
    "#ffffff",
    `<p style="margin:0 0 12px;font:700 12.5px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${RED};">New website enquiry</p>
<h1 class="h1" style="margin:0;font:700 36px/1.15 ${FONT};color:${BLUE};">${esc(d.name)}</h1>
${d.companyName ? `<p style="margin:8px 0 0;font:400 20px/1.4 ${FONT};color:${INK};">${esc(d.companyName)}</p>` : ""}
<p style="margin:14px 0 0;font:400 15px/1.6 ${FONT};color:${MUTED};">Submitted ${esc(when)}. The visitor was told to expect a call ${RESPONSE_PROMISE}.</p>`,
    "44px 24px 28px",
  );
  const body = `
<p style="margin:0 0 30px;">${button(telHref(d.phone), `Call ${d.phone}`, RED)}${d.email ? button(`mailto:${d.email}`, "Reply by email", BRIGHT) : ""}${button(o.leadUrl, "Open in CRM", BLUE)}</p>
${detailTable(rows)}`;
  const html = layout(company, {
    preheader: `${d.name}${d.service ? ` is interested in ${d.service}` : " sent a new enquiry"}. Call ${d.phone}.`,
    title: "New website enquiry",
    hero,
    body,
    footerNote: "Sent automatically by the website's contact form. The enquiry is also saved as a new lead in the CRM.",
  });
  const text = [`NEW WEBSITE ENQUIRY (${when})`, `Contact within ${RESPONSE_PROMISE.replace("within ", "")}.`, "", detailText(rows), "", `Open in CRM: ${o.leadUrl}`].join("\n");
  return { subject: oneLine(`New enquiry: ${d.name}${d.service ? ` – ${d.service}` : ""}`), html, text };
}
