"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, ChevronRight, FileText, LayoutGrid, MessageSquare, PencilLine, X } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { CREATIVE_STATUS_LABEL, type StoredFile } from "@/lib/client-options";
import { fmtDay, fmtMoment } from "@/lib/client-format";
import { todayKey } from "@/lib/client-options";
import type { ClientThreadMessage } from "@/server/db/schema";
import { StatusPill, type PillTone } from "./StatusPill";
import styles from "./Dashboard.module.css";
import portal from "./Portal.module.css";

export type ContentItem = {
  id: string; title: string; type: string; platform: string | null; scheduledFor: string | null; caption: string | null; file: StoredFile | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION" | "DRAFT"; version: number; thread: ClientThreadMessage[];
};

const TONE: Record<string, PillTone> = { PENDING: "warn", APPROVED: "ok", REJECTED: "bad", REVISION: "info", DRAFT: "neutral" };
type Filter = "ALL" | "PENDING" | "APPROVED" | "CHANGES";
const FILTERS: { key: Filter; label: string }[] = [{ key: "ALL", label: "All" }, { key: "PENDING", label: "Needs your approval" }, { key: "APPROVED", label: "Approved" }, { key: "CHANGES", label: "Changes / rejected" }];
const inFilter = (i: ContentItem, f: Filter) => f === "ALL" || (f === "CHANGES" ? i.status === "REVISION" || i.status === "REJECTED" : i.status === f);

function Media({ file, title }: { file: StoredFile | null; title: string }) {
  if (!file) return <div className={portal.media}><span className={portal.mediaEmpty}><FileText size={34} strokeWidth={1.5} aria-hidden="true" /></span></div>;
  const isVideo = file.resourceType === "video";
  const isImage = file.resourceType === "image" && file.format !== "pdf";
  return (
    <div className={portal.media}>
      {isVideo ? <video src={file.url} controls preload="metadata" aria-label={title} /> : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a Cloudinary delivery URL
        <img src={file.url} alt={title} loading="lazy" />
      ) : <a href={file.url} target="_blank" rel="noopener noreferrer" className={portal.mediaEmpty} aria-label={`Open ${file.name}`}><FileText size={34} strokeWidth={1.5} aria-hidden="true" /></a>}
    </div>
  );
}

