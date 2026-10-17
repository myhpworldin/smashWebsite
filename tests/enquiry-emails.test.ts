import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

const holder = vi.hoisted(() => ({ db: undefined as unknown, env: {} as Record<string, string | undefined> }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));
// The email settings are read through getEnv(), which caches; let each test choose them.
vi.mock("@/server/config/env", async (importActual) => {
  const actual = await importActual<typeof import("@/server/config/env")>();
  return { ...actual, getEnv: () => ({ ...actual.getEnv(), ...holder.env }) };
});

import { createTestDb } from "./test-db";
import type { Db } from "@/server/db/helpers";
import { resetRateLimits } from "@/server/api/rate-limit";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { sendEmail } from "@/server/email/send";
import { confirmationEmail, esc, teamNotificationEmail, type CompanyInfo, type EnquiryDetails } from "@/server/email/templates";
import { POST as leadsRoute } from "@/app/api/leads/route";

const company: CompanyInfo = {
  name: "SMASH Digital Media Private Limited",
  siteUrl: "https://smash.international",
  email: "team@smash.international",
  phone: "+91 95399 00003",
  whatsapp: "+91 95399 00003",
  address: "Kochi, Kerala, India",
  socials: [{ label: "LinkedIn", url: "https://linkedin.com/company/smash" }],
};
const details: EnquiryDetails = { name: "Ada Lovelace", phone: "+919876543210", email: "ada@example.com", location: "Mumbai, India", companyName: "Analytical Engines", service: "Growth", message: "Hello\nthere" };

describe("email templates", () => {
  it("thank the visitor, repeat their request and carry the company's details", () => {
    const mail = confirmationEmail(company, details);
    expect(mail.subject).toBe("Welcome to SMASH, Ada! We have received your request");
    for (const part of ["Welcome to SMASH, Ada!", "Our team will contact you within 12 business hours.", "Analytical Engines", "SMASH Digital Media Private Limited", "Kochi, Kerala, India", "tel:+919539900003", "mailto:team@smash.international", "https://wa.me/919539900003", "linkedin.com/company/smash", 'src="cid:smash-logo"', 'src="cid:smash-check"']) {
      expect(mail.html).toContain(part);
    }
    expect(mail.text).toContain("Our team will contact you within 12 business hours.");
    expect(mail.text).not.toContain("on +919876543210"); // the promise does not repeat their number
    expect(mail.html).not.toContain("What happens next");
    // Gmail's automatic dark mode turns light text on a colour dark: the only white text allowed is the logo's alt text.
    expect(mail.html.match(/(?<!background-)color:#ffffff/gi) ?? []).toHaveLength(1);
    expect(mail.text).toContain("SMASH Digital Media Private Limited");
    expect(mail.text).not.toContain("<");
  });

  it("quote the phone only in the request copy, never in the promise sentence", () => {
    const promise = confirmationEmail(company, details).html.match(/Our team will contact you[^<]*/)![0];
    expect(promise).toBe("Our team will contact you within 12 business hours.");
  });

  it("never lets submitted text become markup or a header", () => {
    const evil: EnquiryDetails = { ...details, name: "<script>alert(1)</script>\r\nBcc: x@evil.example", message: "<img src=x onerror=alert(1)>", website: "javascript:alert(1)" };
    for (const mail of [confirmationEmail(company, evil), teamNotificationEmail(company, evil, { leadUrl: "https://smash.international/admin/leads/1", submittedAt: new Date() })]) {
      expect(mail.html).not.toContain("<script>");
      expect(mail.html).not.toContain("<img src=x");
      expect(mail.html).not.toContain('href="javascript:');
      expect(mail.subject).not.toMatch(/[\r\n]/);
    }
    expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("give the team the whole submission, a call link, a reply link and the lead's CRM page", () => {
    const mail = teamNotificationEmail(company, details, { leadUrl: "https://smash.international/admin/leads/abc", submittedAt: new Date("2026-01-02T10:00:00Z") });
    expect(mail.subject).toBe("New enquiry: Ada Lovelace – Growth");
    for (const part of ["tel:+919876543210", "mailto:ada@example.com", "https://smash.international/admin/leads/abc", "Analytical Engines", "Hello<br>there", "IST"]) expect(mail.html).toContain(part);
    expect(mail.text).toContain("Open in CRM: https://smash.international/admin/leads/abc");
  });

  it("omit what the visitor did not give", () => {
    const mail = teamNotificationEmail(company, { name: "Bo", phone: "+919876543210", location: "Delhi" }, { leadUrl: "https://x.example/l", submittedAt: new Date() });
    expect(mail.html).not.toContain("Reply by email");
    expect(mail.html).not.toContain("Monthly budget");
    expect(mail.subject).toBe("New enquiry: Bo");
  });
});

describe("sendEmail (Resend)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    holder.env = { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "SMASH <hello@smash.international>" };
  });
  afterEach(() => vi.unstubAllGlobals());
  const msg = { to: ["a@example.com"], subject: "S", html: "<p>h</p>", text: "t", replyTo: "r@example.com", idempotencyKey: "k-1" };

  it("attaches inline images with a content id so the logo shows without a remote host", async () => {
    await sendEmail({ ...msg, inlineImages: [{ cid: "smash-logo", filename: "smash-logo.png", contentBase64: "AAAA", contentType: "image/png" }] });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.attachments).toEqual([{ filename: "smash-logo.png", content: "AAAA", content_type: "image/png", content_id: "smash-logo" }]);
  });

  it("posts the message to Resend with the key, the From address, a reply-to and an idempotency key", async () => {
    expect(await sendEmail(msg)).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k-1");
    expect(JSON.parse(init.body as string)).toEqual({ from: "SMASH <hello@smash.international>", to: ["a@example.com"], subject: "S", html: "<p>h</p>", text: "t", reply_to: "r@example.com" });
  });

  it("sends nothing, and says so, while the key or the From address is unset", async () => {
    holder.env = { RESEND_API_KEY: undefined, EMAIL_FROM: "x@y.com" };
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "not_configured" });
    holder.env = { RESEND_API_KEY: "re_x", EMAIL_FROM: undefined };
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a rejection or a network failure instead of throwing", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ name: "validation_error", message: "domain not verified" }), { status: 403 }));
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "rejected" });
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await sendEmail(msg)).toEqual({ sent: false, reason: "network" });
  });
});

