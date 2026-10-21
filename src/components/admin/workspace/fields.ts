import type { StoredFile } from "@/lib/client-options";
import type { UploadKind } from "@/server/lib/upload-kinds";

/** What a form field can hold while it is being edited: text (numbers too, so a half-typed "1,2" never becomes NaN), a file, a flag. */
export type FieldValue = string | boolean | StoredFile | null;
export type Values = Record<string, FieldValue>;

export type FieldType = "text" | "textarea" | "select" | "date" | "datetime" | "number" | "money" | "tags" | "file" | "checkbox";
export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly { value: string; label: string }[];
  /** A select's options under headings, shown after `options`. A stored value that no option matches stays selectable, so editing never blanks it. */
  groups?: readonly { label: string; options: readonly string[] }[];
  placeholder?: string;
  hint?: string;
  /** How many columns the field spans: of 4 in a drawer form (default 2), of 12 in a row of a list editor (default 3). */
  span?: number;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  /** What an empty number/money field is sent as: `0` for required amounts, `null` (the default) for optional ones. */
  emptyAs?: "zero" | "null";
  uploadKind?: UploadKind;
  /** Only shown (and sent) when adding, not when editing. */
  createOnly?: boolean;
  /** Hidden (and not sent) unless this returns true for the current values. */
  when?: (values: Values) => boolean;
  /** Offered as type-ahead suggestions on a text field. */
  suggestions?: readonly string[];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** An ISO moment → the `YYYY-MM-DDTHH:mm` a datetime-local input wants, in the viewer's own zone. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const localInputToIso = (local: string): string => (local ? new Date(local).toISOString() : "");

const numText = (n: unknown) => (typeof n === "number" && n !== 0 ? String(n) : typeof n === "number" ? "0" : "");

/** Stored row → the strings the form edits. */
export function initialValues(fields: readonly FieldDef[], row: Record<string, unknown> | null): Values {
  const values: Values = {};
  for (const f of fields) {
    const raw = row?.[f.name];
    switch (f.type) {
      case "checkbox": values[f.name] = !!raw; break;
      case "file": values[f.name] = (raw as StoredFile | null | undefined) ?? null; break;
      case "tags": values[f.name] = Array.isArray(raw) ? raw.join(", ") : ""; break;
      case "datetime": values[f.name] = isoToLocalInput(raw as string | null); break;
      case "number": case "money": values[f.name] = row ? numText(raw) : ""; break;
      default: values[f.name] = typeof raw === "string" ? raw : f.options && !f.required && !row ? "" : f.options && !row ? f.options[0]?.value ?? "" : "";
    }
  }
  return values;
}

const parseNumber = (text: string) => Number(text.replace(/[,\s]/g, ""));

/** Edited strings → the object the API expects. Hidden fields are left out. */
export function toPayload(fields: readonly FieldDef[], values: Values): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.when && !f.when(values)) continue;
    const v = values[f.name];
    switch (f.type) {
      case "checkbox": out[f.name] = !!v; break;
      case "file": out[f.name] = (v as StoredFile | null) ?? null; break;
      case "tags": out[f.name] = String(v ?? "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean); break;
      case "datetime": out[f.name] = localInputToIso(String(v ?? "")); break;
      case "number": case "money": { const t = String(v ?? "").trim(); out[f.name] = t === "" ? (f.emptyAs === "zero" ? 0 : null) : parseNumber(t); break; }
      default: out[f.name] = String(v ?? "").trim();
    }
  }
  return out;
}

/** The server's `{ "team.0": "…" }` problems → one message per form field (the first path segment names the field). */
export function fieldErrors(fields: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(fields ?? {})) {
    const key = path.split(".")[0];
    if (!(key in out)) out[key] = message;
  }
  return out;
}