/** Approve, ask for changes or reject one item awaiting a decision. Changes and rejection need a reason; the server enforces the same. */
function DecisionPanel({ item }: { item: ContentItem }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "REVISION" | "REJECTED">(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function send(decision: "APPROVED" | "REVISION" | "REJECTED", e?: FormEvent) {
    e?.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch(`/api/client/creatives/${item.id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, message }), signal: AbortSignal.timeout(20000) });
      if (isApiSuccess(result)) router.refresh();
      else setError(Object.values(result.error.fields ?? {})[0] ?? result.message);
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <div className={portal.decide}>
      {mode ? (
        <form onSubmit={(e) => send(mode, e)} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className={portal.label} htmlFor={`m-${item.id}`}>{mode === "REVISION" ? "What would you like changed?" : "Why is this being rejected?"}</label>
          <textarea id={`m-${item.id}`} className={portal.field} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} autoFocus />
          <div className={portal.formRow}>
            <button type="button" className={`${portal.btn} ${portal.btnSm}`} onClick={() => { setMode(null); setError(null); }}>Back</button>
            <button type="submit" className={`${portal.btn} ${portal.btnSm} ${portal.btnPrimary}`} disabled={busy || !message.trim()}>{busy ? "Sending…" : mode === "REVISION" ? "Send request" : "Reject"}</button>
          </div>
        </form>
      ) : (
        <div className={portal.decideBtns}>
          <button type="button" className={`${portal.btn} ${portal.btnOk}`} disabled={busy} onClick={() => void send("APPROVED")}><Check size={17} strokeWidth={2.4} aria-hidden="true" />{busy ? "Approving…" : "Approve"}</button>
          <div className={portal.formRow}>
            <button type="button" className={portal.btn} disabled={busy} onClick={() => setMode("REVISION")}><PencilLine size={16} aria-hidden="true" />Request changes</button>
            <button type="button" className={`${portal.btn} ${portal.btnDanger}`} disabled={busy} onClick={() => setMode("REJECTED")}><X size={16} aria-hidden="true" />Reject</button>
          </div>
        </div>
      )}
      {error ? <p role="alert" className={portal.errorText}>{error}</p> : null}
    </div>
  );
}

function Card({ item, index, flash }: { item: ContentItem; index: number; flash: boolean }) {
  const pending = item.status === "PENDING";
  return (
    <article id={`c-${item.id}`} className={portal.cc} data-pending={pending || undefined} style={{ "--i": index, ...(flash ? { outline: "3px solid rgba(0, 88, 200, 0.45)", outlineOffset: 3 } : {}) } as CSSProperties}>
      <Media file={item.file} title={item.title} />
      <div className={portal.ccBody}>
        <span className={portal.ccMeta}>
          <StatusPill label={CREATIVE_STATUS_LABEL[item.status]} tone={TONE[item.status]} live={pending} />
          <span>{[item.type, item.platform].filter(Boolean).join(" · ")}</span>
        </span>
        <h3 className={portal.ccTitle}>{item.title}{item.version > 1 ? <span className={portal.muted}> · v{item.version}</span> : null}</h3>
        {item.scheduledFor ? <span className={portal.ccMeta}><span className={portal.inl}><CalendarDays size={13} aria-hidden="true" />Goes live {fmtDay(item.scheduledFor)}</span></span> : null}
        {item.caption ? <p className={portal.caption}>{item.caption}</p> : null}
        {item.thread.length ? (
          <details>
            <summary className={portal.todoLink} style={{ cursor: "pointer" }}><MessageSquare size={14} aria-hidden="true" />Conversation ({item.thread.length})</summary>
            <div className={portal.thread} style={{ marginTop: 10 }}>
              {item.thread.map((m) => (
                <div key={m.id} className={portal.msg} data-mine={m.by === "client"}>
                  <span className={portal.msgMeta}>{m.by === "client" ? "You" : "SMASH"} · {fmtMoment(m.at)}</span>
                  {m.message}
                </div>
              ))}
            </div>
          </details>
        ) : null}
        {pending ? <DecisionPanel item={item} /> : null}
      </div>
    </article>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Calendar({ items, onPick }: { items: ContentItem[]; onPick: (id: string) => void }) {
  const first = items.find((i) => i.scheduledFor)?.scheduledFor ?? todayKey();
  const [cursor, setCursor] = useState(() => ({ y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 }));
  const today = todayKey();
  const days = useMemo(() => {
    const start = new Date(Date.UTC(cursor.y, cursor.m, 1));
    const lead = (start.getUTCDay() + 6) % 7; // weeks start on Monday
    return Array.from({ length: 42 }, (_, i) => new Date(Date.UTC(cursor.y, cursor.m, 1 - lead + i)));
  }, [cursor]);
  const by = useMemo(() => { const map = new Map<string, ContentItem[]>(); for (const i of items) if (i.scheduledFor) map.set(i.scheduledFor, [...(map.get(i.scheduledFor) ?? []), i]); return map; }, [items]);
  const move = (d: number) => setCursor(({ y, m }) => { const next = new Date(Date.UTC(y, m + d, 1)); return { y: next.getUTCFullYear(), m: next.getUTCMonth() }; });
  const unscheduled = items.filter((i) => !i.scheduledFor).length;

  return (
    <div className={portal.cal}>
      <div className={portal.calHead}>
        <h3 className={portal.calTitle}>{MONTHS[cursor.m]} {cursor.y}</h3>
        <span className={portal.calNav}>
          <button type="button" className={`${portal.btn} ${portal.btnSm}`} onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={16} aria-hidden="true" /></button>
          <button type="button" className={`${portal.btn} ${portal.btnSm}`} onClick={() => move(1)} aria-label="Next month"><ChevronRight size={16} aria-hidden="true" /></button>
        </span>
      </div>
      <div className={portal.calGrid}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className={portal.calDow}>{d}</span>)}
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const list = by.get(key) ?? [];
          return (
            <div key={key} className={portal.calDay} data-out={d.getUTCMonth() !== cursor.m || undefined} data-today={key === today || undefined}>
              <span className={portal.calNum}>{d.getUTCDate()}</span>
              {list.slice(0, 3).map((i) => <button key={i.id} type="button" className={portal.calItem} data-tone={TONE[i.status]} title={`${i.title} — ${CREATIVE_STATUS_LABEL[i.status]}`} onClick={() => onPick(i.id)}>{i.title}</button>)}
              {list.length > 3 ? <span className={portal.muted} style={{ fontSize: "0.6875rem" }}>+{list.length - 3} more</span> : null}
            </div>
          );
        })}
      </div>
      {unscheduled ? <p className={portal.lead} style={{ margin: "14px 0 0" }}>{unscheduled} item{unscheduled === 1 ? "" : "s"} without a go-live date are not on the calendar.</p> : null}
    </div>
  );
}

/** Content for approval: the cards (with approve / request changes / reject) and a month calendar of what goes live when. */
export function ContentBoard({ items }: { items: ContentItem[] }) {
  const [filter, setFilter] = useState<Filter>(items.some((i) => i.status === "PENDING") ? "PENDING" : "ALL");
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [flash, setFlash] = useState<string | null>(null);
  const shown = items.filter((i) => inFilter(i, filter));
  const count = (f: Filter) => items.filter((i) => inFilter(i, f)).length;

  useEffect(() => {
    if (!flash || view !== "cards") return;
    document.getElementById(`c-${flash}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash, view]);

  return (
    <>
      <div className={portal.contentBar}>
        <div className={styles.tabs} role="group" aria-label="Filter content">
          {FILTERS.map((f) => <button key={f.key} type="button" className={styles.tab} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}<span className={styles.tabCount}>{count(f.key)}</span></button>)}
        </div>
        <div className={portal.views} role="group" aria-label="View">
          <button type="button" className={styles.tab} aria-pressed={view === "cards"} onClick={() => setView("cards")}><LayoutGrid size={15} aria-hidden="true" />Cards</button>
          <button type="button" className={styles.tab} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}><CalendarDays size={15} aria-hidden="true" />Calendar</button>
        </div>
      </div>
      {view === "calendar" ? (
        <Calendar items={shown} onPick={(id) => { setView("cards"); setFlash(id); setFilter("ALL"); }} />
      ) : shown.length === 0 ? (
        <div className={styles.empty}><h2 className={styles.emptyTitle}>Nothing here</h2><p className={styles.emptyText}>No content matches this filter.</p></div>
      ) : (
        <div className={portal.contentGrid}>{shown.map((item, i) => <Card key={`${filter}-${item.id}`} item={item} index={i} flash={flash === item.id} />)}</div>
      )}
    </>
  );
}