describe("POST /api/leads emails", () => {
  let db: Db;
  let fetchMock: ReturnType<typeof vi.fn>;
  const post = (json: unknown) => leadsRoute(new Request("http://x.example/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(json) }));
  const sent = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
  const valid = { name: "Ada Lovelace", phone: "+91 98765 43210", location: "Mumbai, India", email: "ada@example.com" };

  beforeEach(async () => {
    ({ db } = await createTestDb());
    holder.db = db;
    resetRateLimits();
    holder.env = { RESEND_API_KEY: "re_test_key", EMAIL_FROM: "hello@smash.international", ENQUIRY_NOTIFY_EMAIL: undefined };
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "e" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await saveSiteSettings(db, { siteName: "SMASH Digital Media Private Limited", contact: { email: "team@smash.international", phone: "+91 95399 00003", address: "Kochi, Kerala, India" } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("tells the team and confirms to the visitor, each with the right recipient and reply-to", async () => {
    expect((await post(valid)).status).toBe(200);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const mails = sent();
    const team = mails.find((m) => m.to[0] === "team@smash.international");
    const visitor = mails.find((m) => m.to[0] === "ada@example.com");
    expect(team).toMatchObject({ reply_to: "ada@example.com" });
    expect(team.subject).toBe("New enquiry: Ada Lovelace");
    expect(visitor).toMatchObject({ reply_to: "team@smash.international" });
    expect(visitor.html).toContain("Kochi, Kerala, India");
    expect(visitor.html).toContain("within 12 business hours");
    expect(visitor.attachments.map((a: { content_id: string }) => a.content_id)).toEqual(["smash-logo", "smash-check"]);
    expect(team.attachments.map((a: { content_id: string }) => a.content_id)).toEqual(["smash-logo"]);
  });

  it("uses ENQUIRY_NOTIFY_EMAIL for the team when it is set", async () => {
    holder.env.ENQUIRY_NOTIFY_EMAIL = "sales@smash.international, ops@smash.international";
    await post(valid);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sent().find((m) => m.to.length === 2).to).toEqual(["sales@smash.international", "ops@smash.international"]);
  });

  it("emails only the team when the visitor gave no address", async () => {
    await post({ name: "Ada", phone: "+91 98765 43210", location: "Mumbai" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sent()[0].to).toEqual(["team@smash.international"]);
  });

  it("sends nothing for a spam submission, and nothing again for an accidental double submit", async () => {
    await post({ ...valid, honeypot: "i am a bot" });
    await post(valid);
    await post(valid); // the same person within seconds: one lead, so one set of emails
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still saves the lead and answers success when the mail provider fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ name: "error", message: "down" }), { status: 500 }));
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { received: true } });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
