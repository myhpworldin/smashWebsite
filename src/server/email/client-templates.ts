/**
 * The two emails the client portal sends, in the same full-width table layout as the enquiry emails (templates.ts): the
 * verification code a client types on first login, and the invitation that carries their login details. Pure functions of their
 * input. Everything that varies goes through `esc`, and a subject is a single bounded line.
 */
import { BLUE, FONT, INK, MUTED, RED, band, button, companyText, esc, firstName, layout, oneLine, type CompanyInfo, type RenderedEmail } from "./templates";

const digits = (code: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:26px auto 8px;"><tr>${code
    .split("")
    .map((d) => `<td style="padding:0 4px;"><div style="width:46px;height:58px;line-height:58px;text-align:center;border:2px solid ${BLUE};border-radius:10px;font:700 30px ${FONT};color:${BLUE};background:#ffffff;">${esc(d)}</div></td>`)
    .join("")}</tr></table>`;

/** The 6-digit code a client enters to prove they own the email on their account. */
export function verificationCodeEmail(company: CompanyInfo, o: { name: string; code: string; minutes: number }): RenderedEmail {
  const first = firstName(o.name);
  const hero = band(
    "#ffffff",
    `<p style="margin:0 0 12px;font:700 12.5px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${RED};">Verify your email</p>
<h1 class="h1" style="margin:0;font:700 36px/1.15 ${FONT};color:${BLUE};">Your verification code</h1>
<p class="sub" style="margin:16px auto 0;max-width:460px;font:400 18px/1.65 ${FONT};color:${MUTED};">Hi ${esc(first)}, enter this code in your SMASH client portal to confirm this email address.</p>
${digits(o.code)}
<p style="margin:14px 0 0;font:400 15px/1.6 ${FONT};color:${MUTED};">The code works for ${o.minutes} minutes.</p>`,
    "48px 24px 30px",
    "center",
  );
  const body = `<p style="margin:0;font:400 16px/1.7 ${FONT};color:${INK};">If you did not just try to sign in to the SMASH client portal, you can ignore this email: nobody can use the code without your password.</p>`;
  const html = layout(company, {
    preheader: `Your SMASH verification code is ${o.code}. It works for ${o.minutes} minutes.`,
    title: "Your SMASH verification code",
    hero,
    body,
    footerNote: "This is an automated message about your client portal login. Please do not share the code with anyone.",
  });
  const text = [`Hi ${first},`, "", `Your SMASH client portal verification code is ${o.code}.`, `It works for ${o.minutes} minutes.`, "", "If you did not just try to sign in, ignore this email.", "", "--", companyText(company)].join("\n");
  return { subject: oneLine(`${o.code} is your SMASH verification code`), html, text };
}

/** The 6-digit code that lets a client who forgot their password choose a new one. */
export function passwordResetEmail(company: CompanyInfo, o: { name: string; code: string; minutes: number }): RenderedEmail {
  const first = firstName(o.name);
  const hero = band(
    "#ffffff",
    `<p style="margin:0 0 12px;font:700 12.5px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${RED};">Reset your password</p>
