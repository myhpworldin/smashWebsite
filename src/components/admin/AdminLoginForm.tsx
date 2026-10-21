"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import styles from "./AdminLoginForm.module.css";

const GENERIC_ERROR = "Invalid email or password.";
const NETWORK_ERROR = "We couldn't sign you in. Please check your connection and try again.";
const SERVER_ERROR = "Something went wrong. Please try again.";
/** Only an internal `/admin/**` path is ever honored as the post-login destination — anything else (an absolute URL, a different origin, a path outside `/admin`) is ignored, so `?next=` can never be used to redirect a signed-in admin off-site (an open-redirect vector). */
const SAFE_NEXT = /^\/admin(\/.*)?$/;

function safeNext(raw: string | null): string {
  return raw && SAFE_NEXT.test(raw) ? raw : "/admin";
}

export function AdminLoginForm() {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlight = useRef(false);
  const next = safeNext(useSearchParams().get("next"));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("submitting");
    setErrorMessage(null);

    let result;
    try {
      result = await apiFetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      inFlight.current = false;
      setStatus("error");
      setErrorMessage(NETWORK_ERROR);
      return;
    }

    if (isApiSuccess(result)) {
      // A hard navigation, not client-side routing: the next page's auth state depends on the
      // cookie this response just set, so it must be read by a fresh request, not served from the
      // router's in-memory cache of an earlier, unauthenticated render.
      window.location.assign(next);
      return;
    }

    inFlight.current = false;
    setStatus("error");
    // Only a genuine wrong-credentials response (401) gets the deliberately generic "invalid email
    // or password" wording — whether it was the email or the password is exactly what an attacker
    // must not learn. A server-side problem (500, e.g. a missing config value) is a different thing
    // entirely and must not be mislabeled as the admin's own mistake: that both hides a real
    // operational issue from whoever's troubleshooting it and wrongly implies their credentials are
    // wrong when they may not be.
    setErrorMessage(
      result.error.code === "RATE_LIMITED" ? result.message
      : result.error.code === "UNAUTHORIZED" ? GENERIC_ERROR
      : SERVER_ERROR,
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form} aria-label="Admin login">
      <div className={styles.field}>
        <label htmlFor={emailId} className={styles.label}>Email</label>
        <div className={styles.inputRow}>
          <Mail size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
          <input
            id={emailId}
            className={styles.input}
            type="email"
            name="email"
            autoComplete="username"
            placeholder="you@smash.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={status === "error" || undefined}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={passwordId} className={styles.label}>Password</label>
        <div className={styles.inputRow}>
          <Lock size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
          <input
            id={passwordId}
            className={styles.input}
            data-with-toggle="true"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={status === "error" || undefined}
          />
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {errorMessage ? <p role="alert" className={styles.formError}>{errorMessage}</p> : null}
      <button type="submit" className={styles.submit} disabled={status === "submitting"}>
        {status === "submitting" ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {status === "submitting" ? "Signing in…" : "Sign in"}
        {status === "submitting" ? null : <ArrowRight size={18} strokeWidth={2} className={styles.arrow} aria-hidden="true" />}
      </button>
    </form>
  );
}
