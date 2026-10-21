import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { getCurrentAdmin } from "@/server/api/admin-session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import styles from "./login.module.css";

const POINTS = [
  { icon: Users, text: "Track, assign and follow up every lead" },
  { icon: Building2, text: "Publish figures to each client's portal" },
  { icon: ShieldCheck, text: "Private to the SMASH team, session-protected" },
];

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin Login — SMASH CRM", robots: { index: false, follow: false } };

/**
 * `/admin/login` — the one page in this phase outside the `(protected)` route group, so it stays
 * reachable while signed out. CRM Phase 2 brief, Step 17: already authenticated and visiting this
 * page anyway → straight to the admin entry route, not the login form again.
 */
export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");

  return (
    <div className={styles.page} data-admin-theme="">
      <aside className={styles.panel}>
        <span className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
        <span className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
        <span className={styles.grid} aria-hidden="true" />
        <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={132} height={47} className={styles.logo} priority />
        <div className={styles.pitch}>
          <p className={styles.eyebrow}>SMASH CRM</p>
          <p className={styles.headline}>Every enquiry, one calm workspace.</p>
          <ul className={styles.points}>
            {POINTS.map(({ icon: Icon, text }, i) => (
              <li key={text} className={styles.point} style={{ "--i": i } as CSSProperties}>
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
          <h1 className={styles.title}>CRM sign in</h1>
          <p className={styles.subtitle}>Sign in to manage SMASH leads and client portals.</p>
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
        </div>
        <p className={styles.help}>Authorised SMASH team members only.</p>
      </div>
    </div>
  );
}
