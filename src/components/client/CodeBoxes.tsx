"use client";

import { useEffect, useRef, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import styles from "./VerifyEmailForm.module.css";

const LENGTH = 6;

/**
 * Six boxes that behave as one 6-digit field: typing advances, backspace goes back, arrow keys move, a pasted code fills them all,
 * and `onComplete` fires the moment the sixth digit lands. The parent owns the value (clear it to start over) and `invalid` shakes
 * the row. Same look as the first-login email verification.
 */
export function CodeBoxes({ value, onChange, onComplete, disabled, invalid, autoFocus, label = "Verification code" }: { value: string; onChange: (value: string) => void; onComplete: (code: string) => void; disabled?: boolean; invalid?: boolean; autoFocus?: boolean; label?: string }) {
  const cells = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) cells.current[0]?.focus();
  }, [autoFocus]);
  // Cleared by the parent after a wrong code: put the cursor back on the first box.
  useEffect(() => {
    if (value === "" && !disabled) cells.current[0]?.focus();
  }, [value, disabled]);

  function commit(next: string[], focus: number) {
    const joined = next.join("");
    onChange(joined);
    cells.current[Math.min(focus, LENGTH - 1)]?.focus();
    if (joined.length === LENGTH) onComplete(joined);
  }

  function onInput(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    const next = [...digits];
    if (!clean) {
      next[index] = "";
      return onChange(next.join("").slice(0, LENGTH));
    }
    // More than one digit at once (autofill, a one-time-code suggestion, a paste) fills from this box.
    clean.slice(0, LENGTH - index).split("").forEach((d, i) => (next[index + i] = d));
    commit(next, index + clean.length);
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) cells.current[index - 1]?.focus();
    else if (e.key === "ArrowLeft" && index > 0) cells.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < LENGTH - 1) cells.current[index + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    commit(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ""), pasted.length);
  }

  return (
    <div className={styles.codeRow} data-error={invalid ? "true" : undefined} role="group" aria-label={label}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            cells.current[i] = el;
          }}
          className={styles.cell}
          style={{ "--i": i } as CSSProperties}
          value={digit}
          data-filled={digit ? "true" : undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? LENGTH : 1}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={invalid ? true : undefined}
          disabled={disabled}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.currentTarget.select()}
        />
      ))}
    </div>
  );
}
