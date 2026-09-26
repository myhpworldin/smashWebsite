> **Historical record.** This sign-off was performed when the database was PostgreSQL (Drizzle, PGlite). The project has since moved to MongoDB; the database-specific findings below (foreign keys, SQL constraints, PGlite) describe the earlier engine. See CONTENT_ARCHITECTURE.md "Verified integrity" for the current equivalents.

# Stage 1 verification and sign-off

This document records what was actually inspected, tested and fixed during Phase 10, as evidence for the sign-off report given to the user. It is not a restatement of earlier phase reports; those are treated as claims to verify, not facts.

## Method

For each area: read the actual code → write or extend a test that exercises real behaviour (not the implementation's own helpers) → where practical, run the built app against a real PostgreSQL wire-protocol server (`npm run db:dev`, backed by PGlite) → fix what failed → rerun.

New test file: `tests/verification.test.ts` (44 tests). Extended: `tests/security.test.ts`, `tests/seo-metadata.test.ts`, `tests/indexing.test.ts`. Total suite: **243 tests across 9 files, 0 failures**, run against the real migrated PostgreSQL schema (PGlite).

## Phase traceability matrix

| Phase | Requirement | Implemented | Verified | Issue found | Action |
|---|---|:---:|:---:|---|---|
| 1 | Architecture, layering, config | Yes | Yes | Stale docs (`db/repositories`, old Phase numbers, CMS env vars never used) | Docs corrected; unused `CMS_API_URL`/`CMS_API_TOKEN` and empty `db/repositories`, `server/middleware` removed |
| 2 | Content models, publishing | Yes | Yes | None in code. Confirmed FK delete rules, slug/singleton/publish constraints hold even for raw SQL | Documented the verified integrity in CONTENT_ARCHITECTURE.md |
| 3 | SEO routes, slugs | Yes | Yes | Slugs written for search engines (`best-top-leading-…`) were syntactically valid with no signal | Added `slugStyleWarnings` (editorial warning only, never blocks) |
| 4 | SEO metadata, schema | Yes | Yes | None found beyond Phase 8 fixes already in place | — |
| 5 | Content APIs | Yes | Yes | 4 unused exported functions (`updateCareer`, `listPublishedCareers`, `updateTestimonial`, unused type) — dead code, not a defect | Left in place: they are the only write/read path for those two content types pending an admin surface; verified directly in `verification.test.ts` |
| 6 | Security/validation | Yes | Yes | **Rate limiter pooled every client with no `x-forwarded-for` into one shared bucket** — 120 anonymous requests would lock out all other anonymous visitors | Fixed: no address ⇒ not rate-limited (edge/CDN limits cover that case) |
| 7 | Media | Yes | Yes | None found beyond what Phase 7 already verified | — |
| 8 | Sitemap/robots/schema | Yes | Yes | Canonical audit did not detect chains (A→B→C) or loops (A⇄B), only missing targets | Fixed: `auditSitemap` now follows one hop and flags a target whose own canonical differs |
| 9 | Home backend | Yes | Yes | None found beyond what Phase 9 already verified | — |
| 10 | This phase | Yes | Yes | See "Bugs found and fixed" below | — |

## Database verification

Ran directly against the real migrated schema (`pg_constraint`, `pg_indexes`, raw SQL), not through the application layer:

- **17 tables**, matching the nine content entities, four Home link tables, three content-relationship link tables, and `redirects`.
- **Every foreign key has an explicit delete rule**: single references (`client_id`, `testimonial_id`, `author_id`) are `SET NULL`; every link-table reference is `CASCADE`. Verified by deleting a service, client, team member, case study and testimonial that were referenced everywhere and confirming zero orphan rows remained in every link table, and that a case study whose client was deleted behind the application's back still serves correctly with `client: null`.
- **Constraints enforced even for direct SQL**, bypassing the application: slug format, per-table slug uniqueness (`23505`), `published ⇒ published_at`, the two singleton tables, and `redirects.from_path ≠ to_path`.
- **Accepted, documented gap**: 6 of 18 foreign-key columns have no index of their own (the reverse side of the four `home_*` link tables, plus `case_studies.testimonial_id` and `insights.author_id`). They are scanned only when a parent row is deleted, on tables expected to hold tens to hundreds of rows. Not fixed; listed explicitly in a test so a future foreign key is reviewed rather than silently added to the same category.
- `createdAt` verified stable and `updatedAt` verified to advance across an update.

## API verification

Every collection and slug endpoint was tested against the actual route handlers (not the underlying service functions) for: 200 with data, 200 with an empty dataset, pagination (including a page past the end, and that three pages of two never overlap or repeat), all seven invalid-query cases, valid slug, unknown slug, draft slug (content-indistinguishable from unknown), id-as-slug, 9 malformed-slug variants including a SQL-injection string and a path-traversal string, duplicate-slug conflict on create, and a real database-outage 500 for every one of the 10 endpoints with the operator's diagnostic (`ECONNREFUSED`) intact in the log but the credential embedded in the same connection string redacted before it reaches the log.

A single test walks the full response of every endpoint, fully populated, checking for 17 categories of internal/sensitive field and for the literal marker strings placed in draft-only and internal-note fields; none were found.

## SEO verification

- **Routes and slugs:** the four approved example slugs and other natural slugs pass with no warnings; `best-top-leading-digital-marketing-agency-services`-style slugs are still valid (not blocked, since they are syntactically fine) but now produce an editorial warning naming the specific problem (filler words, repeated terms, or excessive length). ID-style, query-style and traversal slugs are rejected outright, unchanged from Phase 3.
- **Metadata identity:** for each content type, the resolved page title and canonical were checked against the record's own title and slug, confirming route, title and canonical never disagree.
- **Canonical integrity — real defect found:** the sitemap/canonical audit checked that a canonical target exists, but not that the target was itself canonical. A found it fixed the gap: **chains** (A's canonical points at B, and B's own canonical points elsewhere) and **loops** (A↔B) are now both flagged; a canonical pointing at a page that is itself already canonical is correctly left unflagged.
- **Sitemap:** run against a real production build (see "Real-server verification" below): valid XML, all URLs on the production origin, no duplicates, no query strings, drafts/noindex/renamed-away/unpublished-Home all correctly absent.
- **robots.txt:** production allows everything and advertises the sitemap; every non-production tier disallows everything and advertises no sitemap — verified on running staging and production builds, not just unit tests.
- **Structured data:** Organization, Service and Article render on the real pages with no invented fields; BreadcrumbList and FAQPage correctly absent because those page sections don't render yet.
- **Internal linking — real defect found:** nothing checked whether an editor-entered CTA or metric link actually points at a live page. Added `seo/links-audit.ts` and wired it into `npm run seo:audit`; running it against realistic content correctly flagged three real problems (a CTA to `/contact`, which isn't built; a CTA to an old, since-renamed slug; a metric link to unpublished content) and correctly passed CTAs to built, published pages and to external URLs.
- **Keyword-volume/ranking data was not independently verified during this implementation and none is claimed anywhere in the codebase or documentation.**

## Security verification

- **Rate limiter — real defect found and fixed** (see above): requests with no `x-forwarded-for` header are no longer pooled into a single shared bucket.
- Verified over real HTTP against a live server: security headers present on every response; non-production tiers carry `X-Robots-Tag: noindex, nofollow` on every response including the API; `/api/**` always carries it; write methods on `/api` get a JSON 405 before any handler runs; no `Access-Control-*` headers are ever sent.
- **Environment — real defect found and fixed**: a staging or production deploy with no `DATABASE_URL` previously failed with an unhelpful 500 only on first database use. `DATABASE_URL` is now required by the environment schema itself outside development, so `/api/health` fails immediately and the log names the exact missing variable. Verified by starting a production build with no `DATABASE_URL` and with an invalid (`www.`) site URL: both produced a safe 500 and a diagnostic log line naming the variable, with no value ever disclosed.
- Confirmed no committed secrets, `.env.example` holds only names, real `.env*` files are git-ignored, and `process.env` is read only in the four approved configuration files.
- `npm audit --omit=dev`: 0 vulnerabilities. Full `npm audit`: 4 moderate advisories, all in `drizzle-kit`'s dev-time dependency chain (`esbuild` dev server), not shipped to production; the automatic fix would downgrade `drizzle-kit` to 0.18, so it was not applied.

## Environment verification

Tested by starting the actual `next start` process, not just parsing the schema: a healthy production build responds normally; the same build with `DATABASE_URL` unset returns a safe 500 from every endpoint including a database-independent health check, with the cause logged server-side only; a production build with a `www.` site URL is likewise refused at startup. A staging build was verified to disallow crawling, emit an empty sitemap, and still canonicalise every page to the production origin.

## Error-handling verification

400 (malformed slug), 422 (invalid query, with a field-level map), 404 (unknown/draft/id-as-slug/unknown API path), 409 (duplicate slug), and 500 (a real database outage induced by killing the live database under a running server, and a fabricated driver error containing a credential) were all exercised against running code. In every case the client response was the standard safe envelope and the operator log carried a usable diagnostic with the credential removed.

## Type/lint/build/regression

```
npm run typecheck   → passes
npm run lint        → passes, 0 warnings
npm test            → 243/243 passed, 9 files
npm run build       → succeeds (production config)
npm audit --omit=dev → 0 vulnerabilities
```

Regression: the full suite (including all tests written in Phases 1–9) was rerun after every fix in this phase and remained green throughout; no existing test was weakened or removed to make the phase pass.

## Real-server (non-unit-test) verification

Because unit tests exercise the application's own code paths, an in-memory PostgreSQL reachable over the real wire protocol (`npm run db:dev`, PGlite-backed) was used to run the actual built application end to end, separately from `vitest`:

- `npm run db:migrate` applied the tracked migrations to a fresh database over the real driver, and was confirmed idempotent (safe to run twice).
- `npm run db:seed` refused to run with `APP_ENV=production` and succeeded in development.
- A production build (`APP_ENV=production`) was started against this database with realistic content (the four approved example service slugs, a case study, an insight, a career, a draft of each type, a noindex service, and a renamed slug) and swept programmatically:
  - Every sitemap URL returned 200 with a self-referential canonical, a unique `<title>`, an `<h1>`, `index, follow`, and both Open Graph tags.
  - Every excluded page (draft service, draft case study, unpublished insight, unknown slugs of every type) returned 404; the noindex service returned 200 with `noindex, follow`; the renamed slug returned a 308 to the new URL; an uppercase/trailing-slash/tracking-parameter URL was normalised.
  - Every API endpoint returned the correct envelope, cache header, and `X-Robots-Tag`; every internal `path` link found anywhere in any API response was independently requested and confirmed to return 200.
  - Killing the database under the running server made every data-dependent endpoint return a safe 500 with no leaked internals, while `/api/health` (config-only) and `/robots.txt` (config-only) kept working; the server log carried the real driver error with the embedded credential redacted.
  - A staging build of the same database showed `Disallow: /`, an empty sitemap, `noindex, nofollow` everywhere, and canonicals still pointing at the production origin.

## Bugs found and fixed this phase

1. **Rate limiter locked out all anonymous visitors together.** Requests with no `x-forwarded-for` shared one bucket; 120 such requests in a minute would 429 every subsequent anonymous visitor. Fixed: those requests are no longer rate-limited at this layer.
2. **Canonical audit missed chains and loops.** It only checked that a canonical's target existed, not that the target was itself canonical, so A→B→C and A⇄B configurations passed silently. Fixed and covered by a test with both shapes.
3. **No visibility into broken internal links.** Nothing checked whether an editor-entered CTA or metric link pointed at a page that actually exists and is published. Added an internal-link auditor, wired into `npm run seo:audit`.
4. **Missing `DATABASE_URL` in a serving tier failed unhelpfully.** It only surfaced as a generic 500 on first query. Fixed: the environment schema itself requires it outside development, so the failure is immediate and names the variable.
5. **Slugs written for search engines produced no signal.** `best-top-leading-…`-style slugs were syntactically valid (correctly, since blocking them would be overreach) but nothing flagged them for review. Added an editorial-only warning.
6. **Stale documentation.** References to a `db/repositories` folder that was never used, a CMS env var pair (`CMS_API_URL`/`CMS_API_TOKEN`) that nothing read, superseded error codes, and outdated "not yet built" claims. Corrected across README, ARCHITECTURE, ENVIRONMENT, CONTENT_ARCHITECTURE, SLUG_STRATEGY, SEO_INDEXING, SECURITY and API docs; the two unused env vars and the two empty directories were removed.

No other defects were found. Everything else previously reported as implemented was independently confirmed to behave as described.

**Environment note (not a code defect):** during this phase's test runs, a stale `next-server` process left over from an earlier manual verification session (started before this session, running an older build) was found still running in the background, consuming CPU and causing intermittent, non-reproducible single-test failures under full-suite parallel load — a different test failed on each run, and every failure passed cleanly in isolation, which is the signature of resource contention rather than a defect. Killing that process made the full suite pass identically on two consecutive runs. Documented here so a similar false alarm is recognised quickly if it recurs: a flaky failure that changes which test fails between runs and disappears in isolation is an environment/resource problem, not a regression, and should prompt checking for stray background processes before investigating the code.

## Known, accepted, and out-of-scope limitations

These are not blockers for Stage 1 sign-off (per §33 of the Phase 10 brief):

- No CMS/admin editing UI, no write API, no authentication. Content enters through service functions, the seed script, or direct SQL.
- No hosting, deployment pipeline, CI, media storage provider or CDN is configured or chosen.
- Never run against an installed (non-in-memory) PostgreSQL server, only PGlite (in-process and over its real wire-protocol adapter).
- The hub, About, Contact and legal pages have no page files and correctly 404; they are absent from the sitemap and flagged `available: false` in the Home API's `links` block.
- 4 moderate `npm audit` advisories remain in dev-only tooling (`drizzle-kit`'s `esbuild` dependency); production dependencies show 0.
- No CI, so these checks are not enforced automatically on every change; they were run manually for this sign-off.
- Final keyword-ranking research, visual design, responsive/animation polish, and CRM are explicitly out of scope for Stage 1 per the brief.
