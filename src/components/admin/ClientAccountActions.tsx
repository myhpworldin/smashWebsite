"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Power } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { generateTemporaryPassword } from "@/lib/generate-password";
import { CredentialsPanel } from "./ClientAccountForm";
import styles from "./AdminClients.module.css";

/**
 * The two things an administrator can do to an existing login: issue a new temporary password (the client must choose their own
 * again, and any open session ends) and disable or re-enable the account (a disabled client is signed out on their next request).
 */
export function ClientAccountActions({ id, email, isActive }: { id: string; email: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"reset" | "toggle" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ password: string; invite: { requested: boolean; sent: boolean } } | null>(null);

  async function resetPassword() {
    if (busy) return;
    if (!window.confirm(`Issue a new temporary password for ${email}? They will be signed out and must choose a new password.`)) return;
    setBusy("reset");
    setError(null);
    const password = generateTemporaryPassword();
    try {
      const result = await apiFetch<{ invite: { requested: boolean; sent: boolean } }>(`/api/admin/client-accounts/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temporaryPassword: password, sendInvite: true }),
        signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) {
        setIssued({ password, invite: result.data.invite });
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(null);
  }

  async function toggleActive() {
    if (busy) return;
    if (isActive && !window.confirm(`Disable ${email}? They will be signed out and cannot sign in until you enable the account again.`)) return;
    setBusy("toggle");
    setError(null);
    try {
      const result = await apiFetch(`/api/admin/client-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
        signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) router.refresh();
      else setError(result.message);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(null);
  }

  return (
    <div className={styles.stack}>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={resetPassword} disabled={busy !== null}><KeyRound size={16} aria-hidden="true" />{busy === "reset" ? "Working…" : "Reset password"}</button>
        <button type="button" className={`${styles.btn} ${isActive ? styles.btnDanger : ""}`} onClick={toggleActive} disabled={busy !== null}><Power size={16} aria-hidden="true" />{busy === "toggle" ? "Working…" : isActive ? "Disable account" : "Enable account"}</button>
      </div>
      {error ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{error}</p> : null}
      {issued ? <CredentialsPanel email={email} password={issued.password} invite={issued.invite} /> : null}
    </div>
  );
}
