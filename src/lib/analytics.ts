/**
 * The one place any UI component reaches an analytics provider (phase brief
 * §9): `UI Component → trackEvent() → GTM / GA4 / Meta`, never per-component
 * provider code. See ANALYTICS_EVENTS.md for the event list and the GTM setup.
 *
 * Two hard rules live here, so no caller can get them wrong:
 * 1. **Consent first.** Nothing third-party is loaded and no event is recorded
 *    (not even queued) until the visitor has agreed to that category
 *    (`lib/consent.ts`). Analytics → GA4; advertising → Meta Pixel and Google Ads.
 * 2. **One loader.** With a GTM container configured, GTM is the only script
 *    loaded and GA4/Meta/Ads are tags inside it; events go to `dataLayer`.
 *    Without GTM, GA4 (gtag.js) and the Meta Pixel load directly. Never both,
 *    so a page view or lead can never be counted twice.
 *
 * Scripts are started imperatively (`startTags`) rather than with `<Script>`
 * tags: every `trackEvent` call starts them first, so an event fired from a
 * child component's effect (which React runs before the parent's) can never
 * reach a provider that is not set up yet.
 */
"use client";

import { analyticsConfig } from "@/lib/analytics-config";
import { effectiveConsent, googleConsentSignals, saveConsent, TRACKING_COOKIE_PATTERN, type ConsentState } from "@/lib/consent";

export type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...args: unknown[]) => void };
    _fbq?: unknown;
  }
}

/** The CRM, the client portal, draft previews and the API are never measured: they are not marketing pages and their URLs can identify people. */
export const isTrackedPath = (path: string) => !/^\/(admin|client|preview|api)(\/|$)/.test(path);

const viaGtm = () => !!analyticsConfig.gtmContainerId;

/* ---------- parameters: never personal data ---------- */

/** Parameter names that would carry what a visitor typed. Refused whatever their value. */
const BLOCKED_KEYS = /^(name|first_?name|last_?name|full_?name|email|e_?mail|phone|tel|mobile|whatsapp|message|address|location|company(_?name)?|website|budget|monthly_?budget)$/i;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
/** Seven or more digits, allowing the usual separators: a phone number, never a slug or a count. */
const PHONE_LIKE = /\+?\d[\d\s().-]{6,}\d/;

/**
 * Drops anything that could be personal data before it leaves the browser: blocked names, values that look like an
 * email or phone number, and over-long strings (free text). Event names and parameter names are therefore stable and
 * every value sent is a category, a slug, a flag or a count.
 */
export function sanitizeParams(params: EventParams): EventParams {
  const out: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (BLOCKED_KEYS.test(key)) continue;
    if (typeof value === "string" && (EMAIL_LIKE.test(value) || PHONE_LIKE.test(value) || value.length > 100)) continue;
    out[key] = value;
  }
  return out;
}

/* ---------- starting the tags ---------- */

const started = { gtm: false, gtag: false, ga4: false, ads: false, meta: false };

function injectScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** gtag's own queue: calls made before gtag.js (or gtm.js) arrives are replayed by it. Defines the consent default first. */
function ensureGtagQueue() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js reads the Arguments object itself, an array is ignored
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", googleConsentSignals({ analytics: false, marketing: false }));
}

function ensureFbqQueue() {
  if (window.fbq) return;
  const n = function fbq(...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as NonNullable<Window["fbq"]> & { push?: unknown; loaded?: boolean; version?: string };
  n.queue = [];
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  window.fbq = n;
  window._fbq = n;
}

/**
 * Loads and configures whatever the current consent allows, once per provider; safe to call any number of times.
 * A category that is not granted loads nothing. Revoking is handled by `withdrawConsent` (a reload), because a
 * loaded third-party script cannot be unloaded.
 */
export function startTags(consent: ConsentState = effectiveConsent()): void {
  if (typeof window === "undefined" || !isTrackedPath(window.location.pathname)) return;
  const { gtmContainerId, ga4MeasurementId, googleAdsId, metaPixelId } = analyticsConfig;
  const any = consent.analytics || consent.marketing;

  if (viaGtm()) {
    if (!any) return;
    ensureGtagQueue();
    window.gtag!("consent", "update", googleConsentSignals(consent));
    if (!started.gtm) {
      started.gtm = true;
      window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
      injectScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmContainerId!)}`);
    }
    return;
  }

  const wantGa4 = !!ga4MeasurementId && consent.analytics;
  const wantAds = !!googleAdsId && consent.marketing;
  if (wantGa4 || wantAds) {
    ensureGtagQueue();
    window.gtag!("consent", "update", googleConsentSignals(consent));
    if (!started.gtag) {
      started.gtag = true;
      window.gtag!("js", new Date());
      injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent((wantGa4 ? ga4MeasurementId : googleAdsId)!)}`);
    }
    // send_page_view: false — page views are sent by trackPageView on every App Router navigation instead.
    if (wantGa4 && !started.ga4) {
      started.ga4 = true;
      window.gtag!("config", ga4MeasurementId, { send_page_view: false });
    }
    if (wantAds && !started.ads) {
      started.ads = true;
      window.gtag!("config", googleAdsId);
    }
  }

  if (metaPixelId && consent.marketing && !started.meta) {
    started.meta = true;
    ensureFbqQueue();
    window.fbq!("consent", "grant");
    window.fbq!("init", metaPixelId);
    injectScript("https://connect.facebook.net/en_US/fbevents.js");
  }
}

/* ---------- events ---------- */

/** Meta has standard events for the two actions that matter to ad optimisation; everything else is a custom event. */
const META_STANDARD: Record<string, string> = { generate_lead: "Lead", phone_click: "Contact", email_click: "Contact", whatsapp_click: "Contact" };

