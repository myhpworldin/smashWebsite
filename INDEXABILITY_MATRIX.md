# Indexability matrix — Stage 2, Phase 1

Resolves every "decision required" cell left in Stage 1's route map. Mechanism (how index/robots/canonical/sitemap are actually computed) is documented and implemented already — see [SEO_INDEXING.md](SEO_INDEXING.md) and [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md). This file only records the *decisions*, all in production (indexable) terms; non-production tiers force `noindex, nofollow` everywhere regardless of this table (`SEO_INDEXING.md` §"Indexability").

| Page type | Index | Follow | Canonical | Sitemap | Decision basis |
|---|---:|---:|---|---:|---|
| Home | Yes | Yes | `/` | Yes | Brand entry point |
| About | Yes | Yes | Self | Yes (once page file exists) | Standard brand page |
| Services hub | Yes | Yes | Self | Yes (once page file exists) | Commercial listing page |
| Service detail | Yes, when published | Yes | Self | Yes | Core commercial page |
| Work hub | Yes | Yes | Self | Yes (once page file exists) | Commercial/proof listing |
| Case study | Yes, when published | Yes | Self | Yes | Proof content, genuinely useful to searchers |
| Insights hub | Yes | Yes | Self | Yes (once page file exists) | Informational listing |
| Insight article | Yes, when published | Yes | Self | Yes | Informational content |
| Careers hub | Yes | Yes | Self | Yes (once page file exists — see gap in SEO_SITE_ARCHITECTURE.md §1) | Navigational, low competitive risk, genuinely searched ("careers at SMASH") |
| Career posting | **Yes, when published** (resolved — was "decision required" in Stage 1) | Yes | Self | Yes | A job posting is content candidates search for by role name; no reason to withhold it that doesn't equally apply to services/case studies |
| Contact | **Yes** (resolved) | Yes | Self | Yes (once page file exists) | Conversion page; contact/location pages are conventionally indexed and often rank for "contact [brand]" and local queries |
| Privacy Policy | **Yes, but low priority** (resolved) | Yes | Self | Yes (once built) | Standard practice; not a page anyone should be steered away from, but not a target for internal-link equity either |
| Terms of Service | **Yes, but low priority** (resolved) | Yes | Self | Yes (once built) | Same as above |

## Overrides available per page (already implemented, not new)

- `seo.robotsIndex = false` — reachable, `noindex, follow`. An editor can opt any individual page out later without a code change.
- `seo.robotsFollow = false` — indexed, `nofollow`.
- A draft is always `noindex, nofollow` and 404s regardless of this table.

## What this resolves vs. Stage 1

Stage 1 left "Decision required" against Careers, Contact and Legal in the phase-brief's own indexability template (§18 of the brief). All three are resolved above to **indexable**, because:
1. None of them contains sensitive, duplicate, or thin content that would justify exclusion.
2. All three have genuine standalone search value (recruiting, local/contact intent, compliance transparency).
3. Excluding them by default would be "noindex for convenience," which the phase brief explicitly rules out (§18: "Nothing is noindex by default beyond these rules").

**Resolved, Stage 4 Phase 7:** Legal pages exist now (`/privacy-policy`, `/terms`, `/cookie-policy`) and are set exactly this way — `robotsIndex: false` in `src/server/seo/static-pages.ts` — but for a different reason than "boilerplate, no unique content": they hold no approved copy yet, so indexing a placeholder would be dishonest to search engines. Flip that flag once real, legally-reviewed content replaces the placeholder.
