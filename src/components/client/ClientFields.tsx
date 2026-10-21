"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import styles from "./ClientForm.module.css";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & { label: string; error?: string | null; hint?: ReactNode };

/** An email field with the portal's styling. */
export function EmailField({ label, error, hint, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputRow}>
        <Mail size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
        <input id={id} type="email" className={styles.input} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...input} />
      </div>
      {error ? <p id={`${id}-error`} className={styles.fieldError}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}

/** A password field with a show/hide toggle. */
export function PasswordField({ label, error, hint, ...input }: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputRow}>
        <Lock size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
        <input id={id} type={shown ? "text" : "password"} className={styles.input} data-with-toggle="true" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} {...input} />
        <button type="button" className={styles.toggle} onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
          {shown ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className={styles.fieldError}>{error}</p> : hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