/**
 * Records one event with every provider the visitor has consented to. Never throws (analytics must never break the
 * site) and does nothing on untracked paths or without consent. `eventId` lets Meta de-duplicate (and a future
 * server-side Conversions API reuse it).
 */
export function trackEvent(name: string, params: EventParams = {}, eventId?: string): void {
  if (typeof window === "undefined" || !isTrackedPath(window.location.pathname)) return;
  const consent = effectiveConsent();
  if (!consent.analytics && !consent.marketing) return;
  const clean = sanitizeParams(params);
  try {
    startTags(consent);
    if (viaGtm()) {
      // GTM routes it to GA4 / Meta / Ads, each tag gated by its own consent type (see ANALYTICS_EVENTS.md).
      window.dataLayer!.push({ event: name, ...clean, ...(eventId ? { event_id: eventId } : {}) });
      return;
    }
    if (consent.analytics && analyticsConfig.ga4MeasurementId) window.gtag?.("event", name, { ...clean, send_to: analyticsConfig.ga4MeasurementId });
    if (consent.marketing && analyticsConfig.metaPixelId) {
      const standard = META_STANDARD[name];
      const options = eventId ? { eventID: eventId } : undefined;
      if (standard) window.fbq?.("track", standard, { content_category: name, ...clean }, options);
      else window.fbq?.("trackCustom", name, clean, options);
    }
  } catch {
    // analytics is a supporting system, never a rendering dependency
  }
}

const firedOnce = new Set<string>();

/** `trackEvent`, but at most once per `key` for the life of the page: a re-run effect or a repeated callback cannot double-count. */
export function trackEventOnce(key: string, name: string, params: EventParams = {}): void {
  if (firedOnce.has(key)) return;
  firedOnce.add(key);
  trackEvent(name, params, key);
}

/** A Google Ads conversion (its own `send_to` target). Advertising consent only; with GTM it is a tag on `generate_lead` instead. */
export function trackGoogleAdsConversion(adsId: string, conversionLabel: string, params: EventParams = {}, eventId?: string): void {
  if (typeof window === "undefined" || viaGtm() || !isTrackedPath(window.location.pathname) || !effectiveConsent().marketing) return;
  try {
    startTags();
    window.gtag?.("event", "conversion", { send_to: `${adsId}/${conversionLabel}`, ...sanitizeParams(params), ...(eventId ? { transaction_id: eventId } : {}) });
  } catch {
    // analytics is a supporting system, never a rendering dependency
  }
}

/** One page view per App Router navigation (gtag's automatic one is off, and client navigation never reloads the page). */
export function trackPageView(path: string, title: string): void {
  if (typeof window === "undefined" || !isTrackedPath(window.location.pathname)) return;
  const consent = effectiveConsent();
  if (!consent.analytics && !consent.marketing) return;
  try {
    startTags(consent);
    const page = { page_path: path, page_title: title, page_location: window.location.href };
    if (viaGtm()) {
      window.dataLayer!.push({ event: "page_view", ...page });
      return;
    }
    if (consent.analytics && analyticsConfig.ga4MeasurementId) window.gtag?.("event", "page_view", { ...page, send_to: analyticsConfig.ga4MeasurementId });
    if (consent.marketing && analyticsConfig.metaPixelId) window.fbq?.("track", "PageView");
  } catch {
    // analytics is a supporting system, never a rendering dependency
  }
}

/* ---------- withdrawal ---------- */

/** Deletes the Google/Meta first-party cookies on this host and its parent domain. */
export function clearTrackingCookies(pattern: RegExp): void {
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = ["", host, ...parts.slice(1).map((_, i) => parts.slice(i + 1).join(".")).filter((d) => d.includes("."))];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!pattern.test(name)) continue;
    for (const d of domains) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=.${d}` : ""}`;
  }
}

/** Whether a change turns off a category that was on. */
export const isWithdrawal = (prev: ConsentState, next: ConsentState) => (prev.analytics && !next.analytics) || (prev.marketing && !next.marketing);

/** True when tags from a category the visitor has just turned off are already running on this page, so only a reload removes them. */
export function needsReloadAfter(prev: ConsentState, next: ConsentState): boolean {
  if (!isWithdrawal(prev, next)) return false;
  if (viaGtm()) return started.gtm;
  return (started.ga4 && !next.analytics) || ((started.ads || started.meta) && !next.marketing);
}

/** Tells the running tags consent is gone before the page reloads without them. */
function signalWithdrawal(next: ConsentState): void {
  try {
    window.gtag?.("consent", "update", googleConsentSignals(next));
    if (!next.marketing) window.fbq?.("consent", "revoke");
  } catch {
    // the reload that follows removes the tags anyway
  }
}

/**
 * Records a choice from the banner and applies it at once:
 * - granting starts the allowed tags and counts the page being viewed (it was skipped while there was no consent);
 * - withdrawing tells the running tags, deletes their cookies and, if their scripts are already loaded on this page,
 *   reloads so that none remain. Essential site features are unaffected either way.
 */
export function applyConsentChoice(next: ConsentState): void {
  const prev = effectiveConsent();
  saveConsent(next);
  if (isWithdrawal(prev, next)) {
    signalWithdrawal(next);
    clearTrackingCookies(TRACKING_COOKIE_PATTERN);
    if (needsReloadAfter(prev, next)) {
      window.location.reload();
      return;
    }
  }
  const newlyGranted = (next.analytics && !prev.analytics) || (next.marketing && !prev.marketing);
  if (!newlyGranted) return;
  startTags(next);
  // Only the first grant on this page counts the page; a later upgrade (analytics → also advertising) would double it in GA4.
  if (!prev.analytics && !prev.marketing) trackPageView(window.location.pathname + window.location.search, document.title);
}
