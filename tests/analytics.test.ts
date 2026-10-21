import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_MAX_AGE_MS, CONSENT_VERSION, googleConsentSignals, parseConsent, serializeConsent } from "@/lib/consent";

/**
 * The consent gate and the event layer (lib/consent.ts, lib/analytics.ts) against a minimal fake browser: which
 * scripts get injected, what reaches dataLayer / fbq, and that nothing does before consent.
 */

type Fake = { scripts: string[]; cookies: Map<string, string>; reloads: number; store: Map<string, string> };

function fakeBrowser(path = "/contact"): Fake {
  const fake: Fake = { scripts: [], cookies: new Map(), reloads: 0, store: new Map() };
  const target = new EventTarget();
  const win = {
    location: { pathname: path, search: "", hostname: "smash.international", href: `https://smash.international${path}`, reload: () => void fake.reloads++ },
    localStorage: { getItem: (k: string) => fake.store.get(k) ?? null, setItem: (k: string, v: string) => void fake.store.set(k, v), removeItem: (k: string) => void fake.store.delete(k) },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
  const doc = {
    title: "Contact",
    createElement: () => ({}) as { src?: string },
    head: { appendChild: (el: { src: string }) => void fake.scripts.push(el.src) },
    get cookie() {
      return [...fake.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(value: string) {
      const [pair] = value.split(";");
      const [name, v] = pair.split("=");
      if (/Max-Age=0/.test(value)) fake.cookies.delete(name.trim());
      else fake.cookies.set(name.trim(), v);
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  return fake;
}

const ENV = ["NEXT_PUBLIC_GA4_MEASUREMENT_ID", "NEXT_PUBLIC_GTM_CONTAINER_ID", "NEXT_PUBLIC_META_PIXEL_ID", "NEXT_PUBLIC_GOOGLE_ADS_ID"] as const;

/** Fresh modules for each scenario: the provider ids are read when analytics-config is first imported. */
async function load(env: Partial<Record<(typeof ENV)[number], string>>) {
  for (const k of ENV) delete process.env[k];
  Object.assign(process.env, env);
  vi.resetModules();
  return import("@/lib/analytics");
}

/** dataLayer entries as plain arrays (gtag pushes Arguments objects) or objects (GTM events). */
const layer = () => ((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []).map((e) => (typeof e === "object" && e && "length" in e ? Array.from(e as ArrayLike<unknown>) : e));
const gtagEvents = (name: string) => layer().filter((e) => Array.isArray(e) && e[0] === "event" && e[1] === name);

const DIRECT = { NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-TEST0001", NEXT_PUBLIC_META_PIXEL_ID: "100000000000001" };

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV) delete process.env[k];
});

describe("stored consent", () => {
  it("round-trips and refuses stale, old-version or unreadable values", () => {
    const now = 1_800_000_000_000;
    expect(parseConsent(serializeConsent({ analytics: true, marketing: false }, now), now)).toEqual({ analytics: true, marketing: false });
    expect(parseConsent(serializeConsent({ analytics: true, marketing: true }, now - CONSENT_MAX_AGE_MS - 1), now)).toBeNull();
    expect(parseConsent(JSON.stringify({ v: CONSENT_VERSION + 1, at: now, analytics: true, marketing: true }), now)).toBeNull();
    expect(parseConsent("{not json", now)).toBeNull();
    expect(parseConsent(null, now)).toBeNull();
    expect(parseConsent(JSON.stringify({ v: CONSENT_VERSION, at: now, analytics: "yes" }), now)).toEqual({ analytics: false, marketing: false });
  });

  it("maps a choice onto Google Consent Mode v2", () => {
    expect(googleConsentSignals({ analytics: true, marketing: false })).toEqual({ analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    expect(googleConsentSignals({ analytics: false, marketing: true })).toEqual({ analytics_storage: "denied", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  });
});

describe("event parameters", () => {
  it("never let personal data through", async () => {
    fakeBrowser();
    const { sanitizeParams } = await load({});
    expect(sanitizeParams({
      form_name: "contact", had_service_of_interest: true, count: 3, service_slug: "performance-marketing",
      email: "x", name: "Ada", phone: "1", message: "hi", company_name: "Acme",
      note: "reach me at ada@example.com", other: "+91 98765 43210", text: "x".repeat(101),
    })).toEqual({ form_name: "contact", had_service_of_interest: true, count: 3, service_slug: "performance-marketing" });
  });

  it("does not measure the CRM, client portal, previews or API", async () => {
    fakeBrowser();
    const { isTrackedPath } = await load({});
    for (const p of ["/admin", "/admin/leads/1", "/client/login", "/preview/services/x", "/api/leads"]) expect(isTrackedPath(p), p).toBe(false);
    for (const p of ["/", "/contact", "/services/seo", "/clients-stories"]) expect(isTrackedPath(p), p).toBe(true);
  });
});

describe("direct GA4 + Meta (no GTM)", () => {
  let fake: Fake;
  beforeEach(() => {
    fake = fakeBrowser();
  });

  it("loads nothing and records nothing before consent", async () => {
    const a = await load(DIRECT);
    a.startTags();
    a.trackPageView("/contact", "Contact");
    a.trackEvent("generate_lead", { form_name: "contact" });
    a.trackEvent("phone_click", { page_path: "/contact" });
    expect(fake.scripts).toEqual([]);
    expect(window.dataLayer).toBeUndefined();
    expect(window.gtag).toBeUndefined();
    expect(window.fbq).toBeUndefined();
  });

  it("analytics only: GA4 loads with consent set first, Meta stays off", async () => {
    const a = await load(DIRECT);
    a.applyConsentChoice({ analytics: true, marketing: false });
    expect(fake.scripts).toEqual(["https://www.googletagmanager.com/gtag/js?id=G-TEST0001"]);
    const entries = layer() as unknown[][];
    expect(entries[0]).toEqual(["consent", "default", googleConsentSignals({ analytics: false, marketing: false })]);
    expect(entries[1]).toEqual(["consent", "update", googleConsentSignals({ analytics: true, marketing: false })]);
    expect(entries.find((e) => e[0] === "config")).toEqual(["config", "G-TEST0001", { send_page_view: false }]);
    expect(gtagEvents("page_view")).toHaveLength(1); // the page the choice was made on is counted once
    a.trackEvent("generate_lead", { form_name: "contact" });
    expect(gtagEvents("generate_lead")).toEqual([["event", "generate_lead", { form_name: "contact", send_to: "G-TEST0001" }]]);
    expect(window.fbq).toBeUndefined();
  });

  it("advertising: Meta gets the standard Lead / Contact events with a de-duplication id", async () => {
    const a = await load(DIRECT);
    a.applyConsentChoice({ analytics: false, marketing: true });
    expect(fake.scripts).toEqual(["https://connect.facebook.net/en_US/fbevents.js"]);
    a.trackEventOnce("lead-1", "generate_lead", { form_name: "contact" });
    a.trackEvent("whatsapp_click", { page_path: "/" });
    const queue = window.fbq!.queue as unknown[][];
    expect(queue).toContainEqual(["track", "Lead", { content_category: "generate_lead", form_name: "contact" }, { eventID: "lead-1" }]);
    expect(queue).toContainEqual(["track", "Contact", { content_category: "whatsapp_click", page_path: "/" }, undefined]);
    expect(queue.slice(0, 2)).toEqual([["consent", "grant"], ["init", "100000000000001"]]);
    expect(gtagEvents("generate_lead")).toEqual([]); // GA4 not consented
  });

  it("counts one lead per submission, however often the callback runs", async () => {
    const a = await load(DIRECT);
    a.applyConsentChoice({ analytics: true, marketing: true });
    for (let i = 0; i < 3; i++) a.trackEventOnce("lead-abc", "generate_lead", { form_name: "contact" });
    a.trackEventOnce("lead-def", "generate_lead", { form_name: "contact" });
    expect(gtagEvents("generate_lead")).toHaveLength(2);
    expect((window.fbq!.queue as unknown[][]).filter((e) => e[1] === "Lead")).toHaveLength(2);
  });

  it("withdrawing tells the tags, deletes their cookies and reloads so no script remains", async () => {
    const a = await load(DIRECT);
    a.applyConsentChoice({ analytics: true, marketing: true });
    fake.cookies.set("_ga", "GA1.1.1");
    fake.cookies.set("_fbp", "fb.1.1");
    fake.cookies.set("smash_admin", "keep");
    a.applyConsentChoice({ analytics: false, marketing: false });
    expect((layer() as unknown[][]).at(-1)).toEqual(["consent", "update", googleConsentSignals({ analytics: false, marketing: false })]);
    expect(window.fbq!.queue).toContainEqual(["consent", "revoke"]);
    expect([...fake.cookies.keys()]).toEqual(["smash_admin"]);
    expect(fake.reloads).toBe(1);
    expect(JSON.parse(fake.store.get("smash_consent")!)).toMatchObject({ analytics: false, marketing: false });
  });

  it("a choice that withdraws nothing never reloads", async () => {
    const a = await load(DIRECT);
    a.applyConsentChoice({ analytics: true, marketing: false });
    a.applyConsentChoice({ analytics: true, marketing: true });
    expect(fake.reloads).toBe(0);
    expect(gtagEvents("page_view")).toHaveLength(1); // upgrading consent does not count the page again
  });

  it("records nothing on an untracked path even with consent", async () => {
    fake = fakeBrowser("/admin/leads");
    fake.store.set("smash_consent", serializeConsent({ analytics: true, marketing: true }));
    const a = await load(DIRECT);
    a.startTags();
    a.trackEvent("phone_click", {});
    expect(fake.scripts).toEqual([]);
    expect(window.dataLayer).toBeUndefined();
  });
});

describe("with a GTM container", () => {
  it("loads only GTM (never gtag.js or the pixel beside it) and sends events to dataLayer", async () => {
    const fake = fakeBrowser();
    const a = await load({ NEXT_PUBLIC_GTM_CONTAINER_ID: "GTM-TEST01", ...DIRECT, NEXT_PUBLIC_GOOGLE_ADS_ID: "AW-1" });
    a.trackEvent("generate_lead", { form_name: "contact" });
    expect(fake.scripts).toEqual([]); // still nothing before consent
    a.applyConsentChoice({ analytics: true, marketing: false });
    expect(fake.scripts).toEqual(["https://www.googletagmanager.com/gtm.js?id=GTM-TEST01"]);
    a.trackEventOnce("lead-9", "generate_lead", { form_name: "contact", email: "ada@example.com" });
    a.trackGoogleAdsConversion("AW-1", "label", {}, "lead-9"); // a GTM tag's job, so a no-op here
    const objects = layer().filter((e) => !Array.isArray(e)) as Record<string, unknown>[];
    expect(objects.filter((e) => e.event === "page_view")).toHaveLength(1);
    expect(objects.filter((e) => e.event === "generate_lead")).toEqual([{ event: "generate_lead", form_name: "contact", event_id: "lead-9" }]);
    expect(layer().some((e) => Array.isArray(e) && e[1] === "conversion")).toBe(false);
    expect((layer() as unknown[][]).find((e) => Array.isArray(e) && e[1] === "update")).toEqual(["consent", "update", googleConsentSignals({ analytics: true, marketing: false })]);
    expect(window.fbq).toBeUndefined();
  });
});

describe("with no provider configured (today's production)", () => {
  it("renders no banner trigger and loads nothing", async () => {
    const fake = fakeBrowser();
    for (const k of ENV) delete process.env[k];
    vi.resetModules();
    const { isAnalyticsConfigured } = await import("@/lib/analytics-config");
    const { CookieSettingsButton } = await import("@/components/analytics/CookieSettingsButton");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    expect(isAnalyticsConfigured).toBe(false);
    expect(renderToStaticMarkup(createElement(CookieSettingsButton))).toBe("");
    fake.store.set("smash_consent", serializeConsent({ analytics: true, marketing: true }));
    const a = await import("@/lib/analytics");
    a.startTags();
    a.trackEvent("generate_lead", {});
    expect(fake.scripts).toEqual([]);
  });
});
