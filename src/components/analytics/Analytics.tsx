"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isAnalyticsConfigured } from "@/lib/analytics-config";
import { isTrackedPath, startTags, trackEvent, trackPageView } from "@/lib/analytics";
import { ConsentBanner } from "./ConsentBanner";

/**
 * Measurement for the whole site, mounted once in the root layout. It renders nothing visible except the cookie
 * banner, and with no provider id configured it renders nothing at all and the site behaves exactly as before.
 *
 * Nothing here loads a third-party script by itself: `startTags` (lib/analytics.ts) loads only what the visitor's
 * stored consent allows, and with no choice yet that is nothing. The banner records the choice; see `ConsentBanner`.
 */
export function Analytics() {
  const pathname = usePathname() ?? "/";
  const tracked = isTrackedPath(pathname);

  useEffect(() => {
    if (isAnalyticsConfigured && tracked) startTags();
  }, [tracked]);

  if (!isAnalyticsConfigured) return null;
  return (
    <>
      {/* usePathname/useSearchParams require a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <ClickTracker />
      {tracked ? <ConsentBanner /> : null}
    </>
  );
}

/** Fires exactly one `page_view` per client-side navigation (initial load included — gtag's own automatic pageview is off). Without consent it does nothing. */
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
 * One delegated listener for the whole document (phase brief §9's "central analytics layer", not per-component
 * wiring): `tel:`, `mailto:` and WhatsApp (`wa.me` / `api.whatsapp.com`) links are tracked wherever they appear
 * (Footer, Contact page, FAQ, Legal pages...) without those server components becoming client components. A
 * `data-track-event`/`data-track-params` pair (set by `Button.tsx` when a caller opts in) covers everything else.
 * Only the page path goes with a contact click, never the number or address clicked.
 */
function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.("a[href], [data-track-event]");
      if (!el) return;
      const page = { page_path: window.location.pathname };

      const href = el.getAttribute("href") ?? "";
      if (/^tel:/i.test(href)) return trackEvent("phone_click", page);
      if (/^mailto:/i.test(href)) return trackEvent("email_click", page);
      if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//i.test(href)) return trackEvent("whatsapp_click", page);

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
        trackEvent(eventName, { ...params, ...page });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
