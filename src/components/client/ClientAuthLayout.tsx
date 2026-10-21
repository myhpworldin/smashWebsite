import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, Check, Clock3, ShieldCheck } from "lucide-react";
import styles from "./ClientAuthLayout.module.css";

const POINTS = [
  { icon: BarChart3, text: "Leads, calls and ad spend in one place" },
  { icon: Clock3, text: "Always shows when your numbers were last updated" },
  { icon: ShieldCheck, text: "Private to your team, verified by email" },
];

const STEPS = ["Sign in", "Verify email", "New password"];

/**
 * The frame of every signed-out client page (sign in) and the two first-login steps (verify the email, choose a password): a navy
 * brand panel beside the form on a wide screen, the form alone below 900px. `step` (1-based, 2 = verify, 3 = new password) shows the
 * progress of the first login; the sign-in page passes none. Server component: the motion is CSS, and `prefers-reduced-motion` turns it off.
 */
export function ClientAuthLayout({ title, subtitle, step, children }: { title: string; subtitle: string; step?: 2 | 3; children: ReactNode }) {
  return (
    <div className={styles.page} data-client-theme="">
      <aside className={styles.panel}>
        <span className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
        <span className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
        <span className={styles.grid} aria-hidden="true" />
        <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={132} height={47} className={styles.logo} priority />
        <div className={styles.pitch}>
          <p className={styles.eyebrow}>Client portal</p>
          <p className={styles.headline}>Your growth, at a glance.</p>
          <ul className={styles.points}>
            {POINTS.map(({ icon: Icon, text }, i) => (
              <li key={text} className={styles.point} style={{ "--i": i } as React.CSSProperties}>
                <span className={styles.pointIcon}><Icon size={18} strokeWidth={1.75} aria-hidden="true" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.panelFoot}>© SMASH Digital Media</p>
      </aside>

      <div className={styles.main}>
        <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={116} height={42} className={styles.mobileBrand} priority />
        <div className={styles.card}>
          {step ? (
            <ol className={styles.stepper} aria-label="First sign-in steps">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const state = n < step ? "done" : n === step ? "current" : "todo";
                return (
                  <li key={label} className={styles.step} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                    <span className={styles.stepDot}>{state === "done" ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : n}</span>
                    <span className={styles.stepLabel}>{label}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
        </div>
        <p className={styles.help}>Trouble signing in? <Link href="/contact">Contact your SMASH account manager</Link></p>
      </div>
    </div>
  );
}
