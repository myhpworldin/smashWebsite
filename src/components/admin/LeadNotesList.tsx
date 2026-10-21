import type { LeadActivityRow } from "@/server/modules/leads/lead-activity.service";
import { StickyNote } from "lucide-react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import styles from "./LeadNotesList.module.css";

const formatDateTime = (value: Date) => value.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Internal notes (CRM Phase 6, Step 15) — newest first, so the latest context is immediately visible.
 * Notes are stored as `lead_activity` rows (`type: "NOTE_ADDED"`), the same collection the timeline
 * reads — this just filters and reverses the list the page already fetched, not a second query.
 * Visually distinct from the lead's own submitted data (a shaded card, explicit author/timestamp) so
 * an internal note can never be mistaken for something the lead actually said.
 */
export function LeadNotesList({ entries }: { entries: LeadActivityRow[] }) {
  const notes = entries.filter((entry) => entry.type === "NOTE_ADDED").slice().reverse();
  if (!notes.length) return <AdminEmptyState bare icon={StickyNote} message="No notes yet." />;
  return (
    <div className={styles.list}>
      {notes.map((note) => (
        <div key={note.id} className={styles.note}>
          <div className={styles.meta}>
            <span className={styles.author}>{note.actor ?? "Unknown"}</span>
            <time dateTime={note.createdAt.toISOString()}>{formatDateTime(note.createdAt)}</time>
          </div>
          <p className={styles.content}>{note.message}</p>
        </div>
      ))}
    </div>
  );
}