<h1 class="h1" style="margin:0;font:700 36px/1.15 ${FONT};color:${BLUE};">Your reset code</h1>
<p class="sub" style="margin:16px auto 0;max-width:460px;font:400 18px/1.65 ${FONT};color:${MUTED};">Hi ${esc(first)}, enter this code on the SMASH client sign-in page to choose a new password.</p>
${digits(o.code)}
<p style="margin:14px 0 0;font:400 15px/1.6 ${FONT};color:${MUTED};">The code works for ${o.minutes} minutes and can be used once.</p>`,
    "48px 24px 30px",
    "center",
  );
  const body = `<p style="margin:0;font:400 16px/1.7 ${FONT};color:${INK};">If you did not ask to reset your password, you can ignore this email: your password has not been changed and nobody can use the code without access to this mailbox.</p>`;
  const html = layout(company, {
    preheader: `Your SMASH password reset code is ${o.code}. It works for ${o.minutes} minutes.`,
    title: "Your SMASH password reset code",
    hero,
    body,
    footerNote: "This is an automated message about your client portal login. Please do not share the code with anyone.",
  });
  const text = [`Hi ${first},`, "", `Your SMASH client portal password reset code is ${o.code}.`, `It works for ${o.minutes} minutes and can be used once.`, "", "If you did not ask to reset your password, ignore this email: nothing has changed.", "", "--", companyText(company)].join("\n");
  return { subject: oneLine(`${o.code} is your SMASH password reset code`), html, text };
}

/** The invitation: where to sign in, the email and the temporary password, and what happens on first login. */
export function clientInviteEmail(company: CompanyInfo, o: { name: string; companyName: string; email: string; temporaryPassword: string; loginUrl: string }): RenderedEmail {
  const first = firstName(o.name);
  const row = (label: string, value: string, mono = false) =>
    `<tr><td style="padding:14px 0;border-bottom:1px solid #E6E9F0;"><div style="font:700 11.5px ${FONT};letter-spacing:.1em;text-transform:uppercase;color:${MUTED};">${esc(label)}</div><div style="margin-top:5px;font:${mono ? "600 18px" : "400 17px"} ${mono ? "'SFMono-Regular',Menlo,Consolas,monospace" : FONT};color:${INK};word-break:break-all;">${esc(value)}</div></td></tr>`;
  const hero = band(
    "#ffffff",
    `<p style="margin:0 0 12px;font:700 12.5px ${FONT};letter-spacing:.14em;text-transform:uppercase;color:${RED};">Client portal</p>
<h1 class="h1" style="margin:0;font:700 38px/1.15 ${FONT};color:${BLUE};">Welcome to SMASH, ${esc(first)}!</h1>
<p class="sub" style="margin:16px 0 0;max-width:480px;font:400 18px/1.65 ${FONT};color:${MUTED};">Your client portal for ${esc(o.companyName)} is ready. Track your leads, calls and ad spend, always up to date.</p>`,
    "44px 24px 28px",
  );
  const body = `
<h2 style="margin:0 0 6px;font:700 13px ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${RED};">Your login details</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid ${BLUE};margin:0 0 28px;">${row("Email", o.email)}${row("Temporary password", o.temporaryPassword, true)}</table>
<p style="margin:0 0 26px;">${button(o.loginUrl, "Sign in to your portal", RED)}</p>
<h2 style="margin:0 0 10px;font:700 18px ${FONT};color:${BLUE};">What happens on your first sign in</h2>
<ol style="margin:0;padding-left:20px;font:400 16px/1.8 ${FONT};color:${INK};">
<li>We email you a 6-digit code to confirm this address.</li>
<li>You replace the temporary password with one only you know.</li>
<li>Your dashboard opens.</li>
</ol>
<p style="margin:26px 0 0;font:400 15px/1.7 ${FONT};color:${MUTED};">For your security the temporary password stops being useful as soon as you choose your own. Please delete this email afterwards.</p>`;
  const html = layout(company, {
    preheader: `Your SMASH client portal is ready. Sign in with the temporary password in this email.`,
    title: "Your SMASH client portal",
    hero,
    body,
    footerNote: `You are receiving this because ${esc(company.name)} created a client portal login for this email address.`,
  });
  const text = [
    `Welcome to SMASH, ${first}!`,
    "",
    `Your client portal for ${o.companyName} is ready.`,
    "",
    `Sign in: ${o.loginUrl}`,
    `Email: ${o.email}`,
    `Temporary password: ${o.temporaryPassword}`,
    "",
    "On your first sign in we email you a 6-digit code to confirm this address, then you choose your own password.",
    "Please delete this email afterwards.",
    "",
    "--",
    companyText(company),
  ].join("\n");
  return { subject: oneLine("Your SMASH client portal login"), html, text };
}
