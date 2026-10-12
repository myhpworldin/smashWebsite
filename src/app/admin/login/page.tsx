import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/api/admin-session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import styles from "./login.module.css";

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
    <div className={styles.shell} data-admin-theme="">
      <div className={styles.card}>
        <Image src="/media/figma/smash-logo-2.png" alt="SMASH" width={140} height={53} className={styles.logo} />
        <h1 className={styles.heading}>CRM Admin Login</h1>
        <p className={styles.subheading}>Sign in to manage SMASH leads.</p>
        <div className={styles.formWrap}>
          <Suspense fallback={null}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
