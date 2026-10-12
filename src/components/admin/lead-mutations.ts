import { apiFetch, isApiSuccess, type ApiResult } from "@/lib/api-client";

/** The one place every CRM mutation control (status, priority, assignment, edit form, notes) calls the Lead Detail API — so each control's own code is just "build the body, call this, handle the result," not its own fetch plumbing. */
export async function patchLead(id: string, body: Record<string, unknown>): Promise<ApiResult<unknown>> {
  return apiFetch("/api/admin/leads/" + id, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}

export async function postLeadNote(id: string, content: string): Promise<ApiResult<unknown>> {
  return apiFetch("/api/admin/leads/" + id + "/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(15000),
  });
}

export { isApiSuccess };

/** The one generic-but-safe error message every mutation control falls back to — never the raw fetch/network error, matching the Contact form's own established wording. */
export const GENERIC_SAVE_ERROR = "We couldn't save that change. Please check your connection and try again.";
