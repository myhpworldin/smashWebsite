"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { trackEvent, trackGoogleAdsConversion } from "@/lib/analytics";
import { analyticsConfig } from "@/lib/analytics-config";
import { FormField } from "@/components/content/FormField";
import { Button } from "@/components/ui/Button";
import { ContactSuccessDialog } from "@/components/forms/ContactSuccessDialog";
import { Asset } from "@/components/home/shared";
import { CONTACT_GOALS } from "@/lib/contact-options";
import { CONTACT_MAX, validateContactField, type ContactField } from "@/lib/contact-validation";
import styles from "./ContactForm.module.css";

type ServiceOption = { name: string; slug: string };
type Values = {
  name: string; companyName: string; website: string; phone: string; location: string; email: string; serviceOfInterest: string;
  monthlyBudget: string; primaryGoal: string; message: string; honeypot: string;
};
const EMPTY: Values = { name: "", companyName: "", website: "", phone: "", location: "", email: "", serviceOfInterest: "", monthlyBudget: "", primaryGoal: "", message: "", honeypot: "" };
/** Optional fields are only sent when filled in — the server treats a blank one as not sent. */
const OPTIONAL = ["companyName", "website", "email", "serviceOfInterest", "monthlyBudget", "primaryGoal", "message", "honeypot"] as const;
/** Every field the shared rules cover, in the form's on-screen order (used to find the first problem). */
const FIELD_ORDER: ContactField[] = ["name", "companyName", "website", "phone", "email", "location", "serviceOfInterest", "monthlyBudget", "primaryGoal", "message"];
const FIX_FIELDS = "Please correct the highlighted fields and try again.";

/**
 * The public website's contact form (Stage 3, Phase 7) — posts to `POST
 * /api/contact` (`enquiries.service.ts`). Not a CRM: it persists a raw
 * submission and nothing more (no assignment, pipeline, or staff workflow).
 * `honeypot` is never rendered as a real field — see its input below.
 */
