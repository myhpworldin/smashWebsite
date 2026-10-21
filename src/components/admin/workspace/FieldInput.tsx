"use client";

import { useId } from "react";
import type { CSSProperties } from "react";
import type { FieldDef, FieldValue, Values } from "./fields";
import { FileUpload } from "./FileUpload";
import clients from "../AdminClients.module.css";
import styles from "./Workspace.module.css";

/** One labelled form control, rendered from its definition. Shared by the record drawers and the workspace section editors so every form looks and behaves alike. */
export function FieldInput({ field, values, onChange, error, accountId, currency }: { field: FieldDef; values: Values; onChange: (name: string, value: FieldValue) => void; error?: string; accountId: string; currency?: string }) {
  const id = useId();
  const value = values[field.name];
  const common = { id, name: field.name, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-e` : undefined };
  const label = field.type === "money" && currency ? `${field.label} (${currency})` : field.label;
  const text = typeof value === "string" ? value : "";

  let control;
  switch (field.type) {
    case "textarea":
      control = <textarea {...common} className={clients.textarea} rows={field.rows ?? 4} maxLength={field.maxLength} placeholder={field.placeholder} value={text} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case "select":
      control = (
        <select {...common} className={clients.select} value={text} onChange={(e) => onChange(field.name, e.target.value)}>
          {!field.required ? <option value="">{field.placeholder ?? "—"}</option> : null}
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          {field.groups?.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>)}
          {text && !field.options?.some((o) => o.value === text) && !field.groups?.some((g) => g.options.includes(text)) ? <option value={text}>{text}</option> : null}
        </select>
      );
      break;
    case "date":
      control = <input {...common} type="date" className={clients.input} value={text} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case "datetime":
      control = <input {...common} type="datetime-local" className={clients.input} value={text} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case "number":
    case "money":
      control = <input {...common} className={clients.input} inputMode={field.type === "money" ? "decimal" : "numeric"} placeholder={field.placeholder ?? "0"} value={text} onChange={(e) => onChange(field.name, e.target.value)} />;
      break;
    case "file":
      control = <FileUpload accountId={accountId} kind={field.uploadKind ?? "creative"} value={typeof value === "object" ? (value as never) : null} onChange={(f) => onChange(field.name, f)} error={error} />;
      break;
    case "checkbox":
      control = (
        <label className={clients.checkbox}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(field.name, e.target.checked)} />
          <span>{field.label}{field.hint ? <small>{field.hint}</small> : null}</span>
        </label>
      );
      break;
    default: {
      const listId = field.suggestions ? `${id}-list` : undefined;
      control = (
        <>
          <input {...common} className={clients.input} type="text" list={listId} maxLength={field.maxLength} placeholder={field.type === "tags" ? field.placeholder ?? "Separate with commas" : field.placeholder} value={text} onChange={(e) => onChange(field.name, e.target.value)} />
          {listId ? <datalist id={listId}>{field.suggestions?.map((s) => <option key={s} value={s} />)}</datalist> : null}
        </>
      );
    }
  }

  return (
    <div className={`${clients.field} ${styles.span}`} style={{ "--span": field.span ?? 2 } as CSSProperties}>
      {field.type === "checkbox" ? null : <label htmlFor={id} className={clients.label}>{label}{field.required ? <span className={styles.req} aria-hidden="true"> *</span> : null}</label>}
      {control}
      {error && field.type !== "file" ? <p id={`${id}-e`} className={clients.fieldError}>{error}</p> : field.hint && field.type !== "checkbox" ? <p className={clients.help}>{field.hint}</p> : null}
    </div>
  );
}
