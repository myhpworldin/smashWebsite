"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { analyticsConfig } from "@/lib/analytics-config";
import { applyConsentChoice } from "@/lib/analytics";
import { CONSENT_CHANGED_EVENT, CONSENT_STORAGE_KEY, effectiveConsent, hasChosen, OPEN_CONSENT_EVENT, type ConsentState } from "@/lib/consent";
import { ROUTES } from "@/lib/routes";
import styles from "./ConsentBanner.module.css";

const { gtmContainerId, ga4MeasurementId, googleAdsId, metaPixelId } = analyticsConfig;
/** Only the categories something is actually configured for are offered (GTM can carry either). */
const OFFERS_ANALYTICS = !!(gtmContainerId || ga4MeasurementId);
const OFFERS_MARKETING = !!(gtmContainerId || googleAdsId || metaPixelId);
const ANALYTICS_TOOLS = "Google Analytics";
const MARKETING_TOOLS = [googleAdsId || gtmContainerId ? "Google Ads" : null, metaPixelId || gtmContainerId ? "Meta" : null].filter(Boolean).join(" and ");

/** Re-reads the choice when it is made on this page or in another tab. */
function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_STORAGE_KEY) onChange();
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * The cookie choice. Shown until the visitor answers, and reopened from "Cookie settings" in the footer to change or
 * withdraw it. Rejecting is as easy as accepting (same size, same row), nothing is pre-ticked, and until a choice is
 * made no non-essential tag runs (`lib/analytics.ts`). It is a non-modal region, so the page stays usable.
 */
export function ConsentBanner() {
  // The choice lives in this browser only, so the server (and the first client render) treat it as made: the banner
  // appears after hydration for a visitor who has not answered, and never flashes for one who has.
  const chosen = useSyncExternalStore(subscribe, hasChosen, () => true);
  const [reopened, setReopened] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [choice, setChoice] = useState<ConsentState>({ analytics: false, marketing: false });
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reopen = () => {
      setChoice(effectiveConsent());
      setCustomise(true);
      setReopened(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (reopened) panelRef.current?.focus();
  }, [reopened]);

  if (chosen && !reopened) return null;

  const decide = (next: ConsentState) => {
    setReopened(false);
    setCustomise(false);
    applyConsentChoice(next);
  };

  return (
    <div ref={panelRef} role="region" aria-labelledby={titleId} tabIndex={-1} className={styles.banner} data-consent-banner>
      <h2 id={titleId} className={styles.title}>Your cookie choices</h2>
      <p className={styles.text}>
        We use only what is needed to run this site unless you agree to more.
        {OFFERS_ANALYTICS ? ` Analytics cookies (${ANALYTICS_TOOLS}) show us which pages and buttons are used.` : ""}
        {OFFERS_MARKETING ? ` Advertising cookies (${MARKETING_TOOLS}) measure whether our ads lead to enquiries.` : ""}
        {" "}Nothing you type into our forms is shared. Change your mind any time under &ldquo;Cookie settings&rdquo; at the foot of every page. <Link href={ROUTES.COOKIE_POLICY} className={styles.link}>Cookie Policy</Link>
      </p>

      {customise ? (
        <fieldset className={styles.options}>
          <legend className={styles.srOnly}>Cookie categories</legend>
          <label className={styles.option}>
            <input type="checkbox" checked disabled className={styles.switch} />
            <span><b>Strictly necessary</b> Always on. Keeps the site working and secure, and remembers this choice.</span>
          </label>
          {OFFERS_ANALYTICS ? (
            <label className={styles.option}>
              <input type="checkbox" checked={choice.analytics} onChange={(e) => setChoice((c) => ({ ...c, analytics: e.target.checked }))} className={styles.switch} />
              <span><b>Analytics</b> Pages viewed and buttons clicked, counted in aggregate.</span>
            </label>
          ) : null}
          {OFFERS_MARKETING ? (
            <label className={styles.option}>
              <input type="checkbox" checked={choice.marketing} onChange={(e) => setChoice((c) => ({ ...c, marketing: e.target.checked }))} className={styles.switch} />
              <span><b>Advertising</b> Measures our ad campaigns and may be used to show you relevant ads elsewhere.</span>
            </label>
          ) : null}
        </fieldset>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => decide({ analytics: false, marketing: false })}>Reject all</button>
        {customise ? (
          <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={() => decide({ analytics: OFFERS_ANALYTICS && choice.analytics, marketing: OFFERS_MARKETING && choice.marketing })}>Save choices</button>
        ) : (
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => setCustomise(true)}>Customise</button>
        )}
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={() => decide({ analytics: OFFERS_ANALYTICS, marketing: OFFERS_MARKETING })}>Accept all</button>
      </div>
    </div>
  );
}
