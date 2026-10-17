import "server-only";
import { after } from "next/server";
import { sendEnquiryEmails } from "@/server/email/enquiry-emails";
import type { SessionController, WriteController } from "@/server/api/handler";
import { pageMeta, parseId, parseQuery } from "@/server/api/query";
import { listLeadsQuerySchema } from "@/server/modules/leads/leads.schema";
import { addLeadNote, createLead, listLeads, updateLead } from "@/server/modules/leads/leads.service";

/**
 * `POST /api/leads` (CRM Phase 3) — what the public Contact form now submits to. A new lead also emails the team and
 * (when the visitor gave an address) the visitor, after the response (`server/email/`). Never echoes back
 * what was submitted, and never returns the lead's id: nothing in the current UI needs it, and a
 * public response should carry no more than it must (Phase 3 brief, Step 17).
 */
export const submitLeadController: WriteController = async ({ db, body }) => {
  const lead = await createLead(db, body);
  // Only a lead that was really created sends email: a spam trap or a double-click resubmission sends none.
  if (lead.created && lead.id && lead.details) {
    const send = () => sendEnquiryEmails(db, { id: lead.id!, details: lead.details!, submittedAt: new Date() });
    // After the response, so the visitor never waits on the mail provider. Outside a request (tests, scripts) there is
    // no "after", so it simply runs; either way `sendEnquiryEmails` cannot throw.
    try {
      after(send);
    } catch {
      void send();
    }
  }
  return { data: { received: true } };
};

/**
 * `GET /api/admin/leads` (CRM Phase 5) — session-protected (`adminSessionApi`, not the CMS's bearer
 * token), for external/API consumers. The `/admin/leads` page itself does not call this over HTTP; it
 * calls `listLeads` directly, the same "page reads the service layer, the HTTP route is a separate
 * surface over the same function" convention every other listing page in this project already uses.
 */
export const listLeadsAdminController: SessionController = async ({ db, url }) => {
  const query = parseQuery(listLeadsQuerySchema, url);
  const { items, total } = await listLeads(db, query);
  return { data: items, meta: pageMeta(total, query.page, query.limit) };
};

/**
 * `PATCH /api/admin/leads/:id` (CRM Phase 6) — status, priority, assignment, and/or the editable
 * contact/business fields, all through the one endpoint `updateLead` validates and applies (Phase 6
 * brief, Step 23: "avoid creating excessive endpoints"). `admin.email` is the actor recorded on every
 * resulting activity entry — there is no richer admin identity than that yet (Phase 2: a single
 * seeded account, no display name field).
 */
export const updateLeadController: SessionController = async ({ db, params, body, admin }) => ({ data: await updateLead(db, parseId(params.id), admin.email, body) });

/** `POST /api/admin/leads/:id/notes` (CRM Phase 6). Returns the created activity row, not the lead — nothing on the page needs the lead re-sent just to add a note; a `router.refresh()` picks up the new note and the lead together. */
export const addLeadNoteController: SessionController = async ({ db, params, body, admin }) => ({ data: await addLeadNote(db, parseId(params.id), admin.email, body) });