export function ContactForm({ services }: { services: ServiceOption[] }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  // No `contact_form_view` — that's already `page_view` scoped to /contact (ANALYTICS_EVENTS.md's
  // own "one consistent naming convention" rule); this is the one genuinely distinct signal:
  // did a visitor who landed on the page actually start filling it in.
  const started = useRef(false);

  const set = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!started.current && key !== "honeypot") {
      started.current = true;
      trackEvent("contact_form_start", { form_name: "contact" });
    }
    setValues((v) => ({ ...v, [key]: e.target.value }));
    // A field that is already showing an error re-checks as the visitor fixes it, so the message clears the moment it is right.
    if (key !== "honeypot" && fieldErrors[key]) setFieldErrors((errs) => ({ ...errs, [key]: validateContactField(key, e.target.value) ?? "" }));
  };

  const check = (key: ContactField) => () => setFieldErrors((errs) => ({ ...errs, [key]: validateContactField(key, values[key]) ?? "" }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setErrorMessage(null);

    const problems = Object.fromEntries(FIELD_ORDER.map((f) => [f, validateContactField(f, values[f]) ?? ""]));
    const firstInvalid = FIELD_ORDER.find((f) => problems[f]);
    setFieldErrors(problems);
    if (firstInvalid) {
      setStatus("error");
      setErrorMessage(FIX_FIELDS);
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    inFlight.current = true;
    setStatus("submitting");

    const body: Record<string, string> = { name: values.name, phone: values.phone, location: values.location };
    for (const key of OPTIONAL) if (values[key].trim()) body[key] = values[key];

    let result;
    try {
      result = await apiFetch<{ received: boolean }>("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      inFlight.current = false;
      setStatus("error");
      setErrorMessage("We couldn't send your request. Please check your connection and try again.");
      return;
    }
    inFlight.current = false;

    if (isApiSuccess(result)) {
      setStatus("idle");
      setConfirmed(true);
      setValues(EMPTY);
      // No submitted content (name/email/message) is ever sent as an event parameter — phase brief §15.
      trackEvent("contact_form_submit", { form_name: "contact", had_service_of_interest: !!values.serviceOfInterest });
      if (analyticsConfig.googleAdsId && analyticsConfig.googleAdsContactConversionLabel) {
        trackGoogleAdsConversion(analyticsConfig.googleAdsId, analyticsConfig.googleAdsContactConversionLabel);
      }
    } else {
      setStatus("error");
      setErrorMessage(result.message);
      setFieldErrors(result.error.fields ?? {});
      if (result.error.code === "VALIDATION_ERROR") setErrorMessage(FIX_FIELDS);
      // Only which fields failed, never the values themselves (phase brief §16).
      if (result.error.code === "VALIDATION_ERROR") trackEvent("form_error", { form_name: "contact", error_type: Object.keys(result.error.fields ?? {}).join(",") || "unknown" });
    }
  }

  /** The submit button was disabled while sending, so the browser has no earlier focus to restore: return it to the form. */
  const closeConfirmation = () => {
    setConfirmed(false);
    formRef.current?.querySelector<HTMLElement>("button[type=submit]")?.focus();
  };

  return (
    <>
    <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.form} aria-label="Strategy request">
      <div className={styles.row}>
        <FormField label="Full Name" name="name" required autoComplete="name" maxLength={CONTACT_MAX.name} placeholder="e.g. Peter Parker" value={values.name} onChange={set("name")} onBlur={check("name")} error={fieldErrors.name} />
        <FormField label="Company Name" name="companyName" autoComplete="organization" maxLength={CONTACT_MAX.companyName} placeholder="e.g. Daily Bugle Enterprises" value={values.companyName} onChange={set("companyName")} onBlur={check("companyName")} error={fieldErrors.companyName} />
      </div>
      <div className={styles.row}>
        <FormField label="Website or Instagram link" name="website" type="url" inputMode="url" autoComplete="url" maxLength={CONTACT_MAX.website} placeholder="e.g. dailybugle.com" value={values.website} onChange={set("website")} onBlur={check("website")} error={fieldErrors.website} />
        <FormField label="Phone Number" name="phone" type="tel" required autoComplete="tel" maxLength={20} placeholder="e.g. +91 98765 43210" value={values.phone} onChange={set("phone")} onBlur={check("phone")} error={fieldErrors.phone} />
      </div>
      <div className={styles.row}>
        <FormField label="Work Email Address" name="email" type="email" autoComplete="email" maxLength={CONTACT_MAX.email} placeholder="e.g. peter@dailybugle.com" value={values.email} onChange={set("email")} onBlur={check("email")} error={fieldErrors.email} />
        <FormField label="Location" name="location" required autoComplete="address-level2" maxLength={CONTACT_MAX.location} placeholder="e.g. Mumbai, India" value={values.location} onChange={set("location")} onBlur={check("location")} error={fieldErrors.location} />
      </div>
      {services.length ? (
        <FormField label="Primary Service Required" name="serviceOfInterest" options={services.map((s) => s.name)} placeholder="Select primary Service (e.g. Social Media Advertising)" value={values.serviceOfInterest} onChange={set("serviceOfInterest")} error={fieldErrors.serviceOfInterest} />
      ) : null}
      <FormField label="Approximate Monthly Marketing Budget" name="monthlyBudget" inputMode="text" maxLength={CONTACT_MAX.monthlyBudget} placeholder="e.g. ₹50,000/-" value={values.monthlyBudget} onChange={set("monthlyBudget")} onBlur={check("monthlyBudget")} error={fieldErrors.monthlyBudget} />
      <FormField label="What is your Primary Goal?" name="primaryGoal" options={CONTACT_GOALS} placeholder="Select your target outcome (e.g. Scale Customer Acquisition)" value={values.primaryGoal} onChange={set("primaryGoal")} error={fieldErrors.primaryGoal} />
      <FormField label="Additional context about your business" name="message" textarea rows={5} maxLength={CONTACT_MAX.message} placeholder="Tell us about your operational barriers, current channels, and growth targets..." value={values.message} onChange={set("message")} onBlur={check("message")} error={fieldErrors.message} />
      {/* Invisible to real visitors (off-screen, not display:none — some bots specifically skip that); a filled value marks the submission as spam server-side, without ever telling the sender so. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" value={values.honeypot} onChange={set("honeypot")} />
      </div>
      {errorMessage ? <p role="alert" className={styles.formError}>{errorMessage}</p> : null}
      <Button type="submit" loading={status === "submitting"} className={styles.submit}>
        Book My Strategy Call
        <Asset name="arrow-1.svg" width={16} height={10} />
      </Button>
      <p className={styles.note}>We typically review and respond to strategy applications within 12 business hours.</p>
    </form>
    <ContactSuccessDialog open={confirmed} onClose={closeConfirmation} />
    </>
  );
}
