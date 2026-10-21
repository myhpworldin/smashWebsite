"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { AdminButton } from "../AdminButton";
import { AdminCard } from "../AdminCard";
import clients from "../AdminClients.module.css";
import { FieldInput } from "./FieldInput";
import { initialValues, toPayload, type FieldValue, type Values } from "./fields";
import { ago } from "./format";
import { SECTION_CONFIGS, type SectionKey } from "./workspace-configs";
import styles from "./Workspace.module.css";

type Item = { key: string; id?: string; values: Values };
const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()).slice(2));

/**
 * Edits one section of a client's workspace — a single form (profile, account manager, billing plan, terms) or a list of rows (platforms,
 * team, meetings, notifications). Each section saves on its own and shows when it was last saved, so filling in a client's
 * onboarding is a series of small saves, not one long form. What goes where is declared in `workspace-configs`.
 */
export function WorkspaceEditor({ accountId, section, title, hint, value, updatedAt, note, currency }: { accountId: string; section: SectionKey; title: string; hint: string; value: unknown; updatedAt?: string | null; note?: string; currency?: string }) {
  const config = SECTION_CONFIGS[section];
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => (config.kind === "object" ? initialValues(config.fields, (value as Record<string, unknown> | null) ?? null) : {}));
  const [items, setItems] = useState<Item[]>(() =>
    config.kind === "list" ? ((value as Record<string, unknown>[] | null) ?? []).map((row) => ({ key: uid(), id: typeof row.id === "string" ? row.id : undefined, values: initialValues(config.fields, row) })) : []);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  const stamp = updatedAt ? ago(updatedAt) : null;
  const dirty = () => setSaved(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setErrors({});
    setSaved(false);
    let payload: unknown;
    if (config.kind === "object") {
      const blank = config.clearWhenBlank && !String(values[config.clearWhenBlank] ?? "").trim();
      payload = blank ? null : toPayload(config.fields, values);
    } else {
      payload = items.map((it) => ({ ...(it.id ? { id: it.id } : {}), ...toPayload(config.fields, it.values) }));
    }
    try {
      const result = await apiFetch(`/api/admin/client-accounts/${accountId}/workspace`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section, value: payload }), signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) { setSaved(true); router.refresh(); }
      else {
        const fields = result.error.fields;
        if (fields) {
          const mapped: Record<string, string> = {};
          for (const [path, message] of Object.entries(fields)) mapped[path] = message;
          setErrors(mapped);
          setError("Please fix the highlighted fields.");
        } else setError(result.message);
      }
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <AdminCard reveal>
      <div className={styles.sectionHead}>
        <div>
          <h2 className={clients.cardTitle}>{title}</h2>
          <p className={clients.cardHint}>{hint}</p>
        </div>
        <span className={`${styles.stampChip}${stamp ? ` ${styles.fresh}` : ""}`}>{stamp ? `Saved ${stamp}` : "Not set yet"}</span>
      </div>
      {note ? <p className={clients.help} style={{ marginBottom: 14 }}>{note}</p> : null}

      <form onSubmit={save} noValidate aria-label={title}>
        {config.kind === "object" ? (
          <div className={styles.form}>
            {config.fields.map((f) => <FieldInput key={f.name} field={f} values={values} onChange={(n, v: FieldValue) => { setValues((x) => ({ ...x, [n]: v })); dirty(); }} error={errors[f.name]} accountId={accountId} currency={currency} />)}
          </div>
        ) : (
          <>
            <div className={styles.rows}>
              {items.length === 0 ? <p className={clients.help}>{config.emptyText}</p> : null}
              {items.map((it, i) => (
                <div key={it.key} className={styles.rowCard} role="group" aria-label={`${config.itemLabel} ${i + 1}`}>
                  {config.fields.map((f) => (
                    <FieldInput key={f.name} field={{ ...f, span: f.span ?? 3 }} values={it.values} accountId={accountId} currency={currency} error={errors[`${i}.${f.name}`]}
                      onChange={(n, v) => { setItems((list) => list.map((x) => (x.key === it.key ? { ...x, values: { ...x.values, [n]: v } } : x))); dirty(); }} />
                  ))}
                  <button type="button" className={clients.iconBtn} aria-label={`Remove ${config.itemLabel} ${i + 1}`} onClick={() => { setItems((list) => list.filter((x) => x.key !== it.key)); dirty(); }}><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              ))}
            </div>
            <button type="button" className={`${clients.btn} ${clients.btnSmall}`} disabled={items.length >= config.max} onClick={() => { setItems((list) => [...list, { key: uid(), values: Object.assign(initialValues(config.fields, null), config.defaults ?? {}) }]); dirty(); }}>
              <Plus size={15} aria-hidden="true" />{config.addLabel}
            </button>
          </>
        )}
        {error ? <p role="alert" className={`${clients.alert} ${clients.alertError}`} style={{ marginTop: 14 }}>{error}</p> : null}
        <div className={styles.saveRow}>
          <AdminButton type="submit" size="sm" loading={busy}>{config.kind === "object" && config.saveLabel ? config.saveLabel : "Save"}</AdminButton>
          {saved ? <span className={styles.savedNote} role="status">Saved.</span> : null}
        </div>
      </form>
    </AdminCard>
  );
}
