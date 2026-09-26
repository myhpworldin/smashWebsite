import { z } from "zod";
import { type ContactField, normalizePhone, validateContactField } from "@/lib/contact-validation";

/**
 * One field of the contact form: trimmed, then checked by the same rule the form uses
 * (`lib/contact-validation.ts`). An optional field that is blank is treated as not sent.
 */
const field = (name: ContactField) =>
  z
    .string({ error: validateContactField(name, "") ?? "This field must be text." })
    .trim()
    .superRefine((value, ctx) => {
      const problem = validateContactField(name, value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });
const optional = (name: ContactField) => field(name).transform((v) => v || undefined).optional();

/**
 * Only name, phone and location are required. The phone number identifies a returning visitor
 * (`enquiries.service.ts` merges repeat enquiries from the same number into one record).
 *
 * `honeypot`: a field no real visitor sees or fills (the form hides it with
 * CSS, never `display:none`, since some bots skip that specifically) but a
 * naive bot filling every input will. Non-empty means spam — the request is
 * accepted (never rejected, which would tell the bot which field to leave
 * blank next time) but not persisted. Phase brief §20: an invisible check like
 * this, not CAPTCHA, is the preferred default.
 */
export const enquiryInputSchema = z.object({
  name: field("name"),
  phone: field("phone").transform(normalizePhone),
  location: field("location"),
  email: optional("email"),
  companyName: optional("companyName"),
  website: optional("website"),
  serviceOfInterest: optional("serviceOfInterest"),
  monthlyBudget: optional("monthlyBudget"),
  primaryGoal: optional("primaryGoal"),
  message: optional("message"),
  // Bounded only (never rejected for being non-empty — see the comment above): rejecting it would
  // tell an adaptive bot exactly which field to leave blank next time.
  honeypot: z.string().max(200).optional(),
}).strict();
export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
