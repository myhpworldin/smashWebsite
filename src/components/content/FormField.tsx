"use client";

import { useId, type ComponentPropsWithoutRef } from "react";
import styles from "./FormField.module.css";

type BaseProps = { label: string; error?: string };
type TextareaProps = BaseProps & { textarea: true; options?: undefined } & ComponentPropsWithoutRef<"textarea">;
type SelectProps = BaseProps & { textarea?: false; options: readonly string[]; placeholder: string } & ComponentPropsWithoutRef<"select">;
type InputProps = BaseProps & { textarea?: false; options?: undefined } & ComponentPropsWithoutRef<"input">;

/** Accessible label + control + error: one shell for text inputs, textareas and selects, so every form field shares the same markup and styling. */
export function FormField(props: TextareaProps | SelectProps | InputProps) {
  const { label, error, textarea, options, ...fieldProps } = props;
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const a11y = { id, "aria-invalid": !!error, "aria-describedby": errorId };
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}{fieldProps.required ? <span aria-hidden="true" className={styles.mark}> *</span> : null}</label>
      {textarea ? (
        <textarea className={`${styles.input} ${styles.textarea}`} {...a11y} {...(fieldProps as ComponentPropsWithoutRef<"textarea">)} />
      ) : options ? (
        <select className={`${styles.input} ${styles.select}`} data-empty={!fieldProps.value || undefined} {...a11y} {...(fieldProps as ComponentPropsWithoutRef<"select">)}>
          <option value="">{(props as SelectProps).placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className={styles.input} {...a11y} {...(fieldProps as ComponentPropsWithoutRef<"input">)} />
      )}
      {error ? <span id={errorId} role="alert" className={styles.error}>{error}</span> : null}
    </div>
  );
}
