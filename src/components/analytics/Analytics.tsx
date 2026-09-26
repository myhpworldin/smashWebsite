"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsConfig } from "@/lib/analytics-config";
import { trackEvent, trackPageView } from "@/lib/analytics";

/**
 * The one place any provider's script tag is loaded (phase brief §6/§8/§22):
 * no page or component adds its own. Each provider is entirely conditional on
 * its id actually being configured — with none set (the current state; no
 * real GA4/GTM/Meta/Ads account exists yet), this renders nothing and
 * `trackEvent` no-ops, so the site behaves exactly as it did before this
 * phase.
 *
 * **Real bug found and fixed during this phase's live verification:** the
 * `gtag`/`fbq` *shim* (the tiny function that queues calls into `dataLayer`/
 * `fbq.queue` — this is what makes calling `gtag(...)` safe before the real,
 * network-loaded provider script has finished loading, by Google's and
 * Meta's own design) was itself only defined by an `afterInteractive` script.
 * `afterInteractive` runs after hydration, same as any client component's
 * `useEffect` — there is no ordering guarantee between the two. A component
 * mounted earlier in the tree (`CaseStudyViewTracker`) could call
 * `trackEvent()` — and, since `window.gtag` was still `undefined` at that
 * exact moment, the optional-chained call silently no-op'd and the event was
 * dropped, with no error anywhere. Verified via Playwright: `case_study_view`
 * never reached `dataLayer`, while `page_view` (fired from a component higher
 * in the tree, which happened to win the race) did.
 *
 * **Fixed** by splitting each provider into two parts: a `beforeInteractive`
 * script that defines only the tiny synchronous shim (safe and recommended to
 * run this early — it has no network dependency, per Google/Meta's own
 * snippets), and an `afterInteractive` script that loads the actual remote
 * provider file (safe to defer — by the time it loads, it drains whatever the
 * shim already queued). This is the documented, correct integration pattern,
 * not a workaround.
 */
export function Analytics() {
  return (
    <>
      {analyticsConfig.ga4MeasurementId ? (
        <>
          {/* Shim only — must exist before any component's effect can call gtag(). No network dependency. */}
          {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- that rule targets the Pages Router's pages/_document.js; beforeInteractive in the App Router's root layout (this file's only render site) is the documented, supported pattern Next.js itself recommends. */}
          <Script id="ga4-shim" strategy="beforeInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              // send_page_view: false — page views are sent manually on route change (below), so App Router
              // navigation (which never reloads this script) doesn't produce a missing or duplicate pageview.
              gtag('config', '${analyticsConfig.ga4MeasurementId}', { send_page_view: false });
              ${analyticsConfig.googleAdsId ? `gtag('config', '${analyticsConfig.googleAdsId}');` : ""}`}
          </Script>
          {/* The real provider file, deferred — it processes whatever the shim already queued once it loads. */}
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.ga4MeasurementId}`} strategy="afterInteractive" />
        </>
      ) : null}

      {analyticsConfig.gtmContainerId ? (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${analyticsConfig.gtmContainerId}');`}
        </Script>
      ) : null}

      {analyticsConfig.metaPixelId ? (
        <>
          {/* Shim only, same reasoning as GA4's above — fbq's own queue (n.queue.push) is what makes calling fbq() safe before fbevents.js has loaded. */}
          {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- see the identical note on the GA4 shim above. */}
          <Script id="meta-pixel-shim" strategy="beforeInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window,document,'script');
              fbq('init', '${analyticsConfig.metaPixelId}');
              fbq('track', 'PageView');`}
          </Script>
          <Script src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
        </>
      ) : null}

      {/* usePathname/useSearchParams require a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <ClickTracker />
    </>
  );
}

/** Fires exactly one `page_view` per client-side navigation (initial load included — gtag's own automatic pageview is disabled above). */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const fullPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (lastTracked.current === fullPath) return; // StrictMode double-invoke / no-op re-renders never double-fire
    lastTracked.current = fullPath;
    trackPageView(fullPath, document.title);
  }, [pathname, searchParams]);

  return null;
}

/**
 * One delegated listener for the whole document (phase brief §9's "central
 * analytics layer", not per-component wiring): `tel:`/`mailto:` links are
 * tracked wherever they appear (Footer, Contact page, ...) without any of
 * those — currently server — components needing to become client components
 * just to attach an onClick. A `data-track-event`/`data-track-params` pair
 * (set by `Button.tsx` when a caller opts in) covers everything else — CTAs,
 * `book_strategy_call`. WhatsApp has no real link anywhere yet (no field in
 * the content model — CONTENT_GAP_REPORT.md §8), so that branch is dormant,
 * not fabricated: it starts working the moment a real WhatsApp link exists,
 * with no code change.
 */
function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest("a[href], [data-track-event]");
      if (!el) return;

      const href = el.getAttribute("href");
      if (href?.startsWith("tel:")) {
        trackEvent("phone_click", { page_path: window.location.pathname });
        return;
      }
      if (href?.startsWith("mailto:")) {
        trackEvent("email_click", { page_path: window.location.pathname });
        return;
      }
      if (href && /wa\.me|whatsapp\.com/.test(href)) {
        trackEvent("whatsapp_click", { page_path: window.location.pathname });
        return;
      }

      const eventName = el.getAttribute("data-track-event");
      if (eventName) {
        const raw = el.getAttribute("data-track-params");
        let params: Record<string, string> = {};
        if (raw) {
          try {
            params = JSON.parse(raw);
          } catch {
            // malformed attribute never breaks the click itself
          }
        }
        trackEvent(eventName, { ...params, page_path: window.location.pathname });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
