/**
 * The one place any UI component reaches an analytics provider (phase brief
 * §9): `UI Component → trackEvent() → GA4 / Meta`, never
 * `Hero → GA4 code, Contact → Meta code` scattered per component. See
 * ANALYTICS_EVENTS.md for the full event list and which are conversions.
 *
 * Google Ads reuses the same `gtag()` call GA4 already loads (both are the
 * gtag.js library) — no separate Ads script or duplicate initialization.
 */
"use client";

type EventParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires one event to every initialized provider. Never throws (phase brief
 * §37: "analytics failure must NOT break the website") — a provider that
 * failed to load, or isn't configured at all, is silently skipped, not an
 * error. The same event name/params go to both GA4 and Meta (as a custom
 * event) so the two providers never drift into different vocabularies for
 * the same real action.
 */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
  } catch {
    // analytics is a supporting system, never a rendering dependency
  }
  try {
    window.fbq?.("trackCustom", name, params);
  } catch {
    // same
  }
}

/** A Google Ads conversion is a distinct `gtag` call (its own `send_to` target), not a GA4 custom event — fired only when that conversion's label is actually configured. */
export function trackGoogleAdsConversion(adsId: string, conversionLabel: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "conversion", { send_to: `${adsId}/${conversionLabel}`, ...params });
  } catch {
    // analytics is a supporting system, never a rendering dependency
  }
}

/** GA4 page_view — called manually on every client-side route change (see `Analytics.tsx`), since App Router navigation never reloads gtag.js's own automatic pageview. */
export function trackPageView(path: string, title: string): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "page_view", { page_path: path, page_title: title, page_location: window.location.href });
  } catch {
    // analytics is a supporting system, never a rendering dependency
  }
}
