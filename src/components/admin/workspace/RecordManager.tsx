"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import type { ClientThreadMessage } from "@/server/db/schema";
import { AdminButton } from "../AdminButton";
import { AdminCard } from "../AdminCard";
import { AdminDrawer } from "../AdminDrawer";
import { AdminEmptyState } from "../AdminEmptyState";
import clients from "../AdminClients.module.css";
import { FieldInput } from "./FieldInput";
import { fieldErrors, initialValues, toPayload, type FieldValue, type Values } from "./fields";
import { RECORD_CONFIGS, type RecordContext, type Row } from "./record-configs";
import { ThreadPanel } from "./ThreadPanel";
import styles from "./Workspace.module.css";

type Kind = keyof typeof RECORD_CONFIGS;

/**
 * One tab's list of records with add / edit / delete. What a row looks like and which fields it has come from `record-configs`; this
 * component only runs the table, the slide-in form and the three API calls. Saving refreshes the server-rendered page, so the list,
 * the tab badges and the overview always agree with what is stored.
 */
export function RecordManager({ accountId, kind, rows, context }: { accountId: string; kind: Kind; rows: Row[]; context: RecordContext }) {
  const config = RECORD_CONFIGS[kind];
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  const fields = useMemo(() => config.fields(context), [config, context]);
  const columns = useMemo(() => config.columns(context), [config, context]);
  const summary = config.summary?.(rows, context);
  const current = editingId && editingId !== "new" ? rows.find((r) => r.id === editingId) ?? null : null;
  const creating = editingId === "new";
  const visible = fields.filter((f) => (!f.when || f.when(values)) && (!f.createOnly || creating));

  const close = useCallback(() => { setEditingId(null); setError(null); setErrors({}); }, []);
  const open = (row: Row | null) => {
    const seed = initialValues(fields, row);
    if (!row) for (const [k, v] of Object.entries(config.defaults?.() ?? {})) seed[k] = v;
    setValues(seed);
    setError(null);
    setErrors({});
    setEditingId(row ? row.id : "new");
  };
  const set = (name: string, value: FieldValue) => setValues((v) => ({ ...v, [name]: value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setErrors({});
    const base = `/api/admin/client-accounts/${accountId}/records/${kind}`;
    try {
      const result = await apiFetch(creating ? base : `${base}/${editingId}`, {
        method: creating ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(fields.filter((f) => !f.createOnly || creating), values)), signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) { router.refresh(); close(); }
      else { setErrors(fieldErrors(result.error.fields)); setError(result.error.fields ? "Please fix the highlighted fields." : result.message); }
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false;
    setBusy(false);
  }

  async function remove(row: Row) {
    if (!window.confirm(`Delete this ${config.singular}? This cannot be undone.`)) return;
    const result = await apiFetch(`/api/admin/client-accounts/${accountId}/records/${kind}/${row.id}`, { method: "DELETE", signal: AbortSignal.timeout(30000) }).catch(() => null);
    if (result && isApiSuccess(result)) router.refresh();
    else window.alert(`The ${config.singular} could not be deleted. Please try again.`);
  }

  const Icon = config.icon;
  const notice = creating ? config.notice?.(rows, context) : null;

  return (
    <>
      <div className={styles.listHead}>
        <div>
          <h2 className={styles.listTitle}>{config.title}</h2>
          <p className={styles.listSub}>{config.subtitle}</p>
        </div>
        <AdminButton onClick={() => open(null)}><Plus size={16} strokeWidth={2} aria-hidden="true" />Add {config.singular}</AdminButton>
      </div>

      {summary && rows.length ? (
        <div className={styles.summary}>
          {summary.map((s) => <div key={s.label} className={styles.summaryItem}><b>{s.value}</b><span>{s.label}</span></div>)}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <AdminEmptyState icon={Icon} title={config.emptyTitle} message={config.emptyText} action={<AdminButton size="sm" onClick={() => open(null)}><Plus size={15} strokeWidth={2} aria-hidden="true" />Add {config.singular}</AdminButton>} />
      ) : (
        <AdminCard flush reveal>
          <div className={clients.tableWrap}>
            <table className={clients.table}>
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.header} className={c.num ? styles.num : undefined}>{c.header}</th>)}
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                    {columns.map((c, ci) => (
                      <td key={c.header} className={c.num ? styles.num : undefined}>
                        {ci === 0 ? <button type="button" className={clients.rowLink} style={{ background: "none", border: 0, padding: 0, textAlign: "left", font: "inherit", cursor: "pointer" }} onClick={() => open(row)}>{c.cell(row)}</button> : c.cell(row)}
                      </td>
                    ))}
                    <td>
                      <span className={styles.rowActions}>
                        <button type="button" className={styles.iconBtnSm} onClick={() => open(row)} aria-label={`Edit ${config.singular}`}><Pencil size={15} aria-hidden="true" /></button>
                        <button type="button" className={`${styles.iconBtnSm} ${styles.danger}`} onClick={() => void remove(row)} aria-label={`Delete ${config.singular}`}><Trash2 size={15} aria-hidden="true" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      )}

      <AdminDrawer
        open={editingId !== null}
        onClose={close}
        wide={!!config.hasThread}
        title={creating ? `Add ${config.singular}` : `Edit ${config.singular}`}
        subtitle={creating ? "It is saved to this client only." : undefined}
        footer={
          <>
            <AdminButton variant="ghost" onClick={close}>Cancel</AdminButton>
            <AdminButton type="submit" form="record-form" loading={busy}>{creating ? `Add ${config.singular}` : "Save changes"}</AdminButton>
          </>
        }
      >
        <form id="record-form" onSubmit={save} noValidate className={styles.form} aria-label={config.singular}>
          {notice ? <p className={`${clients.alert} ${clients.alertWarn} ${styles.formAlert}`}>{notice}</p> : null}
          {visible.map((f) => <FieldInput key={f.name} field={f} values={values} onChange={set} error={errors[f.name]} accountId={accountId} currency={context.currency} />)}
          {error ? <p role="alert" className={`${clients.alert} ${clients.alertError} ${styles.formAlert}`}>{error}</p> : null}
        </form>
        {config.hasThread && current ? (
          <div style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid var(--admin-border)" }}>
            <ThreadPanel accountId={accountId} kind={kind as "creatives" | "tickets"} recordId={current.id} thread={(current.thread as ClientThreadMessage[]) ?? []} status={typeof current.status === "string" ? current.status : undefined} />
          </div>
        ) : null}
      </AdminDrawer>
    </>
  );
}
