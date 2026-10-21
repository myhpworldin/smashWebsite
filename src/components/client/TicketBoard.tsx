"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Send } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { TICKET_KINDS, TICKET_KIND_LABEL, TICKET_PRIORITIES, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL } from "@/lib/client-options";
import { ago, fmtMoment } from "@/lib/client-format";
import type { ClientThreadMessage } from "@/server/db/schema";
import { StatusPill, type PillTone } from "./StatusPill";
import styles from "./Dashboard.module.css";
import portal from "./Portal.module.css";

export type TicketItem = { id: string; subject: string; kind: string; priority: string; status: string; thread: ClientThreadMessage[]; lastMessageBy: "client" | "admin"; lastMessageAt: string };
const TONE: Record<string, PillTone> = { OPEN: "warn", IN_PROGRESS: "info", RESOLVED: "ok", CLOSED: "neutral" };

function NewTicket() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [kind, setKind] = useState("support");
  const [priority, setPriority] = useState("MEDIUM");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null); setFields({});
    try {
      const result = await apiFetch("/api/client/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, kind, priority, message }), signal: AbortSignal.timeout(20000) });
      if (isApiSuccess(result)) { setSubject(""); setMessage(""); setOpen(false); router.refresh(); }
      else { setFields(result.error.fields ?? {}); setError(result.error.fields ? null : result.message); }
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false;
    setBusy(false);
  }

  if (!open) return <button type="button" className={`${portal.btn} ${portal.btnPrimary}`} onClick={() => setOpen(true)}><Plus size={16} strokeWidth={2.2} aria-hidden="true" />New ticket</button>;
  return (
    <form onSubmit={submit} className={`${styles.card} ${portal.stack}`} aria-label="New ticket" style={{ gap: 14 }}>
      <h3 className={styles.cardTitle}>How can we help?</h3>
      <div>
        <label className={portal.label} htmlFor="t-subject">Subject</label>
        <input id="t-subject" className={portal.input} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} autoFocus />
        {fields.subject ? <p className={portal.errorText}>{fields.subject}</p> : null}
      </div>
      <div className={portal.formRow}>
        <div><label className={portal.label} htmlFor="t-kind">Type</label><select id="t-kind" className={portal.input} value={kind} onChange={(e) => setKind(e.target.value)}>{TICKET_KINDS.map((k) => <option key={k} value={k}>{TICKET_KIND_LABEL[k]}</option>)}</select></div>
        <div><label className={portal.label} htmlFor="t-priority">Priority</label><select id="t-priority" className={portal.input} value={priority} onChange={(e) => setPriority(e.target.value)}>{TICKET_PRIORITIES.map((p) => <option key={p} value={p}>{TICKET_PRIORITY_LABEL[p]}</option>)}</select></div>
      </div>
      <div>
        <label className={portal.label} htmlFor="t-message">Message</label>
        <textarea id="t-message" className={portal.field} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={4} />
        {fields.message ? <p className={portal.errorText}>{fields.message}</p> : null}
      </div>
      {error ? <p role="alert" className={portal.errorText}>{error}</p> : null}
      <div className={portal.formRow}>
        <button type="button" className={portal.btn} onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className={`${portal.btn} ${portal.btnPrimary}`} disabled={busy}>{busy ? "Sending…" : "Send"}</button>
      </div>
    </form>
  );
}

function Reply({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const result = await apiFetch(`/api/client/tickets/${id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }), signal: AbortSignal.timeout(20000) });
      if (isApiSuccess(result)) { setText(""); router.refresh(); } else setError(result.message);
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false; setBusy(false);
  }
  return (
    <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label className="sr-only" htmlFor={`r-${id}`}>Reply</label>
      <textarea id={`r-${id}`} className={portal.field} rows={3} placeholder="Write a reply…" value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} />
      {error ? <p role="alert" className={portal.errorText}>{error}</p> : null}
      <button type="submit" className={`${portal.btn} ${portal.btnSm} ${portal.btnPrimary}`} style={{ alignSelf: "flex-end" }} disabled={busy || !text.trim()}><Send size={14} aria-hidden="true" />{busy ? "Sending…" : "Send reply"}</button>
    </form>
  );
}

/** The client's tickets and requests: a list that opens into the conversation with a reply box, and a form to raise a new one. */
export function TicketBoard({ tickets }: { tickets: TicketItem[] }) {
  return (
    <div className={portal.stack}>
      <div><NewTicket /></div>
      {tickets.length === 0 ? (
        <div className={styles.empty}><h2 className={styles.emptyTitle}>No tickets yet</h2><p className={styles.emptyText}>Ask a question or make a request and your account team will reply here.</p></div>
      ) : (
        <div className={`${styles.card} ${styles.tableCard}`}>
          {tickets.map((t) => (
            <details key={t.id} className={portal.ticket} open={t.status === "OPEN" && t.lastMessageBy === "admin" ? true : undefined}>
              <summary>
                <span className={portal.ticketTitle}>{t.subject}<small>{TICKET_KIND_LABEL[t.kind as keyof typeof TICKET_KIND_LABEL]} · {ago(t.lastMessageAt)}{t.lastMessageBy === "admin" ? " · reply from SMASH" : ""}</small></span>
                <StatusPill label={TICKET_STATUS_LABEL[t.status as keyof typeof TICKET_STATUS_LABEL]} tone={TONE[t.status]} live={t.status === "OPEN" && t.lastMessageBy === "admin"} />
                <ChevronDown size={18} className={portal.chev} aria-hidden="true" />
              </summary>
              <div className={portal.ticketBody}>
                <div className={portal.thread}>
                  {t.thread.map((m) => (
                    <div key={m.id} className={portal.msg} data-mine={m.by === "client"}>
                      <span className={portal.msgMeta}>{m.by === "client" ? "You" : "SMASH"} · {fmtMoment(m.at)}</span>
                      {m.message}
                    </div>
                  ))}
                </div>
                {t.status === "CLOSED" ? <p className={portal.muted} style={{ margin: 0, fontSize: "0.875rem" }}>This ticket is closed. Open a new one if you need more help.</p> : <Reply id={t.id} />}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
