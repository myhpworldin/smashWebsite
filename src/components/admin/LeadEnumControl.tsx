"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { isApiSuccess, patchLead, GENERIC_SAVE_ERROR } from "@/components/admin/lead-mutations";
import styles from "./LeadCrmControls.module.css";

/**
 * One reusable control for an auto-saving enum field on the Lead — used for both Status and Priority
 * (CRM Phase 6, Steps 8/10): same save/feedback/revert behavior, only the field name, options and
 * labels differ, so this is written once instead of twice. Selecting a new value saves immediately
 * (the common CRM pattern for a single-choice field) rather than needing a separate "Save" click; a
 * failed save reverts the select back to the last confirmed value, never leaving the UI showing a
 * change the backend didn't actually accept (Phase 6 brief, Step 8: "must not show a successful
 * change before the backend confirms it").
 */
export function LeadEnumControl<T extends string>({ leadId, field, label, value, options, labels }: {
  leadId: string;
  field: "status" | "priority";
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  const router = useRouter();
  const selectId = useId();
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function onChange(next: T) {
    if (saving || next === current) return;
    const previous = current;
    setCurrent(next);
    setSaving(true);
    setFeedback(null);

    let result;
    try {
      result = await patchLead(leadId, { [field]: next });
    } catch {
      setCurrent(previous);
      setSaving(false);
      setFeedback({ tone: "error", message: GENERIC_SAVE_ERROR });
      return;
    }
    setSaving(false);

    if (isApiSuccess(result)) {
      setFeedback({ tone: "success", message: "Saved." });
      router.refresh();
    } else {
      setCurrent(previous);
      setFeedback({ tone: "error", message: result.message });
    }
  }

  return (
    <div className={styles.control}>
      <label htmlFor={selectId} className={styles.label}>{label}</label>
      <div className={styles.row}>
        <select id={selectId} className={styles.select} value={current} disabled={saving} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
        </select>
      </div>
      <span className={styles.feedback} data-tone={feedback?.tone} role="status">{feedback?.message}</span>
    </div>
  );
}
