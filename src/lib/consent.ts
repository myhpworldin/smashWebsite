/**
 * The visitor's cookie choice: the only gate between this site and any non-essential tag (`Analytics.tsx`).
 *
 * Opt-in: until a visitor says yes, both categories are off and nothing third-party loads. The choice is kept in
 * `localStorage` (never a cookie, so it is not sent with every request and no server reads it) together with the
 * policy version it was given under; bumping `CONSENT_VERSION` asks everyone again, which is what the Privacy Policy
 * promises after a material change. Storage that throws (private mode, blocked site data) simply means "no choice yet".
 */

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "smash_consent";
/** Fired on `window` whenever the choice changes (detail: `ConsentState`), and to ask the banner to reopen. */
export const CONSENT_CHANGED_EVENT = "smash:consent-changed";
export const OPEN_CONSENT_EVENT = "smash:open-consent";
/** A choice older than this is asked for again (about six months, a common regulator guideline). */
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export type ConsentCategory = "analytics" | "marketing";
export type ConsentState = { analytics: boolean; marketing: boolean };
type Stored = ConsentState & { v: number; at: number };

export const NO_CONSENT: ConsentState = { analytics: false, marketing: false };

/** Parses a stored value. Anything unreadable, from an older policy version or too old counts as no choice. */
export function parseConsent(raw: string | null, now = Date.now()): ConsentState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Stored>;
    if (s.v !== CONSENT_VERSION || typeof s.at !== "number" || now - s.at > CONSENT_MAX_AGE_MS || s.at > now + 60_000) return null;
    return { analytics: s.analytics === true, marketing: s.marketing === true };
  } catch {
    return null;
  }
}

export const serializeConsent = (state: ConsentState, now = Date.now()) =>
  JSON.stringify({ v: CONSENT_VERSION, at: now, analytics: state.analytics, marketing: state.marketing } satisfies Stored);

export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** The latest choice on this page; also the fallback for a browser that refuses storage, so a choice still holds until the page is left. */
let memory: ConsentState | null = null;

export function saveConsent(state: ConsentState): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(state));
  } catch {
    // Not stored: the banner asks again next visit, and this page still honours the choice in memory below.
  }
  memory = state;
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_CHANGED_EVENT, { detail: state }));
}

/** What tags may do right now: the choice made on this page, else the stored one, else nothing at all. */
export const effectiveConsent = (): ConsentState => memory ?? readConsent() ?? NO_CONSENT;
/** Whether the visitor has answered at all (the banner shows until they have). */
export const hasChosen = () => memory !== null || readConsent() !== null;

/** Google Consent Mode v2 signals for a choice. Personalisation and user data follow the advertising choice. */
export function googleConsentSignals(state: ConsentState) {
  const g = (on: boolean) => (on ? "granted" : "denied");
  return {
    analytics_storage: g(state.analytics),
    ad_storage: g(state.marketing),
    ad_user_data: g(state.marketing),
    ad_personalization: g(state.marketing),
  };
}

/** First-party cookies the Google and Meta tags set (Cookie Policy, "Cookies you may see"), cleared on withdrawal. */
export const TRACKING_COOKIE_PATTERN = /^(_ga(_.*)?|_gid|_gat.*|_gcl_.*|_fbp|_fbc)$/;
