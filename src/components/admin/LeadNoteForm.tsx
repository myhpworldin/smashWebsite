"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isApiSuccess, postLeadNote, GENERIC_SAVE_ERROR } from "@/components/admin/lead-mutations";
import styles from "./LeadNoteForm.module.css";

const MAX_LENGTH = 2000;

/** Internal note composer (CRM Phase 6, Step 14). The textarea is only cleared once the server has confirmed the note was saved — never optimistically, and never before that confirmation (Step 14: "do not clear the note until the server confirms success"). */
export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const textareaId = useId();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (inFlight.current || !trimmed) return;
    inFlight.current = true;
    setSubmitting(true);
    setFeedback(null);

    let result;
    try {
      result = await postLeadNote(leadId, trimmed);
    } catch {
      inFlight.current = false;
      setSubmitting(false);
      setFeedback({ tone: "error", message: GENERIC_SAVE_ERROR });
      return;
    }
    inFlight.current = false;
    setSubmitting(false);

    if (isApiSuccess(result)) {
      setContent("");
      setFeedback({ tone: "success", message: "Note added." });
      router.refresh();
    } else {
      setFeedback({ tone: "error", message: result.message });
    }
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <label htmlFor={textareaId} className="sr-only">Add a note about this lead</label>
      <textarea
        id={textareaId}
        className={styles.textarea}
        placeholder="Add a note about this lead..."
        value={content}
        maxLength={MAX_LENGTH}
        disabled={submitting}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className={styles.footer}>
        <span className={styles.feedback} data-tone={feedback?.tone} role="status">{feedback?.message}</span>
        <Button type="submit" loading={submitting} disabled={!content.trim()}>Add Note</Button>
      </div>
    </form>
  );
}
