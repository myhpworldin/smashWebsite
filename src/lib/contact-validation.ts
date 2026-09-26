import { CONTACT_GOALS } from "@/lib/contact-options";

/**
 * The contact form's field rules and their user-facing messages — one definition, used by the form (instant
 * feedback) and by the server schema (the authority), so the two can never disagree. Pure functions only:
 * this file is shipped to the browser, so it must not import anything server-side.
 */
export type ContactField = "name" | "phone" | "location" | "email" | "companyName" | "website" | "serviceOfInterest" | "monthlyBudget" | "primaryGoal" | "message";

export const REQUIRED_CONTACT_FIELDS: readonly ContactField[] = ["name", "phone", "location"];

export const CONTACT_MAX = { name: 100, location: 100, email: 254, companyName: 100, website: 200, monthlyBudget: 50, message: 5000 } as const;

/** Spaces, dashes, dots and brackets are how people type numbers; they are never part of the stored number. */
export const normalizePhone = (value: string) => value.replace(/[\s\-().]/g, "");

/** What identifies a returning visitor: the last 10 digits, so "+91 98765 43210" and "98765 43210" are the same person. */
export const phoneKey = (normalized: string) => normalized.replace(/\D/g, "").slice(-10);

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
const PLACE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.,'’&()/-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?\d{10,15}$/;
const WEBSITE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#]\S*)?$/i;

const tooLong = (label: string, max: number) => `${label} must be ${max} characters or fewer.`;

/** The first problem with `raw` for `field`, or `null` when it is acceptable (an empty optional field is acceptable). */
export function validateContactField(field: ContactField, raw: string): string | null {
  const value = raw.trim();
  if (value.includes("\u0000")) return "This field contains a character we can't accept.";

  if (!value) {
    if (field === "name") return "Please enter your full name.";
    if (field === "phone") return "Please enter your mobile number.";
    if (field === "location") return "Please enter your location.";
    return null;
  }

  switch (field) {
    case "name":
      if (value.length < 2) return "Full name must be at least 2 characters.";
      if (value.length > CONTACT_MAX.name) return tooLong("Full name", CONTACT_MAX.name);
      return NAME.test(value) ? null : "Full name can only contain letters, spaces, apostrophes, hyphens and full stops.";
    case "phone":
      return PHONE.test(normalizePhone(value)) ? null : "Please enter a valid mobile number, e.g. +91 98765 43210.";
    case "location":
      if (value.length < 2) return "Location must be at least 2 characters.";
      if (value.length > CONTACT_MAX.location) return tooLong("Location", CONTACT_MAX.location);
      return PLACE.test(value) ? null : "Please enter a valid location, e.g. Mumbai, India.";
    case "email":
      if (value.length > CONTACT_MAX.email) return tooLong("Email", CONTACT_MAX.email);
      return EMAIL.test(value) ? null : "Please enter a valid email address, e.g. peter@dailybugle.com.";
    case "companyName":
      return value.length > CONTACT_MAX.companyName ? tooLong("Company name", CONTACT_MAX.companyName) : null;
    case "website":
      if (value.length > CONTACT_MAX.website) return tooLong("Website link", CONTACT_MAX.website);
      return WEBSITE.test(value) ? null : "Please enter a valid website or Instagram link, e.g. dailybugle.com.";
    case "monthlyBudget":
      if (value.length > CONTACT_MAX.monthlyBudget) return tooLong("Budget", CONTACT_MAX.monthlyBudget);
      return /\d/.test(value) ? null : "Please enter your budget as an amount, e.g. ₹50,000.";
    case "primaryGoal":
      return (CONTACT_GOALS as readonly string[]).includes(value) ? null : "Please choose one of the listed goals.";
    case "message":
      return value.length > CONTACT_MAX.message ? tooLong("Message", CONTACT_MAX.message) : null;
    case "serviceOfInterest":
      return null; // checked against the published services on the server
  }
}
