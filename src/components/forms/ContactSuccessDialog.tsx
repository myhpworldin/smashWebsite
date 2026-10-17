"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { SweepLink } from "@/components/ui/SweepLink";
import { ROUTES } from "@/lib/routes";
import styles from "./ContactSuccessDialog.module.css";

const STEPS = [
  "A strategist reviews your request",
  "We call you to understand your goals",
  "You get a plan shaped around your business",
];

/** Eight sparks that fly out of the badge once, then fade. */
const SPARKS = Array.from({ length: 8 }, (_, i) => i);

/**
 * The confirmation shown only after the request has actually been saved. A deep-blue header with a badge whose ring
 * pulses and whose tick draws itself, then the thank-you, the next steps rising in one after another, and two ways on.
 * Everything animates in CSS when the content mounts (the Modal mounts it on open), and stands still with reduced
 * motion. `name` and `phone` are what the visitor just typed, kept by the form because it empties itself on success.
 */
export function ContactSuccessDialog({ open, onClose, onClosed, name, phone }: { open: boolean; onClose: () => void; onClosed?: () => void; name: string; phone: string }) {
  const first = name.trim().split(/\s+/)[0];
  return (
    <Modal open={open} onClose={onClose} onClosed={onClosed} labelledBy="contact-success-title" describedBy="contact-success-text" className={styles.dialog}>
      <div className={styles.head}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className={styles.badgeWrap} aria-hidden="true">
          <span className={styles.ring} />
          <span className={`${styles.ring} ${styles.ringLate}`} />
          {SPARKS.map((i) => (
            <span key={i} className={`${styles.spark} ${i % 2 ? styles.sparkRed : ""}`} style={{ "--a": `${i * 45 + 22}deg`, "--d": `${i % 3 === 0 ? 92 : 76}px` } as CSSProperties} />
          ))}
          <span className={styles.badge}>
            <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
              <path className={styles.tick} pathLength={1} d="M12 25.5l8 8L36.5 15" />
            </svg>
          </span>
        </div>
      </div>

      {/* The dialog opens with focus here, not on the close button, so no focus ring appears until the visitor tabs. */}
      <div className={styles.body} tabIndex={-1} data-autofocus>
        <p className={styles.eyebrow}>Request received</p>
        <h2 id="contact-success-title" className={styles.title}>
          {first ? `Thank you, ${first}!` : "Thank you!"}
        </h2>
        <p id="contact-success-text" className={styles.text}>
          We&rsquo;ve received your strategy request. Our team will contact you <strong>within 12 business hours</strong>
          {phone ? <> on <strong className={styles.nowrap}>{phone}</strong></> : null}.
        </p>

        <ol className={styles.steps} aria-label="What happens next">
          {STEPS.map((step, i) => (
            <li key={step} style={{ "--i": i } as CSSProperties}>
              <span className={styles.num} aria-hidden="true">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <div className={styles.actions}>
          <SweepLink href={ROUTES.HOME} tone="red" arrow>Back to Home</SweepLink>
          <Link href={ROUTES.WORK} className={styles.more}>Explore our work</Link>
        </div>
      </div>
    </Modal>
  );
}
