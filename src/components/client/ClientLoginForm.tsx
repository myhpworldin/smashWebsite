"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { EmailField, PasswordField } from "./ClientFields";
import styles from "./ClientForm.module.css";

const NETWORK_ERROR = "We couldn't sign you in. Please check your connection and try again.";

/**
 * Sign in (with a "Forgot password?" link that switches the page to the reset flow). The email lives in the parent so it carries into that flow. The server answers where the client goes next (verify email → new password → dashboard), so this form does not
 * decide: it navigates to whatever page the response names. A hard navigation, because the next page reads the cookie this
 * response just set.
 */
export function ClientLoginForm({ email, onEmailChange, notice, onForgot }: { email: string; onEmailChange: (value: string) => void; notice?: string | null; onForgot: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ next: string }>("/api/client/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(20000),
      });
      if (isApiSuccess(result)) {
        window.location.assign(result.data.next);
        return;
      }
      setError(result.error.code === "UNAUTHORIZED" ? "Invalid email or password." : result.error.code === "RATE_LIMITED" ? result.message : result.error.code === "VALIDATION_ERROR" ? Object.values(result.error.fields ?? {})[0] ?? result.message : "Something went wrong. Please try again.");
    } catch {
      setError(NETWORK_ERROR);
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form} aria-label="Client sign in">
      <EmailField label="Email" name="email" autoComplete="username" placeholder="you@company.com" required value={email} onChange={(e) => onEmailChange(e.target.value)} />
      <PasswordField label="Password" name="password" autoComplete="current-password" placeholder="Your password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className={styles.forgotRow}>
        <button type="button" className={styles.linkButton} onClick={onForgot}>Forgot password?</button>
      </div>
      {notice ? <p role="status" className={`${styles.notice} ${styles.success}`}>{notice}</p> : null}
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {busy ? "Signing in…" : "Sign in"}
        {busy ? null : <ArrowRight size={18} strokeWidth={2} className={styles.arrow} aria-hidden="true" />}
      </button>
    </form>
  );
}
