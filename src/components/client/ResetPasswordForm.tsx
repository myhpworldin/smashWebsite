"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { checkClientPassword } from "@/lib/client-password";
import { PasswordField } from "./ClientFields";
import styles from "./ClientForm.module.css";

/**
 * Choose a new password: the first-login step (`mode="first"`, the current password is the temporary one from the invitation, and
 * success opens the dashboard) and the Account page's change-password card (`mode="change"`, success stays on the page).
 * The rules tick live as they are met, using the same function the server enforces.
 */
export function ResetPasswordForm({ mode }: { mode: "first" | "change" }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);

  const checks = useMemo(() => checkClientPassword(next), [next]);
  const passed = checks.filter((c) => c.ok).length;
  // Only length is required, so the meter is a hint about length: red under 8, then amber, green and full at 8, 12 and 16.
  const level = next.length === 0 ? 0 : next.length < 8 ? 1 : next.length < 12 ? 2 : next.length < 16 ? 3 : 4;
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && passed === checks.length && confirm === next;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const result = await apiFetch<{ next: string }>("/api/client/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
        signal: AbortSignal.timeout(20000),
      });
      if (isApiSuccess(result)) {
        setDone(true);
        if (mode === "first") {
          setTimeout(() => window.location.assign(result.data.next), 900);
        } else {
          setCurrent("");
          setNext("");
          setConfirm("");
          router.refresh();
          inFlight.current = false;
          setBusy(false);
        }
        return;
      }
      if (result.error.fields) setFields(result.error.fields);
      setError(result.error.fields ? null : result.error.code === "UNAUTHORIZED" ? "Your session ended. Please sign in again." : result.message);
    } catch {
      setError("We couldn't save your password. Please check your connection and try again.");
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form} aria-label={mode === "first" ? "Choose your password" : "Change password"}>
      <PasswordField
        label={mode === "first" ? "Temporary password" : "Current password"}
        name="current-password"
        autoComplete="current-password"
        placeholder={mode === "first" ? "From your invitation email" : "Your current password"}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={fields.currentPassword}
        hint={mode === "first" ? "The password you just signed in with." : undefined}
      />
      <div className={styles.field}>
        <PasswordField label="New password" name="new-password" autoComplete="new-password" placeholder="Choose a new password" value={next} onChange={(e) => setNext(e.target.value)} error={fields.newPassword} />
        <div className={styles.meter} data-level={level} aria-hidden="true"><span /><span /><span /><span /></div>
        <ul className={styles.rules} aria-label="Password rules">
          {checks.map((c) => (
            <li key={c.id} className={styles.rule} data-ok={c.ok}>
              <span className={styles.tick}><Check size={10} strokeWidth={3.5} aria-hidden="true" /></span>
              {c.label}
              <span className="sr-only">{c.ok ? " (met)" : " (not met yet)"}</span>
            </li>
          ))}
        </ul>
      </div>
      <PasswordField label="Confirm new password" name="confirm-password" autoComplete="new-password" placeholder="Type it again" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? "The passwords don't match yet." : null} />
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      {done ? <p role="status" className={`${styles.notice} ${styles.success}`}>{mode === "first" ? "Password saved. Opening your dashboard…" : "Your password was changed."}</p> : null}
      <button type="submit" className={styles.submit} disabled={busy || !ready || (done && mode === "first")}>
        {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {busy ? "Saving…" : mode === "first" ? "Save and continue" : "Change password"}
        {busy ? null : <ArrowRight size={18} strokeWidth={2} className={styles.arrow} aria-hidden="true" />}
      </button>
    </form>
  );
}
