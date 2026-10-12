"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { isApiSuccess, patchLead, GENERIC_SAVE_ERROR } from "@/components/admin/lead-mutations";
import styles from "./LeadCrmControls.module.css";

/**
 * Assignment (CRM Phase 6, Step 11). There is still only one seeded admin account and no staff/user
 * directory (Phase 2) — building a dropdown of "eligible users" would mean inventing a fake multi-user
 * system just for this control, which the brief explicitly rules out. Instead: a plain text field (so
 * `assignedTo` stays usable and persisted today) plus an "Assign to me" shortcut using the signed-in
 * admin's own email — genuinely useful right now, and not a design that has to change once a real
 * admin directory exists; only the input would become a picker.
 */
export function LeadAssignmentControl({ leadId, assignedTo, currentAdminEmail }: { leadId: string; assignedTo: string | null; currentAdminEmail: string }) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(assignedTo ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const inFlight = useRef(false);

  async function save(next: string | null) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setFeedback(null);

    let result;
    try {
      result = await patchLead(leadId, { assignedTo: next });
    } catch {
      inFlight.current = false;
      setSaving(false);
      setFeedback({ tone: "error", message: GENERIC_SAVE_ERROR });
      return;
    }
    inFlight.current = false;
    setSaving(false);

    if (isApiSuccess(result)) {
      setValue(next ?? "");
      setFeedback({ tone: "success", message: "Saved." });
      router.refresh();
    } else {
      setFeedback({ tone: "error", message: result.message });
    }
  }

  return (
    <div className={styles.control}>
      <label htmlFor={inputId} className={styles.label}>Assigned To</label>
      <div className={styles.row}>
        <input
          id={inputId}
          type="text"
          className={styles.input}
          value={value}
          disabled={saving}
          placeholder="Unassigned"
          maxLength={200}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="button" variant="secondary" className={styles.smallButton} loading={saving} onClick={() => save(value.trim() || null)}>Save</Button>
        {!assignedTo || assignedTo !== currentAdminEmail ? (
          <Button type="button" variant="ghost" className={styles.smallButton} disabled={saving} onClick={() => save(currentAdminEmail)}>Assign to me</Button>
        ) : null}
        {assignedTo ? (
          <Button type="button" variant="ghost" className={styles.smallButton} disabled={saving} onClick={() => save(null)}>Unassign</Button>
        ) : null}
      </div>
      <span className={styles.feedback} data-tone={feedback?.tone} role="status">{feedback?.message}</span>
    </div>
  );
}
