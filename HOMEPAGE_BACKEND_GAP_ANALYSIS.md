# Homepage backend gap analysis

Scope: the public Home page (`/`) only. CRM is on hold and untouched. Findings are from the repository as inspected before any change in this phase.

## 1. What exists

**Backend (complete and tested):** `home_page` singleton (`src/server/modules/home`), ordered reference lists to services, case studies, testimonials and insights (published-only join), `GET /api/home` with a fixed-shape DTO (`src/server/api/home.dto.ts`), admin write API (`PUT /api/admin/home`), publish rules (hero heading required, metrics need a verification source, canonical-conflict check), SEO metadata + Organization JSON-LD + sitemap entry, contract doc `HOME_PAGE_CONTRACT.md`.

**Frontend (the Figma build):** eleven section components in `src/components/home/`. **All of their copy, lists and image paths are imported from the static file `src/content/home.ts`.** `src/app/page.tsx` uses the backend for SEO metadata and JSON-LD only; `GET /api/home`, `getHome()` and the service/work/testimonial/insight references are never rendered. The data-driven section components (`src/components/sections/*`) that used to render the payload are no longer used by the Home page.

So the chain `database → query → service → API → component → page` is **broken at the last two links for every section**: nothing the editor saves changes the page.

## 2. Dependency map (before)

| Homepage section | Frontend component | Current data source | API | Backend model | Dynamic? | Missing? |
|---|---|---|---|---|---|---|
| Hero (H1, copy, 2 CTAs, banner, 3 glass pills, tag line) | `HomeHero` | `content/home.ts`, image path literal | `hero` | `home_page.hero` | No | Pills have no field (fit `whySmash`) |
| Business Proof (3 cards) | `ProofSection` | `content/home.ts` | `businessProof` | `home_page.businessProof` | No | – |
| Banner CTA (photo + "Let's Grow…") | `BannerCta` | `content/home.ts`, image literal | none | none | No | Section + media |
| SMASH Story (manifesto lines, paragraphs, CTA) | `BrandStory` | `content/home.ts` | `story` | `home_page.story` | No | – |
| Services (4 groups + bullet lists) | `ServiceGroups` | `content/home.ts` | `services` | Service records | No | Card lacks the bullet list; section intro has no CTA |
| Growth Engine (6 steps) | `GrowthEngine` | `content/home.ts` | `growthEngine` | `home_page.growthEngine` | No | – |
| Selected Work (case-study cards) | `CaseStudies` | `content/home.ts`, image literals, links to `/work` | `selectedWork` | CaseStudy records | No | Intro has no CTA |
| Industries ("Sectors We Scale") | `Industries` | `content/home.ts` | none | none | No | Section |
| Our Story (photo + text) | `OurStory` | `content/home.ts`, image literal | none | none | No | Section (+ lead line) |
| Team (founders / members) | `Team` | `content/home.ts`, image literals | none | `team_members` exists, not linked to Home | No | Home reference list; grouping field |
| Strong CTA ("Let's Talk Growth") | `TalkGrowth` | `content/home.ts` | `cta` | `home_page.cta` | No | – |
| Measurable Results, Why SMASH, Testimonials, Technology, Insights | none | – | `results`, `whySmash`, `testimonials`, `technology`, `insights` | supported | – | **Not in the approved Figma design.** Backend is complete; no UI is rendered (no redesign allowed) |

## 3. Gap list

