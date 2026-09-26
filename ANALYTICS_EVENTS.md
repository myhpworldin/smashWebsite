# Analytics events — Stage 4, Phase 5

The public website's analytics/event-tracking architecture: what's implemented, what isn't, and why. No provider account (GA4, GTM, Meta, Google Ads, Search Console) has real credentials yet — every identifier is read from an environment variable that is currently unset, so **nothing loads and no event fires anywhere in production today**. This phase built and verified the mechanism, not fake production configuration (per the phase brief's own rule: never replace a missing credential with a fabricated one).

## 1. Architecture

```
UI Component ──▶ trackEvent() (src/lib/analytics.ts) ──▶ GA4 (gtag) + Meta (fbq, as a custom event)
```

One function, one place. No component calls a provider SDK directly. `src/components/analytics/Analytics.tsx` is the only place any provider's `<script>` is loaded, rendered once from the root layout (`src/app/layout.tsx`). Every provider is entirely conditional on its own id being configured (`src/lib/analytics-config.ts`) — configuring GA4 alone does not enable Meta, and vice versa.

**Event delivery is two-layered:**
1. A tiny synchronous "shim" (Google's and Meta's own recommended pattern) is defined via a `beforeInteractive` script, so `window.gtag`/`window.fbq` exist before any page component's own effects run and can safely queue events even before the real, network-loaded provider script finishes loading.
2. The real provider file loads afterward (`afterInteractive`, never blocking first render) and drains whatever was already queued.

**CTA/link tracking uses one delegated click listener** (`ClickTracker` in `Analytics.tsx`), not per-component `onClick` handlers: `tel:`/`mailto:`/WhatsApp links anywhere on the site are tracked automatically by their `href`, and any `Button` given a `trackEvent` prop renders plain `data-track-event`/`data-track-params` attributes the listener reads — so most existing server components (Footer, Contact page) needed no code changes at all to become tracked.

## 2. Events implemented

