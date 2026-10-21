"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, RotateCw } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { checkClientPassword } from "@/lib/client-password";
import { CodeBoxes } from "./CodeBoxes";
import { EmailField, PasswordField } from "./ClientFields";
import styles from "./ClientForm.module.css";

const RESEND_COOLDOWN = 60; // the server's resend wait, in seconds
const NETWORK_ERROR = "We couldn't reach the server. Please check your connection and try again.";

type Props = {
  stage: "email" | "code";
  email: string;
  onEmailChange: (value: string) => void;
  onCodeSent: () => void;
  onChangeEmail: () => void;
  onBack: () => void;
  onDone: () => void;
};

/**
 * "Forgot password" on the sign-in page, in two stages. Stage 1 asks for the email, checks it belongs to a client account (an
 * unregistered or disabled one is reported under the field and no code is sent) and has a code mailed. Stage 2 takes the 6-digit
 * code only and checks it the moment the sixth digit is typed; the new-password fields appear only once it passes. Saving the
 * password returns to the sign-in form, where the client signs in with it.
 */
export function ForgotPasswordForm({ stage, email, onEmailChange, onCodeSent, onChangeEmail, onBack, onDone }: Props) {
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [codeWrong, setCodeWrong] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const checks = useMemo(() => checkClientPassword(next), [next]);
  const level = next.length === 0 ? 0 : next.length < 8 ? 1 : next.length < 12 ? 2 : next.length < 16 ? 3 : 4;
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = verified && checks.every((c) => c.ok) && confirm === next;

  async function post<T>(path: string, body: unknown) {
    return apiFetch<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  }

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    if (inFlight.current || !email.trim()) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setEmailError(null);
    setInfo(null);
    try {
      const result = await post<{ waitSeconds: number; resent: boolean }>("/api/client/auth/forgot-password", { email });
      if (isApiSuccess(result)) {
        const wait = result.data.waitSeconds;
        setCooldown(wait);
        if (stage === "email") onCodeSent();
        else {
          setCode("");
          setCodeWrong(false);
          setInfo(result.data.resent ? "We've sent the same code again. Check your spam folder too." : wait < RESEND_COOLDOWN ? "A code was sent a moment ago. Please use it, or ask again when the timer ends." : "A new code has been sent. The earlier one no longer works.");
        }
      } else if (result.error.fields?.email) {
        setEmailError(result.error.fields.email);
      } else {
        setError(result.message);
      }
    } catch {
      setError(NETWORK_ERROR);
    }
    inFlight.current = false;
    setBusy(false);
  }

  /** Called by the boxes when the sixth digit lands: ask the server whether it is the right code, and only then open the password fields. */
  async function checkCode(entered: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    setCodeWrong(false);
    try {
      const result = await post("/api/client/auth/forgot-password/verify", { email, code: entered });
      if (isApiSuccess(result)) {
        setVerified(true);
      } else {
        setCodeWrong(true);
        setError(result.error.fields?.code ?? result.message);
        setCode("");
      }
    } catch {
      setError(NETWORK_ERROR);
      setCode("");
    }
    inFlight.current = false;
    setBusy(false);
  }

  /** The code can lapse between the check and saving the password: say so and start the code step again. */
  function codeLapsed(message: string) {
    setVerified(false);
    setCode("");
    setNext("");
    setConfirm("");
    setError(message);
  }

  async function submitReset(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const result = await post("/api/client/auth/forgot-password/confirm", { email, code, newPassword: next });
      if (isApiSuccess(result)) {
        onDone();
        return;
      }
      if (result.error.fields) setFields(result.error.fields);
      if (result.error.code === "BAD_REQUEST") codeLapsed(result.message);
      else setError(result.error.fields ? null : result.message);
    } catch {
      setError(NETWORK_ERROR);
    }
    inFlight.current = false;
    setBusy(false);
  }

  if (stage === "email") {
    return (
      <form onSubmit={requestCode} noValidate className={styles.form} aria-label="Forgot password">
        <EmailField label="Email" name="email" autoComplete="username" placeholder="you@company.com" required autoFocus value={email} onChange={(e) => { onEmailChange(e.target.value); setEmailError(null); }} error={emailError} />
        {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
        <button type="submit" className={styles.submit} disabled={busy || !email.trim()}>
          {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
          {busy ? "Sending…" : "Send reset code"}
          {busy ? null : <ArrowRight size={18} strokeWidth={2} className={styles.arrow} aria-hidden="true" />}
        </button>
        <button type="button" className={styles.linkButton} onClick={onBack}><ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />Back to sign in</button>
      </form>
    );
  }

  return (
    <form onSubmit={submitReset} noValidate className={styles.form} aria-label={verified ? "Choose a new password" : "Enter your code"}>
      <p className={styles.codeIntro} role="status">We emailed a 6-digit code to <strong>{email}</strong>. It works for 10 minutes.</p>
      <div className={styles.field}>
        <span className={styles.label}>6-digit code</span>
        <CodeBoxes value={code} onChange={setCode} onComplete={(c) => void checkCode(c)} disabled={busy || verified} invalid={codeWrong} autoFocus label="6-digit code" />
        {verified ? <p className={styles.verifiedLine} role="status"><CheckCircle2 size={16} strokeWidth={2.25} aria-hidden="true" />Code verified</p> : busy ? <p className={styles.hint} role="status">Checking your code…</p> : null}
      </div>
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      {info ? <p role="status" className={styles.notice}>{info}</p> : null}
      {verified ? (
        <>
          <div className={styles.field}>
            <PasswordField label="New password" name="new-password" autoComplete="new-password" placeholder="Choose a new password" autoFocus value={next} onChange={(e) => setNext(e.target.value)} error={fields.newPassword} />
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
          <button type="submit" className={styles.submit} disabled={busy || !ready}>
            {busy ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {busy ? "Saving…" : "Change password"}
            {busy ? null : <ArrowRight size={18} strokeWidth={2} className={styles.arrow} aria-hidden="true" />}
          </button>
        </>
      ) : null}
      <div className={styles.backRow}>
        <button type="button" className={styles.linkButton} onClick={onBack}><ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />Back to sign in</button>
        {verified ? null : (
          <button type="button" className={styles.linkButton} onClick={() => void requestCode()} disabled={busy || cooldown > 0}>
            <RotateCw size={14} strokeWidth={2} aria-hidden="true" />{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        )}
      </div>
      {verified ? null : <button type="button" className={styles.linkButton} onClick={onChangeEmail}>Use a different email</button>}
    </form>
  );
}
