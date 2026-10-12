"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDropdownMenu, AdminDropdownMenuItem } from "@/components/admin/AdminDropdownMenu";
import { patchLead, isApiSuccess } from "@/components/admin/lead-mutations";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/lead-options";

/** The 2–3 most likely next stages for a lead already at `status` — a quick-set shortcut, not a
 * replacement for the full status control on the Lead Detail page (which allows any transition). */
const NEXT_STATUSES: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "QUALIFIED"],
  CONTACTED: ["QUALIFIED", "PROPOSAL"],
  QUALIFIED: ["PROPOSAL", "CONVERTED"],
  PROPOSAL: ["CONVERTED", "LOST"],
  CONVERTED: [],
  LOST: [],
};

/**
 * The leads table row's "⋯" overflow menu: a fast path for the two or three most likely next
 * actions on a lead without leaving the list — "View details", a couple of quick status
 * transitions, and "Assign to me". Calls the same `patchLead` mutation the Lead Detail page's
 * `LeadEnumControl`/`LeadAssignmentControl` use, then `router.refresh()` to re-pull the server-
 * rendered list — no separate client cache to keep in sync.
 */
export function LeadRowActions({ leadId, leadName, status, assignedTo, currentAdminEmail }: { leadId: string; leadName: string; status: LeadStatus; assignedTo: string | null; currentAdminEmail: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function setStatus(next: LeadStatus) {
    if (pending) return;
    setPending(true);
    const result = await patchLead(leadId, { status: next });
    setPending(false);
    if (isApiSuccess(result)) router.refresh();
  }

  async function assignToMe() {
    if (pending || !currentAdminEmail) return;
    setPending(true);
    const result = await patchLead(leadId, { assignedTo: currentAdminEmail });
    setPending(false);
    if (isApiSuccess(result)) router.refresh();
  }

  const nextStatuses = NEXT_STATUSES[status];
  const alreadyAssignedToMe = !!currentAdminEmail && assignedTo === currentAdminEmail;

  return (
    <AdminDropdownMenu label={`Row actions for ${leadName}`}>
      <AdminDropdownMenuItem href={`/admin/leads/${leadId}`}>View details</AdminDropdownMenuItem>
      {nextStatuses.map((next) => (
        <AdminDropdownMenuItem key={next} onClick={() => setStatus(next)}>
          Mark {LEAD_STATUS_LABEL[next]}
        </AdminDropdownMenuItem>
      ))}
      {currentAdminEmail && !alreadyAssignedToMe ? <AdminDropdownMenuItem onClick={assignToMe}>Assign to me</AdminDropdownMenuItem> : null}
    </AdminDropdownMenu>
  );
}
