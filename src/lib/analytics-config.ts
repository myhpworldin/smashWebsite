/**
 * Public analytics/measurement identifiers (Stage 4, Phase 5). Every one of
 * these is `NEXT_PUBLIC_*` — deliberately: a GA4 Measurement ID, a GTM
 * container ID, a Meta Pixel ID and a Google Ads conversion ID are all
 * already visible in any page's rendered HTML/network requests once loaded;
 * they identify *which* analytics property receives events, not a credential
 * that grants access to anything (phase brief §5). `MONGODB_URI`-style
 * secrecy does not apply here. Isomorphic like `site-url.ts`, for the same
 * reason: read directly, not through `server/config/env.ts` (server-only).
 *
 * None of these have real values yet — no GA4/GTM/Meta/Ads account has been
 * provided. Every provider below is conditionally rendered only when its id
 * is actually set (`Analytics.tsx`), so an unconfigured provider loads
 * nothing at all, rather than shipping a placeholder/fake id (phase brief
 * §21/§36: "Never replace missing credentials with fabricated values").
 */
export const analyticsConfig = {
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || undefined,
  gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || undefined,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined,
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || undefined,
  /** The one conversion action this codebase currently maps to (contact intent — see ANALYTICS_EVENTS.md). Additional actions need their own label var, following this same pattern, once they exist in a real Ads account. */
  googleAdsContactConversionLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CONVERSION_LABEL || undefined,
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
};
