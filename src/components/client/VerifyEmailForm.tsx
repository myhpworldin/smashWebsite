"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { CheckCircle2, RotateCw } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import styles from "./ClientForm.module.css";
import own from "./VerifyEmailForm.module.css";

const LENGTH = 6;
/** The code was emailed when they signed in a moment ago, so a resend is offered only after this long (the server enforces 60s). */
const INITIAL_COOLDOWN = 45;
const RESEND_COOLDOWN = 60;

/**
 * Step 2 of the first login: the 6-digit code from the email. Six boxes behave as one field (typing advances, backspace goes
 * back, a pasted code fills them all) and the code is submitted the moment the sixth digit lands. Wrong codes shake and say how
 * many tries are left; the server kills a code after five.
 */
export function VerifyEmailForm({ maskedEmail }: { maskedEmail: string }) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(INITIAL_COOLDOWN);
  const [resending, setResending] = useState(false);
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const inFlight = useRef(false);

  useEffect(() => {
    cells.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(code: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await apiFetch<{ next: string }>("/api/client/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: AbortSignal.timeout(20000),
      });
      if (isApiSuccess(result)) {
        setVerified(true);
        setTimeout(() => window.location.assign(result.data.next), 900);
        return;
      }
      setError(result.error.code === "UNAUTHORIZED" ? "Your session ended. Please sign in again." : result.message);
      setDigits(Array(LENGTH).fill(""));
      cells.current[0]?.focus();
    } catch {
      setError("We couldn't check the code. Please check your connection and try again.");
    }
    inFlight.current = false;
    setBusy(false);
  }

  function setAt(index: number, value: string) {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (next.every(Boolean)) void submit(next.join(""));
  }

  function onChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return setAt(index, "");
    if (clean.length > 1) return fill(clean, index);
    setAt(index, clean);
    cells.current[index + 1]?.focus();
  }

  function fill(text: string, from = 0) {
    const next = [...digits];
    text.replace(/\D/g, "").slice(0, LENGTH - from).split("").forEach((d, i) => (next[from + i] = d));
    setDigits(next);
    cells.current[Math.min(from + text.replace(/\D/g, "").length, LENGTH - 1)]?.focus();
    if (next.every(Boolean)) void submit(next.join(""));
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      cells.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      cells.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      cells.current[index + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    fill(e.clipboardData.getData("text"));
  }

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const result = await apiFetch<{ sent: boolean }>("/api/client/auth/resend-code", { method: "POST", signal: AbortSignal.timeout(20000) });
      if (isApiSuccess(result)) {
        setCooldown(RESEND_COOLDOWN);
        setInfo(result.data.sent ? "A new code is on its way. The old one no longer works." : "We couldn't send the email just now. Please try again in a minute, or contact your account manager.");
        setDigits(Array(LENGTH).fill(""));
        cells.current[0]?.focus();
      } else {
        setError(result.message);
        const wait = /(\d+) seconds/.exec(result.message);
        if (wait) setCooldown(Number(wait[1]));
      }
    } catch {
      setError("We couldn't send a new code. Please check your connection and try again.");
    }
    setResending(false);
  }

  if (verified) {
    return (
      <div className={own.done} role="status">
        <span className={own.doneIcon}><CheckCircle2 size={34} strokeWidth={1.75} aria-hidden="true" /></span>
        Email verified
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <p className={own.sentTo}>We emailed a 6-digit code to <strong>{maskedEmail}</strong>. It works for 10 minutes.</p>
      <div className={own.codeRow} data-error={error ? "true" : undefined} role="group" aria-label="Verification code">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              cells.current[i] = el;
            }}
            className={own.cell}
            style={{ "--i": i } as React.CSSProperties}
            value={digit}
            data-filled={digit ? "true" : undefined}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? LENGTH : 1}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            aria-invalid={error ? true : undefined}
            disabled={busy}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
          />
        ))}
      </div>
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      {info ? <p role="status" className={styles.notice}>{info}</p> : null}
      <div className={own.footer}>
        <span>Didn&apos;t get it? Check your spam folder.</span>
        <button type="button" className={styles.linkButton} onClick={resend} disabled={cooldown > 0 || resending}>
          <RotateCw size={14} strokeWidth={2} aria-hidden="true" />
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
      {busy ? <p className={styles.hint} role="status">Checking your code…</p> : null}
    </div>
  );
}
