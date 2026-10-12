import { z } from "zod";
import { validateContactField } from "@/lib/contact-validation";
import { passwordStrengthProblem } from "@/server/lib/password";

/** Trimmed and lowercased (so "Peter@X.com" and "peter@x.com" are the same account), validated with the exact
 * same email rule the public Contact form uses (`validateContactField`) — one source of truth, not a second
 * email regex for the CRM. */
const emailField = z
  .string({ error: "Please enter your email." })
  .trim()
  .superRefine((value, ctx) => {
    const problem = validateContactField("email", value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform((v) => v.toLowerCase());

/**
 * What `POST /api/admin/auth/login` accepts. The password carries no length/strength check here —
 * that rule belongs to account creation (`adminUserInputSchema`, below) — so a login attempt can never
 * reveal which rule an existing account's password does or doesn't meet.
 */
export const adminLoginSchema = z.object({
  email: emailField,
  password: z.string({ error: "Please enter your password." }).min(1, "Please enter your password.").max(200),
}).strict();
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** What creating an admin account requires — used only by the seed script in this phase. */
export const adminUserInputSchema = z.object({
  email: emailField,
  password: z.string().max(200).superRefine((value, ctx) => {
    const problem = passwordStrengthProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
}).strict();
export type AdminUserInput = z.infer<typeof adminUserInputSchema>;
