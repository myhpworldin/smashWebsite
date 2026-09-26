# SEO keyword / search-intent map — Stage 2, Phase 1

No keyword research tool (Search Console, Ahrefs, SEMrush, etc.) was available in this session and none is claimed. Every topic below is labelled by its evidence class:

- **Semantic/topic recommendation** — the site's own terminology, chosen because it accurately names the offering. No volume, difficulty, CPC or ranking data backs it.
- **Verified research** — would require an external keyword tool. **None exists in this project.** If this label ever appears elsewhere in project docs without a cited source, treat it as an error.

Everything in this file is a semantic/topic recommendation unless stated otherwise.

## 1. Search-intent categories used

| Category | Meaning | Applied to |
|---|---|---|
| Navigational | User wants a specific known page/brand | Home, About, Careers hub, legal pages |
| Informational | User wants to learn something | Insights hub + articles, Case studies (proof) |
| Commercial investigation | User is comparing/evaluating an offering | Services hub, service detail pages, Work hub |
| Transactional / conversion | User is ready to act | Contact, career posting (apply), service page CTA |

Not every page is forced into "commercial" — About is brand/navigational, an Insight article is informational even though it links to a service.

## 2. Page-by-page topic map

| Page | Primary topic | Secondary topics | Intent | Route | Evidence |
|---|---|---|---|---|---|
| Home | SMASH (brand / growth agency) | services overview, results, technology | Navigational | `/` | semantic |
| About | About SMASH | team, story, values | Navigational | `/about` | semantic |
| Services hub | SMASH services (overview) | each individual service | Commercial investigation | `/services` | semantic |
| Service: Performance Marketing | Performance marketing | paid media, ROAS, ad spend efficiency | Commercial investigation | `/services/performance-marketing` | semantic — **example slug, not a confirmed final service** |
| Service: Social Media Management | Social media management | content calendars, community management, organic social | Commercial investigation | `/services/social-media-management` | semantic — example slug |
| Service: Website Development | Website development | web design, site performance, CMS builds | Commercial investigation | `/services/website-development` | semantic — example slug |
| Service: CRM Automation | CRM automation (marketing service, not a CRM product) | lead nurturing, marketing automation | Commercial investigation | `/services/crm-automation` | semantic — example slug |
| Work hub | SMASH case studies | industries served | Commercial investigation / informational | `/work` | semantic |
| Case study (per client) | The client/project outcome | the service(s) used, the industry | Informational (proof supporting commercial intent) | `/work/[slug]` | semantic |
| Insights hub | SMASH articles / marketing insights | categories (per Insight.category) | Informational | `/insights` | semantic |
| Insight article (per article) | The article's specific topic | related service | Informational | `/insights/[slug]` | semantic — topic set per-article at authoring time, not predetermined here |
| Careers hub | Working at SMASH | open roles, culture | Navigational | `/careers` | semantic |
| Career posting | The specific role title | location, employment type | Navigational / transactional (apply) | `/careers/[slug]` | semantic |
| Contact | Contacting SMASH | book a call, get a quote | Transactional | `/contact` | semantic |
| Privacy Policy | Data handling / privacy | none | Navigational | `/privacy-policy` (proposed) | semantic |
| Terms of Service | Terms of use | none | Navigational | `/terms-of-service` (proposed) | semantic |

## 3. Service topic validation

The four service slugs in the developer brief (`performance-marketing`, `social-media-management`, `website-development`, `crm-automation`) were evaluated against the criteria in the phase brief §23, not assumed:

| Criterion | Performance Marketing | Social Media Management | Website Development | CRM Automation |
|---|---|---|---|---|
| Relevance (real SMASH offering?) | **Unconfirmed** — matches the brief's own examples, but no client-approved service list exists in the codebase or seed data | Unconfirmed | Unconfirmed | Unconfirmed |
| Natural language | Yes | Yes | Yes | Yes |
| Specificity | Yes — distinct from the other three | Yes | Yes | Yes |
| Clean URL | Yes (passes `slugStyleWarnings`, per SLUG_STRATEGY.md) | Yes | Yes | Yes |
| Duplication with another page | None found | None found | None found | None found — and "CRM Automation" is explicitly a marketing service page, not the (out-of-scope) CRM product |

**Verdict: names and slugs are structurally sound and may be used as placeholders, but they are not verified as SMASH's actual, final service catalogue.** That confirmation is a business decision, not something derivable from code or content already in the repository (none of the four is seeded or hardcoded — confirmed in `SEO_ROUTE_MAP.md`).

## 4. Keyword/search-intent conflict matrix

| Pair | Same primary topic? | Verdict | Handling |
|---|---|---|---|
| `/services/performance-marketing` vs. a future `/insights/performance-marketing-trends` | Related, not identical | Allowed — service page sells the offering; insight article informs. Different intent (commercial vs. informational) | No action needed; enforce via editorial review at authoring time |
| `/services/performance-marketing` vs. `/services/performance-marketing-services` | Identical intent key | **Rejected at the database layer** (services sharing an intent key conflict on create/update — see SLUG_STRATEGY.md) | No two services can collide this way; already enforced in code |
| `/services/social-media-management` vs. `/services/performance-marketing` (paid social overlap) | Distinct services, adjacent topic | Allowed, but content must not duplicate paid-social messaging on both pages | Editorial check only — not enforceable in code |
| Case study vs. service page for the same service | Different intent (proof vs. offer) | Allowed by design | Case study slugs name the client/project, never the service keyword (enforced by convention, not code) |
| `/about` vs. `/careers` | Distinct topics (brand story vs. recruiting) | No conflict | — |
| Two Insight articles both covering the same specific topic | Would be a real conflict | **Not automatically detectable** — no code checks Insight-to-Insight topic overlap | Flagged as a manual editorial review step before publishing a new article (see §5) |

## 5. What is NOT automatically enforced

- Insight-to-Insight topic overlap (only service-to-service intent-key collisions are code-enforced).
- Whether an Insight article's topic overlaps a Service page's topic in a way that would split ranking signal — this is a judgement call for whoever writes the article, informed by this table.
- Any claim about which topic would actually rank, or how competitive it is — no data exists to make that claim.

## 6. Keyword policy compliance

Per the phase brief §7, this document does not state or imply: search volume, keyword difficulty, ranking potential, or "high volume" claims for any term above. Every topic is the site's own descriptive language for what the page actually is, not a term selected from external keyword data.
