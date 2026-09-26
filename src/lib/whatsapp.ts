/**
 * Official WhatsApp click-to-chat link (`https://wa.me/<number>?text=...`),
 * Stage 6, Phase 4. `SiteSettings.contact.whatsapp` is stored as an ordinary,
 * human-readable phone number (e.g. "+91 98765 43210") — wa.me needs digits
 * only, so this is the one place that conversion happens, rather than asking
 * an editor to hand-format a URL. The pre-filled message matches the site's
 * own existing CTA voice ("Let's Talk Growth", ContactForm.tsx) rather than
 * naming a specific service, which would be inaccurate for a visitor arriving
 * from any other page.
 */
const PREFILLED_MESSAGE = "Hi SMASH, I'd like to talk about growing my business.";

export function whatsAppLink(rawNumber: string): string {
  const digits = rawNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;
}
