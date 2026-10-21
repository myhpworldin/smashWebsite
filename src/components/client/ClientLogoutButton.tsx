"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import styles from "@/components/layout/AppFrame.module.css";

export function ClientLogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    // Best effort: whether or not the request lands, the client goes back to the sign-in page (a hard navigation, so no cached signed-in render survives).
    await apiFetch("/api/client/auth/logout", { method: "POST" }).catch(() => null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate: see above
    window.location.assign("/client/login");
  }

  return (
    <button type="button" className={styles.logout} onClick={logout} disabled={busy}>
      <LogOut size={15} strokeWidth={2} aria-hidden="true" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
