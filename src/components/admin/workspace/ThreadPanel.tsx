"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { TICKET_STATUSES, TICKET_STATUS_LABEL } from "@/lib/client-options";
import type { ClientThreadMessage } from "@/server/db/schema";
import { AdminButton } from "../AdminButton";
import { AdminEmptyState } from "../AdminEmptyState";
import { MessageSquare } from "lucide-react";
import clients from "../AdminClients.module.css";
import styles from "./Workspace.module.css";
import { fmtMoment } from "./format";

/** The conversation on a content item or a ticket, with a reply box. A reply on a ticket can move its status at the same time. */
export function ThreadPanel({ accountId, kind, recordId, thread, status }: { accountId: string; kind: "creatives" | "tickets"; recordId: string; thread: ClientThreadMessage[]; status?: string }) {
  const router = useRouter();
  const id = useId();
  const [text, setText] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch(`/api/admin/client-accounts/${accountId}/records/${kind}/${recordId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, ...(next ? { status: next } : {}) }), signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) { setText(""); setNext(""); router.refresh(); }
      else setError(Object.values(result.error.fields ?? {})[0] ?? result.message);
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <section className={styles.thread} aria-label="Conversation">
      <h3 className={styles.threadTitle}>Conversation</h3>
      {thread.length === 0 ? (
        <AdminEmptyState bare icon={MessageSquare} message={kind === "creatives" ? "No feedback yet. The client's comments and your replies appear here." : "No messages yet."} />
      ) : (
        <div className={styles.msgs}>
          {thread.map((m) => (
            <div key={m.id} className={`${styles.msg}${m.by === "admin" ? ` ${styles.mine}` : ""}`}>
              <span className={styles.msgMeta}>{m.by === "admin" ? "SMASH" : "Client"} · {m.name} · {fmtMoment(m.at)}</span>
              {m.message}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={send} className={styles.reply}>
        <label htmlFor={id} className="sr-only">Reply</label>
        <textarea id={id} className={clients.textarea} rows={3} placeholder="Write a reply…" value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} />
        <div className={styles.replyRow}>
          {kind === "tickets" ? (
            <select className={clients.select} style={{ width: "auto", minHeight: 40 }} value={next} onChange={(e) => setNext(e.target.value)} aria-label="Set status with this reply">
              <option value="">{status ? `Keep status (${TICKET_STATUS_LABEL[status as keyof typeof TICKET_STATUS_LABEL] ?? status})` : "Keep status"}</option>
              {TICKET_STATUSES.map((s) => <option key={s} value={s}>Set to {TICKET_STATUS_LABEL[s]}</option>)}
            </select>
          ) : <span />}
          <AdminButton type="submit" size="sm" loading={busy} disabled={!text.trim()}><Send size={15} strokeWidth={2} aria-hidden="true" />Send reply</AdminButton>
        </div>
        {error ? <p className={clients.fieldError} role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
