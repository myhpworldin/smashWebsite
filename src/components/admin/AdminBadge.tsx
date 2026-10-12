import { LEAD_PRIORITY_LABEL, LEAD_STATUS_LABEL, type LeadPriority, type LeadStatus } from "@/lib/lead-options";
import styles from "./AdminBadge.module.css";

type Tone = "neutral" | "accent" | "warning" | "success";

/** The one badge primitive every CRM status/priority chip renders through (Phase 4 brief, Step 13/14). */
export function AdminBadge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}

/** Reused across the pipeline: "actively being worked" reads as one tone regardless of exact stage — the label text is what tells them apart, not the color (Step 14: never color alone). */
const STATUS_TONE: Record<LeadStatus, Tone> = {
  NEW: "neutral",
  CONTACTED: "accent",
  QUALIFIED: "accent",
  PROPOSAL: "warning",
  CONVERTED: "success",
  LOST: "neutral",
};

/** A lead's status, using the exact Phase 1 enum and labels (`lead-options.ts`) — never a re-derived or invented label. */
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <AdminBadge label={LEAD_STATUS_LABEL[status]} tone={STATUS_TONE[status]} />;
}

const PRIORITY_TONE: Record<LeadPriority, Tone> = { LOW: "neutral", MEDIUM: "accent", HIGH: "warning" };

/** A lead's priority, using the exact Phase 1 enum and labels. */
export function LeadPriorityBadge({ priority }: { priority: LeadPriority }) {
  return <AdminBadge label={LEAD_PRIORITY_LABEL[priority]} tone={PRIORITY_TONE[priority]} />;
}