| Event | Trigger | Parameters | Interaction | Conversion |
|---|---|---|---|---|
| `page_view` | Every page render, initial load and client-side navigation | `page_path`, `page_title`, `page_location` | Yes | No |
| `cta_click` | Any tracked CTA button whose target is not `/contact` | `cta_label`, `cta_target`, `page_path` | Yes | No |
| `book_strategy_call` | Any tracked CTA button whose target **is** `/contact` — the site's one objectively identifiable "intent to talk to SMASH" action | `cta_label`, `cta_target`, `page_path` | Yes | **Yes** |
| `contact_form_start` | A visitor makes their first edit to any real field in the contact form (Stage 6, Phase 4) — fires once per page load, never for the hidden honeypot field | `form_name` | Yes | No |
| `contact_form_submit` | The contact form (`/contact`) successfully submits | `form_name`, `had_service_of_interest` (boolean only — never the value) | Yes | **Yes** |
| `form_error` | The contact form is rejected by server-side validation | `form_name`, `error_type` (the failed field names, joined — never the submitted values) | Yes | No |
| `whatsapp_click` | A link to `wa.me`/`whatsapp.com` is clicked | `page_path` | Yes | Potential — **live once configured, see §4** |
| `phone_click` | Any `tel:` link is clicked, anywhere on the site | `page_path` | Yes | Potential |
| `email_click` | Any `mailto:` link is clicked, anywhere on the site | `page_path` | Yes | Potential |
| `case_study_view` | A Case Study detail page renders | `case_study_slug`, `case_study_name`, `industry` (only if the case study has one) | Yes | No |
| `insight_view` | An Insight/article detail page renders (Stage 4, Phase 6) | `insight_slug`, `insight_title`, `category` (only if set) | Yes | No |
| `related_content_click` | A "Related Services"/"Related Case Studies"/"Related Insights" link is clicked, on a Service, Case Study, or Insight page (Stage 4, Phase 6) | `source_type` (the page it was clicked from), `target_type`/`target_slug` (derived from the link's own path, never guessed), `page_path` | Yes | No |
| `service_page_engagement` | A visitor remains on a Service detail page for 15 continuous seconds (`ENGAGEMENT_THRESHOLD_MS`, `ServiceEngagementTracker.tsx`) — not scroll depth, and never repeated | `service_slug`, `service_name`, `threshold_ms` | Yes | No |
| `conversion` (Google Ads only) | Fired alongside `contact_form_submit`, only when both `NEXT_PUBLIC_GOOGLE_ADS_ID` and `NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CONVERSION_LABEL` are set | `send_to` (`<ads-id>/<label>`) | — | **Yes** |

No submitted personal data (name, email address, phone number, message content) is ever sent as an event parameter — verified live (Playwright) by inspecting every event fired during a real form submission.

**`contact_form_view` — not implemented, deliberately.** Stage 6, Phase 4's brief lists this alongside `contact_form_start`. It would be identical to the existing `page_view` event scoped to `page_path === "/contact"` — a second event name for the same action ANALYTICS_EVENTS.md's own "one consistent naming convention" rule (Stage 4, Phase 5) exists to prevent. Anyone building a funnel (view → start → submit) can filter `page_view` by path for the first step.

## 3. Providers

| Provider | Status | Configured via |
|---|---|---|
| GA4 | Built, **pending a real Measurement ID** | `NEXT_PUBLIC_GA4_MEASUREMENT_ID` |
| Google Tag Manager | Built, **pending a real Container ID** | `NEXT_PUBLIC_GTM_CONTAINER_ID` |
| Meta Pixel | Built, **pending a real Pixel ID** | `NEXT_PUBLIC_META_PIXEL_ID` |
| Google Ads conversion tracking | Built, **pending a real Ads account** (id + at least one conversion label) | `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CONVERSION_LABEL` |
| Google Search Console verification | Built, **pending a real verification value** | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` |
| Meta Conversions API (server-side) | **Not implemented** — see §5 | — |

All are `NEXT_PUBLIC_*` (browser-visible) deliberately: a measurement/container/pixel/conversion id is not a credential, it only identifies which analytics property receives events (see `analytics-config.ts`'s own comment).

## 3a. `insight_share_click` — not implemented (no UI exists)

Stage 4, Phase 6's brief lists `insight_share_click` as a potential event. No social-share button or UI exists anywhere on the site — building one now would be inventing a UI element beyond the approved design system (out of an analytics phase's scope), not attaching tracking to something real. This stays undocumented as an event (unlike `whatsapp_click` below, whose *listener* is already live and dormant only for lack of a link) until a real share control exists to attach it to.

## 4. WhatsApp — live once a number is configured (Stage 6, Phase 4)

`SiteSettings.contact.whatsapp` now exists, and the Contact page and Footer both render an official `wa.me` click-to-chat link (`lib/whatsapp.ts`) once a real number is set — no analytics code change was needed: the click listener already recognized `wa.me`/`whatsapp.com` links and fires `whatsapp_click` for any link matching that pattern, exactly as designed when this was still dormant. With no number configured (the current state — nothing has been set yet), nothing renders and the event never fires, which is the correct, honest behavior for unconfigured content, not a bug.

## 5. Real business claim: not implemented, not faked

**Meta Conversions API (server-side)** was evaluated and is genuinely **not feasible** in this phase: it requires a real Meta Business account, a generated system-user access token (a real secret, unlike the browser-visible pixel id), and a server-side endpoint to forward events — none of which exist. Per the phase brief's own instruction ("not feasible → document as future work"), this is deferred, not stubbed with fake credentials.

## 6. SEO safety (verified)

- **Canonical URLs are untouched.** `resolveCanonical`/`canonicalUrl` (`SEO_INDEXING.md`) already strip every query string, including UTM parameters — this phase added no code to that path and re-confirmed it by running the full existing SEO test suite (unchanged, still passing).
- **Client-side page views still use the real URL** (`window.location.href`, including any `?utm_*` parameters) for attribution — analytics and canonical resolution are two separate, non-interacting code paths by design.
- **No tracking parameter is ever added to a visible link, a sitemap entry, or a canonical URL.** The click listener reads `href`/`data-track-*` attributes already present in the DOM; it never rewrites a link's destination.
- **`robots.txt`, the sitemap, and every page's `<meta name="robots">`/`X-Robots-Tag` are unaffected** — `Analytics.tsx` renders only `<script>` tags and two `null`-returning tracking components, nothing that touches `<head>` metadata except the one, explicitly conditional `verification.google` field.

## 7. Privacy and data minimization

- No PII (name, email, phone number, message body) is ever a parameter on any event — verified live.
- `phone_click`/`email_click`/`whatsapp_click` send only `page_path`, never the actual number/address/message.
- `form_error` sends which fields failed, never the values submitted.
- **No cookie-consent system exists in this project** (verified: none was found anywhere in the codebase before this phase, and none was added). This is a real, honest gap, not silently assumed away: GA4/GTM/Meta all set their own first-party cookies once configured with a real id, and none of that is currently gated behind a consent decision. **Before enabling any real provider ID in production, the project needs a consent mechanism** appropriate to its actual audience/jurisdiction — that is a legal/compliance decision, not an engineering one, and is out of this phase's scope to invent.

## 8. Performance

- Every script uses `beforeInteractive` (shims only, synchronous, no network call) or `afterInteractive` (the real provider files) — nothing blocks first paint.
- One delegated click listener for the whole document, not one per tracked element.
- `trackEvent`/`trackPageView`/`trackGoogleAdsConversion` never throw — a provider failing to load cannot break page rendering or any other functionality (verified: the whole regression suite passes with zero analytics configuration, i.e. every provider entirely absent).

## 9. Real bug found and fixed during this phase

`window.gtag`/`window.fbq`'s *shim* functions were originally defined by `afterInteractive` scripts. `afterInteractive` runs after hydration — the same timing bucket as any client component's own `useEffect` — with no ordering guarantee between the two. A component mounted earlier in the tree (`CaseStudyViewTracker`) could call `trackEvent()` before the shim existed; since the call is optional-chained (`window.gtag?.(...)`), it silently no-op'd with no error, and the event was lost. Verified live with Playwright: `case_study_view` never reached `dataLayer`, while `page_view` (fired from a component that happened to mount later) did. **Fixed** by splitting each provider into a `beforeInteractive` shim-definition script (synchronous, no network dependency — safe this early, and exactly how Google/Meta's own snippets are designed to be used) and an `afterInteractive` script that loads the real remote file. Re-verified live: every event now fires exactly once, in every tested scenario.

## 10. Testing performed

Real Chromium (Playwright), against a production build with test-only identifiers (`G-TESTID123`, `AW-TESTADS1` — never committed, never real) to prove the mechanism, and separately against a production build with **no** identifiers configured to prove the current, real production state is inert:

- With no config: zero analytics scripts injected, zero network requests to any provider, full regression suite (267 tests) still passing.
- With test config: `page_view` fires exactly once on initial load and exactly once per client-side navigation (no duplicates, no gaps) across Home → Work; `email_click`/`phone_click` fire from the Footer with no code changes to the Footer; `book_strategy_call` fires for a CTA targeting `/contact`; `service_page_engagement` fires once after the real 15-second threshold; `case_study_view` fires once per Case Study page load; `contact_form_submit` fires on real successful submission alongside a Google Ads `conversion` event when both Ads variables are set; no submitted personal data appeared in any event payload.
