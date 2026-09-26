# Frontend architecture — Stage 3, Phase 1

What the frontend foundation actually is, and why. This is the code-level counterpart to Stage 2's content/SEO planning (`PAGE_SPECIFICATIONS.md`, `FRONTEND_INTEGRATION.md`) — those define *what* each page needs; this defines the *reusable machinery* every page is built from.

## 1. What existed before this phase

Audited before writing anything (phase brief §4): Next.js 16 App Router, TypeScript strict, zero CSS/styling architecture, zero components beyond `src/components/JsonLd.tsx`, zero design tokens, zero fonts, no `public/` directory, no animation library, no state-management library. Five page files existed (`/`, `/services/[slug]`, `/work/[slug]`, `/insights/[slug]`, `/careers/[slug]`), each a bare `<main><h1>{title}</h1></main>` — correctly minimal placeholders per Stage 1's own scope (`ARCHITECTURE.md` §9: "frontend pages... do not exist"). Nothing here was replaced; everything here is new.

## 2. Styling approach — decision and reasoning

**Plain CSS with CSS custom properties + CSS Modules per component. No Tailwind, no CSS-in-JS, no component library.**

Reasoning: no design tokens exist yet (§5 of the phase brief: "do not invent final visual values"). CSS custom properties are the smallest, most direct way to make every visual value swappable in one place (`src/app/globals.css`) the moment the designer supplies real values — no build-step reconfiguration, no dependency to add speculatively (phase brief §28: unnecessary dependencies work against the performance goal). CSS Modules give component-scoped class names with zero runtime cost, consistent with the project's existing conservative-dependency posture (`ARCHITECTURE.md` "Toolchain pins"). If the design system later specifies utility-class conventions that make Tailwind genuinely worth its weight, that's an additive, non-breaking change — no component here hardcodes a value that would need to be re-derived.

## 3. Design tokens

