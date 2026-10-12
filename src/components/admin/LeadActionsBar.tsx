import { ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import styles from "./LeadActionsBar.module.css";

/** `wa.me` needs digits only; unlike `lib/whatsapp.ts` (which prefills a visitor→SMASH message for the public site), an admin messaging a lead needs no canned text — they write their own. Kept local rather than extending that function for a message direction it was never meant for. */
const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

/** `websiteOrInstagram` may be a bare domain/handle ("dailybugle.com") or a full URL — normalized to a safe https link here, same tolerance the public Contact form already accepts on submission. */
const safeExternalHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

/**
 * Quick communication shortcuts (CRM Phase 6, Step 21) — plain `mailto:`/`tel:`/`wa.me`/external-link
 * navigation only. No messaging API, no automatic sending; clicking one just hands off to the admin's
 * own email/phone/WhatsApp app with nothing pre-filled on their behalf to confirm or edit.
 */
export function LeadActionsBar({ email, phone, websiteOrInstagram }: { email: string | null; phone: string; websiteOrInstagram: string | null }) {
  return (
    <div className={styles.bar}>
      {email ? <a href={`mailto:${email}`} className={styles.action}><Mail size={14} strokeWidth={1.75} aria-hidden="true" />Email</a> : null}
      <a href={`tel:${phone}`} className={styles.action}><Phone size={14} strokeWidth={1.75} aria-hidden="true" />Call</a>
      <a href={waLink(phone)} target="_blank" rel="noopener noreferrer" className={styles.action}><MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />WhatsApp</a>
      {websiteOrInstagram ? <a href={safeExternalHref(websiteOrInstagram)} target="_blank" rel="noopener noreferrer" className={styles.action}><ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />Website</a> : null}
    </div>
  );
}
