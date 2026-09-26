"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** How long a visitor must stay on a service page before it counts as real engagement, not a bounce. Documented here since the phase brief requires the threshold to be explicit (§18). */
export const ENGAGEMENT_THRESHOLD_MS = 15_000;

/**
 * Fires `service_page_engagement` once, after `ENGAGEMENT_THRESHOLD_MS` of
 * the page being open — not on scroll position, and not repeatedly (phase
 * brief §18: "not on every scroll pixel"). If the visitor navigates away
 * first, the timer is cleared and nothing fires — a real bounce is correctly
 * not counted as engagement.
 */
export function ServiceEngagementTracker({ slug, name }: { slug: string; name: string }) {
  useEffect(() => {
    const timer = setTimeout(() => trackEvent("service_page_engagement", { service_slug: slug, service_name: name, threshold_ms: ENGAGEMENT_THRESHOLD_MS }), ENGAGEMENT_THRESHOLD_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  return null;
}
