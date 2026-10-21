# Analytics, lead tracking and consent

How the public website measures traffic and leads, what it sends, and what must be set up in Google and Meta. Code: `src/lib/analytics.ts` (events and tag loading), `src/lib/consent.ts` (the stored choice), `src/components/analytics/` (page views, click tracking, the cookie banner).

## Architecture

| Configured | What loads (only after consent) | Where events go |
|---|---|---|
| `NEXT_PUBLIC_GTM_CONTAINER_ID` set (recommended) | `gtm.js` only. GA4, Google Ads and Meta are tags **inside** the container. | `dataLayer.push({ event, ...params })` |
| No GTM | `gtag.js` (GA4 and/or Google Ads) and the Meta Pixel, directly | `gtag("event", …)` with `send_to` = the GA4 id; `fbq(…)` |

GTM and direct tags never both load, so nothing is counted twice. When a GTM id is set, the GA4, Meta and Ads ids are ignored by the site and belong in the container instead.

Nothing is measured on `/admin`, `/client`, `/preview` or `/api`.

All ids are public identifiers (`NEXT_PUBLIC_*`, see `src/lib/analytics-config.ts`), never secrets. With none set, the site loads no tag, shows no banner and no "Cookie settings" link.

## Consent

- **Opt-in for every visitor.** Until the visitor chooses, no analytics or advertising script is loaded and no event is recorded or queued. This is basic Consent Mode: Google receives no cookieless pings before consent.
- **Categories.** *Strictly necessary* is always on and covers the consent choice itself and the staff login cookie. *Analytics* is GA4. *Advertising* is Google Ads and Meta. Only categories with a configured tool are offered.
- **Banner.** "Reject all" and "Accept all" have the same size and weight. "Customise" shows per-category switches, and nothing is pre-ticked. The banner is a non-modal region, so the site stays usable while it is open.
- **Change or withdraw.** Use "Cookie settings" in the footer legal row on every page. Withdrawing does three things:
  - sends Consent Mode `denied` and `fbq('consent','revoke')`;
  - deletes the `_ga*`, `_gid`, `_gcl_*`, `_fbp` and `_fbc` cookies;
  - reloads the page if those scripts were already running, since a loaded script cannot be unloaded.
- **Storage.** The choice is kept in `localStorage` under `smash_consent` as `{ v, at, analytics, marketing }`. It is never a cookie and never sent to a server.
  - It is asked for again after 180 days.
  - It is also asked for again when `CONSENT_VERSION` in `src/lib/consent.ts` is increased. Do that after a material policy change.
- **Google Consent Mode v2.** `analytics_storage` follows *Analytics*. `ad_storage`, `ad_user_data` and `ad_personalization` follow *Advertising*. The default (`denied`) is set before any Google tag configures.

## Events

Event and parameter names are fixed, and they are the same for GTM, GA4 and Meta. Parameters are filtered before they leave the browser (`sanitizeParams`):
- known personal fields (`name`, `email`, `phone`, `message`, `company`…) are dropped;
- any value that looks like an email or phone number is dropped;
- any string over 100 characters is dropped.

| Event | When | Parameters | Meta |
|---|---|---|---|
| `page_view` | Every page, including App Router navigations. gtag's automatic page view is off. | `page_path`, `page_title`, `page_location` | `PageView` |
| `generate_lead` | **Only** after `POST /api/leads` returns success. Fired once per submission, keyed by a random submission id (`event_id`). Validation errors, server errors and network failures never fire it. | `form_name: "contact"`, `had_service_of_interest`, `event_id` | `Lead` (with `eventID`) |
| `whatsapp_click` | Any `wa.me` / `api.whatsapp.com` link | `page_path` | `Contact` |
| `phone_click` | Any `tel:` link | `page_path` | `Contact` |
| `email_click` | Any `mailto:` link | `page_path` | `Contact` |
| `contact_form_start` | First edit of the contact form | `form_name` | custom |
| `form_error` | Server rejected the form | `form_name`, `error_type` (field names only) | custom |
| `case_study_view`, `insight_view`, `service_page_engagement`, `related_content_click`, CTA events | As named | slugs, titles, thresholds | custom |

Google Ads, direct mode only: on `generate_lead` a `conversion` is sent to `NEXT_PUBLIC_GOOGLE_ADS_ID/NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CONVERSION_LABEL`, with `transaction_id` = the submission id. With GTM, add this as a tag instead (below).

## GTM container setup (manual, in tagmanager.google.com)

1. **Consent.** Admin → Container settings → enable *Consent overview*. The site sets Consent Mode defaults and updates itself, so do not add a consent-management template.
2. **Variables.** Data Layer Variables `event_id`, `form_name`, `page_path`, `page_title` and `page_location`.
3. **GA4.**
   - A *Google tag* with your `G-…` id, set to fire on *Initialization – All Pages*, with the configuration parameter `send_page_view` = `false`.
   - GA4 Event tags for `page_view`, `generate_lead`, `whatsapp_click`, `phone_click` and `email_click`, each fired by a Custom Event trigger of the same name and passing the variables above.
   - Built-in consent checks: `analytics_storage`.
4. **Google Ads.**
   - *Conversion Linker* on all pages.
   - A *Google Ads Conversion Tracking* tag on Custom Event `generate_lead`, with Transaction ID = `{{event_id}}`.
   - Built-in consent checks: `ad_storage`.
5. **Meta Pixel.** Use the Meta Pixel community template.
   - Fire *PageView* on Custom Event `page_view`.
   - Fire *Lead* on `generate_lead`, with Event ID = `{{event_id}}`.
   - Fire *Contact* on the three click events.
   - Set *Additional consent checks* → require `ad_storage`. This step is required, because GTM loads when only *Analytics* is accepted.
6. In GA4 (Admin → Events), mark `generate_lead` as a **key event**. Optionally mark the click events too.
7. Publish the container. Then set `NEXT_PUBLIC_GTM_CONTAINER_ID` in Vercel (Production only) and redeploy, because `NEXT_PUBLIC_` values are fixed at build time.

## Verifying

- **Unit tests:** `npx vitest run tests/analytics.test.ts`. They cover:
  - no load and no events before consent;
  - per-category loading;
  - GTM-only loading;
  - one lead per submission;
  - the personal-data filter;
  - withdrawal;
  - untracked paths.
- **Browser:**
  - with DevTools → Network filtered to `googletagmanager|google-analytics|facebook`, nothing appears until you accept;
  - after you accept, use GTM Preview (Tag Assistant) and GA4 DebugView;
  - submit a test lead with made-up details: exactly one `generate_lead`;
  - submit an invalid form: none;
  - click the phone, email and WhatsApp links;
  - check every payload for the absence of anything you typed.
- **Withdrawal:** in Cookie settings, choose Reject all. The page reloads, the `_ga`/`_fbp` cookies are gone and no request follows.