| # | Section | Current implementation | Existing backend / API / CMS | Missing | Recommended fix | Priority | Risk | Now? |
|---|---|---|---|---|---|---|---|---|
| G1 | All rendered sections | Static file | Complete | Frontend not connected | Page composes the same DTO the API returns (`homeDto` + `publicizeMedia`), passes each section its data | CRITICAL | Medium (every section touched) | Yes |
| G2 | Hero pills | Static | `whySmash.items` fits ("We understand business…") | Mapping only | Render pills from `whySmash` | HIGH | Low | Yes |
| G3 | Banner CTA | Static | none | Section with heading, CTA, image | New optional `bannerCta` (reuses the CTA shape + `media`) | HIGH | Low | Yes |
| G4 | Industries | Static | none | Section | New optional `industries` (intro + names) | HIGH | Low | Yes |
| G5 | Our Story | Static | `story` is the *SMASH story*, a different block | Second story block + lead line | New optional `ourStory` (story shape + `lead`) | HIGH | Low | Yes |
| G6 | Team | Static | `team_members` (no public list on Home) | Home reference list, group label | New `home_team` link list + `teamSection` intro; optional `group` on team member | HIGH | Medium (new collection) | Yes |
| G7 | Services bullets | Static | Service records have `deliverables` | Card exposes no bullets | Home service card adds `highlights` (deliverable titles) | HIGH | Low | Yes |
| G8 | Section CTAs (View All Services, Let's Work Together) | Static labels | intros have no CTA | `cta` on section intro | Optional `cta` on the shared intro shape | MEDIUM | Low (additive) | Yes |
| G9 | Empty / unpublished / error | None: page always renders static copy | `getHome` throws NOT_FOUND when unpublished | Page states | Unpublished → neutral empty state; DB failure → existing error boundary; a `null` section is skipped | HIGH | Low | Yes |
| G10 | Links | `/work` for every case-study card | Cards carry canonical `path` | Use `path` | Link cards to `/work/{slug}`; CTAs only render when the target route exists | HIGH | Low | Yes |
| G11 | Dev/sample data | `[SAMPLE]` seed with no media | – | Seed matches the new shape | Seed the Home record (design copy, flagged for verification) | MEDIUM | Low | Yes |
| G12 | Team photo alt text | Literal | media alt required by schema | – | Comes from media `alt` | LOW | Low | Yes (with G1) |
| G13 | Results / Why / Testimonials / Technology / Insights UI | none | Complete | Design | None: needs a design | LOW | – | No |
| G14 | Unused data-driven section components | Unused by Home | – | – | Leave (dead code, not harmful); revisit with G13 | LOW | – | No |

## 4. Not a gap (verified working)

Published-only filtering and reference ordering; admin/internal field stripping (`source`, ids, status); metadata, canonical `https://smash.international/`, Open Graph, Twitter; sitemap includes `/` only while published; Organization JSON-LD from Site Settings only; rate limiting; response envelope; media URL validation; per-request memoisation (`getHome` is cached, so metadata, JSON-LD and page share one read).

## 5. Decisions

- Content is editable; presentation stays in code. Icons, glow ellipses, the manifesto's fading opacity ramp, and the two-row growth layout are presentation, keyed by position.
- Homepage bullets, chips and cards are content and move to the database; nothing is invented by the backend.
- The "highlighted last word" of the Story heading is a presentation rule (last word), not a stored field.
- No new keyword data, no schema claims beyond Site Settings.

## 6. Result after implementation

| Section | Backend before | Frontend before | Gap | Fix applied | Final status |
|---|---|---|---|---|---|
| Hero | Implemented | Hardcoded | G1, G2 | Rendered from `hero`; pills from `whySmash` | IMPLEMENTED |
| Business Proof | Implemented | Hardcoded | G1 | Rendered from `businessProof` | IMPLEMENTED |
| Banner CTA | Missing | Hardcoded | G3 | New `bannerCta` | IMPLEMENTED |
| SMASH Story | Implemented | Hardcoded | G1 | Rendered from `story` | IMPLEMENTED |
| Services | Implemented (no bullets, no CTA) | Hardcoded | G1, G7, G8 | `highlights`, intro `cta`, cards link to service pages | IMPLEMENTED |
| Growth Engine | Implemented | Hardcoded | G1 | Rendered from `growthEngine` | IMPLEMENTED |
| Selected Work | Implemented (no CTA) | Hardcoded, all cards to `/work` | G1, G8, G10 | Rendered from `selectedWork`; cards link to `/work/{slug}` | IMPLEMENTED |
| Industries | Missing | Hardcoded | G4 | New `industries` | IMPLEMENTED |
| Our Story | Missing | Hardcoded | G5 | New `ourStory` | IMPLEMENTED |
| Team | Not linked to Home | Hardcoded | G6 | `home_team` list, `teamSection`, member `group` | IMPLEMENTED |
| Closing CTA | Implemented | Hardcoded | G1 | Rendered from `cta` | IMPLEMENTED |
| Results / Why SMASH (as blocks) / Testimonials / Technology / Insights | Implemented | No block in the design | G13 | None; served by the API, not rendered | NOT REQUIRED by the current design |

## 7. Remaining (content, not code)

- Home SEO title and description are now required to publish an indexable Home (see SECURITY/API notes in API.md); Site Settings contact details and social links still need approved values.
- The design's placeholders (team names and "Designation", the case-study blurb, the team LinkedIn tiles that have no URL) need real content; the LinkedIn tile is decoration only until team members get a profile field.
- `/services` hub does not exist, so "View All Services" is hidden.
