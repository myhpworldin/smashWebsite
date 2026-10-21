import { z } from "zod";
import { normalizePhone, validateContactField } from "@/lib/contact-validation";
import { CAMPAIGN_PLATFORMS, CAMPAIGN_STATUSES, CLIENT_CURRENCIES, MAX_CAMPAIGNS, MAX_CLIENT_SERVICES, MAX_MONTHS } from "@/lib/client-options";
import { clientPasswordProblem } from "@/lib/client-password";

/** Trimmed and lowercased, checked with the same email rule as the Contact form and the CRM admin login. */
export const emailField = z
  .string({ error: "Please enter the email." })
  .trim()
  .superRefine((value, ctx) => {
    const problem = validateContactField("email", value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform((v) => v.toLowerCase());

export const text = (label: string, min: number, max: number) =>
  z.string({ error: `Please enter ${label}.` }).trim().min(min, `Please enter ${label}.`).max(max, `${label[0].toUpperCase()}${label.slice(1)} is too long.`);

/** A mobile number as the Contact form accepts it, stored without spaces, dashes or brackets (`+919876543210`). */
const phoneField = z
  .string({ error: "Please enter the mobile number." })
  .trim()
  .superRefine((value, ctx) => {
    const problem = validateContactField("phone", value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform(normalizePhone);

/** The services a client chose. Whether each one exists in the Services catalogue is checked against the database by the service layer. */
const servicesField = z
  .array(
    z.object({
      categorySlug: z.string().trim().min(1).max(100),
      categoryName: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(160),
    }).strict(),
    { error: "Please choose at least one service." },
  )
  .min(1, "Please choose at least one service.")
  .max(MAX_CLIENT_SERVICES, `At most ${MAX_CLIENT_SERVICES} services.`);

/** The temporary password an administrator hands out: the same 8-character rule as any client password (the client replaces it on first login). */
export const temporaryPasswordField = z.string({ error: "Please enter a temporary password." }).max(200).superRefine((value, ctx) => {
  const problem = clientPasswordProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

/** A login attempt places no strength rule on the password, so a failure can never reveal which rule an account's password meets. */
export const clientLoginSchema = z.object({
  email: emailField,
  password: z.string({ error: "Please enter your password." }).min(1, "Please enter your password.").max(200),
}).strict();

export const createClientAccountSchema = z.object({
  companyName: text("the company name", 2, 120),
  contactName: text("the contact's name", 2, 100),
  email: emailField,
  phone: phoneField,
  services: servicesField,
  temporaryPassword: temporaryPasswordField,
  sendInvite: z.boolean().default(true),
}).strict();
export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>;

export const updateClientAccountSchema = z.object({
  companyName: text("the company name", 2, 120).optional(),
  contactName: text("the contact's name", 2, 100).optional(),
  phone: phoneField.optional(),
  services: servicesField.optional(),
  isActive: z.boolean().optional(),
}).strict();
export type UpdateClientAccountInput = z.infer<typeof updateClientAccountSchema>;

export const adminResetPasswordSchema = z.object({ temporaryPassword: temporaryPasswordField, sendInvite: z.boolean().default(true) }).strict();

export const verifyEmailSchema = z.object({ code: z.string({ error: "Please enter the code." }).trim().regex(/^\d{6}$/, "The code is 6 digits.") }).strict();

export const forgotPasswordSchema = z.object({ email: emailField }).strict();

export const checkResetCodeSchema = z.object({ email: emailField, code: z.string({ error: "Please enter the code." }).trim().regex(/^\d{6}$/, "The code is 6 digits.") }).strict();

export const resetWithCodeSchema = z.object({
  email: emailField,
  code: z.string({ error: "Please enter the code." }).trim().regex(/^\d{6}$/, "The code is 6 digits."),
  newPassword: z.string({ error: "Please choose a new password." }).max(200).superRefine((value, ctx) => {
    const problem = clientPasswordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: "Please enter your current password." }).min(1, "Please enter your current password.").max(200),
  newPassword: z.string({ error: "Please choose a new password." }).max(200).superRefine((value, ctx) => {
    const problem = clientPasswordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
}).strict();

/** Whole, non-negative figures, bounded so a typo like an extra zero is still plausible but a paste of garbage is not. */
export const figure = (label: string) => z.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(0, `${label} cannot be negative.`).max(1_000_000_000_000, `${label} is too large.`);
export const money = (label: string) => z.number({ error: `${label} must be a number.` }).min(0, `${label} cannot be negative.`).max(1_000_000_000_000, `${label} is too large.`).transform((v) => Math.round(v * 100) / 100);

const campaignSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: text("the campaign name", 1, 120),
  platform: z.string().trim().min(1).max(40).refine((v) => (CAMPAIGN_PLATFORMS as readonly string[]).includes(v), "Choose a platform from the list."),
  status: z.enum(CAMPAIGN_STATUSES),
  budget: money("Campaign budget"),
  spent: money("Campaign spend"),
  leads: figure("Campaign leads"),
  calls: figure("Campaign calls"),
  // Added after the first dashboards were saved: absent means zero, so an older editor payload (without them) is still valid.
  reach: figure("Reach").default(0),
  impressions: figure("Impressions").default(0),
  clicks: figure("Clicks").default(0),
  engagement: figure("Engagement").default(0),
  conversions: figure("Conversions").default(0),
  revenue: money("Revenue").default(0),
  startDate: z.union([z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "The start date must be a date."), z.literal(""), z.null()]).optional().transform((v) => v || null),
}).strict();

const monthSchema = z.object({
  label: text("the month label", 1, 20),
  leads: figure("Monthly leads"),
  calls: figure("Monthly calls"),
  spend: money("Monthly spend"),
  revenue: money("Monthly revenue").default(0),
}).strict();

/** What an administrator saves for one client's dashboard. Everything is replaced as a whole, so the editor shows exactly what the client sees. */
export const dashboardInputSchema = z.object({
  currency: z.enum(CLIENT_CURRENCIES),
  periodLabel: z.string().trim().max(60).optional().transform((v) => v || null),
  note: z.string().trim().max(1000, "The note is too long (1,000 characters at most).").optional().transform((v) => v || null),
  leads: figure("Total leads"),
  calls: figure("Calls received"),
  adsRunning: figure("Ads running"),
  /** Required: no spend can be recorded, and nothing published, without a budget to draw it from. */
  totalBudget: money("Total budget").refine((v) => v > 0, "Set a total budget greater than 0."),
  /** Accepted for older callers but ignored: the amount spent is worked out from the campaigns and the daily updates, never typed. */
  amountSpent: money("Amount spent").optional(),
  impressions: figure("Impressions"),
  clicks: figure("Clicks"),
  campaigns: z.array(campaignSchema).max(MAX_CAMPAIGNS, `At most ${MAX_CAMPAIGNS} campaigns.`),
  monthly: z.array(monthSchema).max(MAX_MONTHS, `At most ${MAX_MONTHS} months.`),
}).strict();
export type DashboardInput = z.infer<typeof dashboardInputSchema>;
/** What a caller may send: the newer campaign metrics are optional and default to zero. */
export type DashboardInputRaw = z.input<typeof dashboardInputSchema>;
