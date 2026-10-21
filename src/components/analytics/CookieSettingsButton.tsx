"use client";

import { isAnalyticsConfigured } from "@/lib/analytics-config";
import { OPEN_CONSENT_EVENT } from "@/lib/consent";

/** Reopens the cookie banner so a visitor can change or withdraw their choice. Hidden while no tag is configured (there is no choice to make). */
export function CookieSettingsButton({ className }: { className?: string }) {
  if (!isAnalyticsConfigured) return null;
  return (
    <li>
      <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>Cookie settings</button>
    </li>
  );
}
