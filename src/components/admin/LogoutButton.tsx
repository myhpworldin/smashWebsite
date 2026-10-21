"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import styles from "@/components/layout/AppFrame.module.css";

/** The CRM's sign-out control, styled by the shared sidebar frame (it sits at the foot of the navy sidebar). */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    // Best-effort: even if the request fails (e.g. the network drops), send the admin back to the
    // login page anyway — a stale local session is not a reason to trap them on a page they can no
    // longer act on. The server-side cookie, if it didn't clear, will simply fail `requireAdminSession`
    // on its own next use (it's a short-lived, self-expiring token either way).
    await apiFetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    // A hard navigation, not `router.push()`: the next page's auth state depends on the cookie this
    // request just cleared, so it must be re-read by a fresh request, not served from the client
    // router's cache of an earlier, authenticated render.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate: see above
    window.location.assign("/admin/login");
  }

  return (
    <button type="button" className={styles.logout} disabled={loading} onClick={handleLogout}>
      <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
      {loading ? "Signing out…" : "Log out"}
    </button>
  );
}
