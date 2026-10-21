import { BILLING_CYCLES, CLIENT_CURRENCIES, CONNECTED_PLATFORMS, NOTIFICATION_LEVELS, TEAM_ACCESS_LEVELS } from "@/lib/client-options";
import type { FieldDef } from "./fields";

export type SectionKey = "accountManager" | "profile" | "connectedPlatforms" | "teamMembers" | "billingPlan" | "meetings" | "notifications" | "terms";

export type SectionConfig =
  | { kind: "object"; fields: FieldDef[]; /** When this field is blank the whole section is cleared (saved as nothing). */ clearWhenBlank?: string; saveLabel?: string }
  | { kind: "list"; fields: FieldDef[]; itemLabel: string; max: number; addLabel: string; emptyText: string; defaults?: Record<string, string> };

const plain = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));

export const SECTION_CONFIGS: Record<SectionKey, SectionConfig> = {
  accountManager: {
    kind: "object", clearWhenBlank: "name",
    fields: [
      { name: "name", label: "Name", type: "text", span: 2, maxLength: 100, placeholder: "e.g. Riya Nair" },
      { name: "email", label: "Email", type: "text", span: 2 },
      { name: "phone", label: "Phone", type: "text", span: 2, placeholder: "+91 98765 43210" },
      { name: "whatsapp", label: "WhatsApp", type: "text", span: 2 },
    ],
  },
  profile: {
    kind: "object",
    fields: [
      { name: "website", label: "Business website", type: "text", span: 2, placeholder: "www.example.com", maxLength: 300 },
      { name: "businessType", label: "Business type", type: "text", span: 2, placeholder: "e.g. Retail, Clinic, Real estate", maxLength: 100 },
      { name: "address", label: "Address", type: "textarea", span: 4, rows: 2, maxLength: 300 },
    ],
  },
  connectedPlatforms: {
    kind: "list", itemLabel: "platform", max: 20, addLabel: "Add platform", emptyText: "No platforms listed yet.",
    fields: [
      { name: "platform", label: "Platform", type: "select", span: 5, required: true, options: plain(CONNECTED_PLATFORMS) },
      { name: "handle", label: "Handle or link", type: "text", span: 7, maxLength: 200, placeholder: "@brand or https://…" },
    ],
    defaults: { platform: CONNECTED_PLATFORMS[0] },
  },
  teamMembers: {
    kind: "list", itemLabel: "person", max: 30, addLabel: "Add person", emptyText: "No team members recorded yet. This is a record only — they do not get their own login.",
    fields: [
      { name: "name", label: "Name", type: "text", span: 3, maxLength: 100 },
      { name: "email", label: "Email", type: "text", span: 3 },
      { name: "phone", label: "Phone", type: "text", span: 2 },
      { name: "role", label: "Role", type: "text", span: 2, maxLength: 80, placeholder: "e.g. Marketing head" },
      { name: "access", label: "Access", type: "select", span: 2, required: true, options: plain(TEAM_ACCESS_LEVELS) },
    ],
    defaults: { access: "Viewer" },
  },
  billingPlan: {
    kind: "object", clearWhenBlank: "packageName",
    fields: [
      { name: "packageName", label: "Service package", type: "text", span: 2, maxLength: 120, placeholder: "e.g. Growth — Meta + Google" },
      { name: "cycle", label: "Billing cycle", type: "select", span: 1, required: true, options: plain(BILLING_CYCLES) },
      { name: "currency", label: "Currency", type: "select", span: 1, required: true, options: plain(CLIENT_CURRENCIES) },
      { name: "monthlyFee", label: "Agency fee per cycle", type: "money", span: 2, emptyAs: "zero" },
      { name: "adSpendBudget", label: "Ad spend budget per cycle", type: "money", span: 2, emptyAs: "zero" },
      { name: "nextDueDate", label: "Next payment due", type: "date", span: 2 },
    ],
  },
  meetings: {
    kind: "list", itemLabel: "meeting", max: 50, addLabel: "Add meeting", emptyText: "No meetings scheduled.",
    fields: [
      { name: "title", label: "Meeting", type: "text", span: 4, maxLength: 140, placeholder: "e.g. Monthly performance review" },
      { name: "startsAt", label: "Starts", type: "datetime", span: 3 },
      { name: "link", label: "Meeting link", type: "text", span: 3, placeholder: "meet.google.com/…" },
      { name: "notes", label: "Notes", type: "text", span: 12, maxLength: 500 },
    ],
  },
  notifications: {
    kind: "list", itemLabel: "notification", max: 50, addLabel: "Add notification", emptyText: "No notifications. Anything you add here appears on the client's Support page.",
    fields: [
      { name: "title", label: "Title", type: "text", span: 7, maxLength: 120 },
      { name: "level", label: "Level", type: "select", span: 2, required: true, options: NOTIFICATION_LEVELS.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })) },
      { name: "body", label: "Message", type: "text", span: 12, maxLength: 500 },
    ],
    defaults: { level: "info" },
  },
  terms: {
    kind: "object",
    fields: [{ name: "text", label: "Terms and conditions", type: "textarea", span: 4, rows: 14, maxLength: 20000, hint: "Plain text; line breaks are kept. Changing the wording asks the client to accept again." }],
  },
};