All in `src/app/globals.css` as CSS custom properties: color (semantic names — `--color-primary`, `--color-surface`, etc.), typography (a fixed semantic scale — display/h1/h2/h3/body/small/button/caption), spacing (a 9-step scale, `--space-1`…`--space-9`), radius, and motion durations. Every value is a **placeholder** (documented as such in the file's own header comment) — no real brand color, font, or spacing value exists anywhere in the project yet. Components reference tokens exclusively; a component's own CSS module never contains a literal color, font-size, or spacing value. Breakpoints (`src/lib/breakpoints.ts`) are the exact required QA widths (1440/1366/1024/768/430/390/360) as plain numbers, since a CSS media query cannot reference a custom property — this keeps one canonical source instead of two independently-maintained sets of numbers.

## 4. Global application structure

```
RootLayout (src/app/layout.tsx)
 ├── skip link (accessibility, §5)
 ├── Header (nav + mobile disclosure)
 ├── <main id="main-content"> — page content
 └── Footer (site-wide nav/contact/social, from real SiteSettings)
```

No page-specific layout logic lives in `RootLayout`, `Header`, or `Footer` (phase brief §7) — they render only what every page shares. Existing page files (`/`, `/services/[slug]`, etc.) had their own local `<main>` removed, since the layout now owns the one `<main>` landmark per page (a nested `<main>` is invalid HTML/ARIA and was a real defect introduced by adding the global layout — fixed as part of this phase, not left for later).

## 5. Routing

No route was added, renamed, or changed (phase brief §8) — the frontend consumes exactly the route table already frozen in Stage 2 (`src/lib/routes.ts`, `SEO_SITE_ARCHITECTURE.md`). Navigation labels (`src/lib/nav.ts`) use the approved sitemap's own terminology, and a route only becomes a visible nav link once its page file exists (`LIVE_STATIC_ROUTES`) — the same rule the Home API's `links` block already enforces, reused rather than reinvented.

## 6. SEO integration

Nothing new was built — the frontend foundation calls the existing centralized SEO system exactly as it was designed to be called: `generateMetadata` per page, `JsonLd` for structured data, both already wired on every existing page file. No component emits its own `<title>`/meta tag, and no generic fallback title ("SMASH | Page") was introduced — verified live: `/` renders `<title>[SAMPLE] Site name</title>` and full OG/canonical tags from the real resolver, not a hardcoded string.

## 7. API/content integration

Two deliberately different paths, matching `FRONTEND_INTEGRATION.md`'s existing guidance:
- **Server components** (all current pages) call the in-process, request-cached service functions in `src/server/seo/request-cache.ts` — the existing, faster convention. One addition this phase: `getSiteSettings`, needed by the global Footer, following the exact same pattern as `getHome`/`getService`/etc.
- **Future client components** get `src/lib/api-client.ts`, a thin typed `fetch` wrapper against the same-origin `/api/**` routes — no new public environment variable, no hardcoded API base URL anywhere.

## 8. Type-safe content contracts — one real bug found and fixed

While wiring components against the exported response types (`ServiceSummary`, `HomeResponse`, etc. from Stage 2 Phase 3), a genuine type/runtime mismatch was found: `publicGet()` (`src/server/api/handler.ts`) runs every response through `publicizeMedia`, which replaces every stored `Media`/`Video` object with its `PublicMedia`/`PublicVideo` projection **after** a DTO function returns. The exported types were `ReturnType<typeof dtoFunction>`, which describes the *pre-projection* shape — meaning `ServiceSummary.image`, as typed, did not match what the API actually sends over the wire for that field. **Fixed**: added `src/server/api/publicize-type.ts`, a `Publicize<T>` recursive type that maps `Media → PublicMedia` and `Video → PublicVideo` through any object/array shape, applied to every exported response type. Verified: `npm run typecheck` passes, and `Media`'s `Button`/`Media` components consume `PublicMedia` fields (`loading`, `srcSet`) that only exist post-projection — this would not type-check without the fix.

## 9. Accessibility foundation

Skip-to-content link; one `<main>` landmark; visible `:focus-visible` ring on every interactive element (token-driven, never removed for visual reasons); `Button` never renders a link as a `<button>` or vice versa (real anchor semantics for navigation, real `<button>` for actions); `FormField` wires `label`/`htmlFor`, `aria-invalid`, and `aria-describedby` for its error; `Media` treats `decorative` media as `alt=""` + `aria-hidden`; global `prefers-reduced-motion` disables all animation/transition durations project-wide as a safe default.

## 10. Responsive foundation

`Container` caps width and applies consistent inline padding; `Header`'s desktop nav/mobile toggle switch at the tablet breakpoint (768px, matching the required QA widths); no dependency on JavaScript-measured widths for the layout to hold. `overflow-x: hidden` on `html`/`body` is a deliberate backstop against the "no horizontal scroll" requirement (phase brief §14) while there is no real content yet to validate against; it is not a substitute for real responsive QA once pages have content, and should be revisited if a layout ever legitimately needs to overflow.

## 11. Loading / error / empty states

`src/app/error.tsx` (client error boundary, generic safe message, "Try again" resets — never renders `error.message`), `src/app/not-found.tsx` (one 404 page for unknown/draft/id-style slugs, matching `URL_CONVENTIONS.md`), `EmptyState` (reusable "nothing to show" component, neutral default copy, never invented marketing text), `Skeleton` (a generic loading placeholder component, still available for manual, scoped use).

**No global `src/app/loading.tsx`.** One existed from Phase 1 to Phase 4 and was removed in Stage 3, Phase 5 after it was found to break `notFound()`'s HTTP status on every dynamic detail page — see `SEO_INDEXING.md` "Invalid routes, redirects" for the full defect and fix. A route-level loading UI must from now on be a manually-placed `<Suspense>` boundary scoped *below* any `notFound()`/`redirect()` call, never a file-based `loading.tsx` at a segment that sits above one — and must be verified against a real production build + curl for every affected slug type before being added, since Vitest cannot exercise Next's actual page-streaming behavior.

## 12. Animation

No animation library was added — none is needed yet, and adding one speculatively would work against the performance goal (phase brief §28). The only motion in the foundation is a CSS `pulse` on `Skeleton`, itself disabled under `prefers-reduced-motion` (`globals.css`'s global reset already disables all animation/transition durations in that case). Real motion specs (trigger/duration/direction/easing/mobile/reduced-motion) are the designer's to define per phase brief §26 — nothing here anticipates them.

## 13. Verified end-to-end (not just typecheck/build)

Ran a real seeded database (`npm run db:dev -- --seed`) against a real `next dev` server and fetched live pages: `/` rendered Header → streamed main content (skeleton → real `<h1>[SAMPLE] Hero heading</h1>` plus Organization JSON-LD) → Footer with real `[SAMPLE] Site name` copyright line, correct `<title>`/canonical/OG tags, nav correctly showing zero links (every hub page is still unbuilt, so `available: false` correctly suppresses all of them — an empty nav is the honest current state, not a bug). `/services/sample-service` and `/careers/sample-role` returned 200; `/nonexistent-page` returned a real 404 rendering the custom not-found page. One real defect was found and fixed during this test (§14).

## 14. Real defect found and fixed: Footer breaking static generation

Building the Footer as global chrome (present on every page, including `/_not-found`) surfaced a genuine bug: `getDb()` throws *synchronously* when `MONGODB_URI` is unset; the request-cache wrapper for site settings returned `getSiteSettingsRecord(getDb()).catch(...)`, but since `getDb()` throws before the promise chain is even constructed, `.catch()` never attaches — a synchronous throw, not a rejected promise. This broke `next build`'s static prerender of `/_not-found` outright (a real, reproducible failure, not a typecheck-only issue). **Fixed** by making the wrapper an `async` function (`src/server/seo/request-cache.ts`), so any synchronous throw becomes a proper rejection the Footer's `.catch()` can see. Separately, the Footer's failure handling was widened from "swallow only `NOT_FOUND`" to "log and degrade on any failure," because the footer is supplementary chrome present on every page (including error/404 pages) — unlike a page's own primary content, which correctly hard-fails on a real outage so crawlers retry (`SEO_INDEXING.md` "Outages"), the footer must never be the reason an entire page (especially the error page itself) fails to render.

## 15. Not done in this phase (deliberately)

The complete Home page (all 12 sections assembled and styled), complete Service/Case-study/Insight pages, hub pages, About/Contact/Legal pages, any real visual design, any animation beyond the skeleton pulse, Tailwind or any other CSS framework, a component library dependency, CRM. All per phase brief §2/§31 — this is foundation only.

(Home was completed in Stage 3 Phases 2–3, Service pages in Phase 4, Work/Case-study pages in Phase 5, the Insights hub/article pages in Phase 6, About/Careers/Contact in Phase 7, and Legal in Stage 4 Phase 7 — routed and rendered, still content-blocked pending legal review, see `PAGE_SPECIFICATIONS.md` §14. Industries remains deliberately not built, see `PAGE_SPECIFICATIONS.md` §8.)

## 16. Real defect found and fixed (Stage 3, Phase 6): `Publicize<Date>` was broken

`Publicize<T>` (`src/server/api/publicize-type.ts`, §8 above) recurses into any `T extends object` via `{ [K in keyof T]: Publicize<T[K]> }`. `Date` is such an object, so `Publicize<Date>` was silently being rewritten into a structural mapped type over `Date`'s own methods (`toString`, `getTime`, etc.), each individually re-mapped through `Publicize` — producing a type with the right method *names* but the wrong (empty-object) method *signatures*, not an actual `Date`. Every prior field of type `Date` (`ServiceDetail.publishedAt`, `CaseStudyDetail.updatedAt`, ...) happened to go unused as a `Date` (never had a method called on it) until the Insights article page (`InsightHeader.tsx`) called `.toLocaleDateString()`/`.toISOString()` on `insight.publishedAt`, which surfaced two real type errors. **Fixed** by adding a `T extends Date ? Date : ...` branch before the generic object case, so `Date` fields keep their real type everywhere `Publicize` is used, not just for the field that happened to expose the bug.

## 17. Insights markdown rendering — no dependency added

`insights.content` (`insights.schema.ts`) is documented as "Markdown" but there is no CMS rich-text editor and no markdown dependency in the project (`package.json` lists 7 runtime dependencies total — deliberately minimal, §2 above). Rather than add one, `src/components/content/MarkdownContent.tsx` is a small hand-written block/inline parser covering exactly the structures the Stage 3 Phase 6 brief names (headings, paragraphs, lists, blockquotes, links, images, bold/italic) and nothing else; it never uses `dangerouslySetInnerHTML`, so there is no injection surface. Heading syntax is capped at `##`/`###` (mapped to `h2`/`h3`) — a bare `#` is deliberately not treated as a heading, since the article's one `<h1>` is the title rendered by `InsightHeader`, and the phase brief explicitly forbids a second, unrelated `<h1>` (§14).

## 18. Stage 3, Phase 8 — responsive audit findings

Audited every component's CSS and, for the first time, verified live in a real browser rather than by code review alone: Playwright (already cached on this machine from prior use, not added as a project dependency) drove real Chromium across all 11 live pages × the 7 required widths (1440/1366/1024/768/430/390/360), checking `document.documentElement.scrollWidth` against `clientWidth` — zero horizontal overflow found or introduced. Firefox and WebKit engines are also cached locally but at binary revisions this Playwright version doesn't recognize (`firefox-1522`/`webkit-2287` expected vs. `firefox-1538`/`webkit-2336` present) — installing matching binaries needs network access this task didn't use speculatively, so only Chromium (covering Chrome and Edge, same rendering engine) was verified live; Safari/Firefox-specific rendering was reviewed by CSS inspection only, not tested live. This should be re-run with matching browser binaries before real cross-browser sign-off.

**Two real, previously-latent bugs found and fixed** (would only surface with real, non-seed content — the current sample data never exercises them): `TestimonialCard`'s avatar and `ToolList`'s logo images had no CSS size constraint of their own, relying entirely on the stored photo/logo's own intrinsic `width`/`height`. A real testimonial photo or tool logo larger than the seed's small placeholders would have rendered at (near) full size, breaking the card layout at every breakpoint, not just mobile. **Fixed** with explicit CSS boxes (`TestimonialCard.module.css` `.avatar`/`.avatarImage`: fixed 48×48, `object-fit: cover`; `ToolList.module.css` `.logo`: `max-width`/`max-height` with `object-fit: contain`) and verified live by substituting a 3000×3000 photo and a 2500×800 logo into the seeded database — both rendered at their constrained size with zero overflow (Playwright `boundingBox()` check).

**Performance fix:** none of the 14 `<Media>` call sites passed a `sizes` prop, so `next/image` had no way to know how much of the viewport each image actually occupies at a given breakpoint and fell back to device-pixel-ratio-only srcset selection — a real, if quiet, mobile payload cost. Fixed at the architectural level (§30 of the phase brief: fix the underlying system, not each call site) by giving `Media` a sensible default (`"(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"`, matching `CardGrid`'s real 1/2/3-column breakpoints — the majority of real usages), with the handful of full-bleed callers (`Hero`, `CaseStudyHeader`, `InsightHeader`, `StorySection`) and the two-column `MediaGallery` passing their own explicit `sizes` instead of getting the wrong default.

**Accessibility fix:** the mobile navigation disclosure (`MobileNavToggle.tsx`) had no Escape-to-close, no focus return to the trigger button, and no outside-click dismissal — baseline expectations for this pattern (WAI-ARIA disclosure), not cosmetic polish. Fixed and verified live (Playwright): Escape closes the panel and returns focus to the button, an outside click closes it, and the button's touch target measures a real 44×44px in the rendered page.

**Root-cause fix, not a patch:** `ContactForm`'s off-screen honeypot field was positioned absolutely against the page's initial containing block (no positioned ancestor), relying entirely on the global `html, body { overflow-x: hidden }` backstop (`globals.css`, itself documented since Phase 1 as "not a substitute for real responsive QA") to stay invisible-and-harmless. Gave `.form` `position: relative` so the honeypot's offset is contained at its own source, per the phase brief's §30 instruction to fix root causes rather than lean on a blanket `overflow-x: hidden`.

**Not applicable — no video exists to make responsive:** `HeroSection.video`/`homeCtaSchema` etc. carry a `video` field in the content model and it survives all the way to the public API (`sections.ts` `heroDto`), but no frontend component has ever rendered it — `Hero.tsx` only renders `hero.image`. Building a video player now would be a new feature, not a responsive fix to an existing one, and is out of this phase's scope (§2: "do not introduce unrelated features"); flagged for whichever phase actually adds video rendering.

No other component required a change: the existing breakpoint system (`CardGrid`, `Header`, `Footer`, `MediaGallery`, `TitledItemList` — 8 media queries in the whole project, all `min-width`, mobile-first) already matched the required breakpoints and needed no new ones, consistent with the phase brief's §6 instruction to prefer the existing system over one-off overrides.
