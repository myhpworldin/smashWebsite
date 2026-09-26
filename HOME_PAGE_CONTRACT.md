# Home page data contract

For the frontend developer and the designer. `GET /api/home` returns everything the Home page shows, as content, not layout. The Home page itself renders from this exact payload (`getHomeResponse()` in `src/server/seo/request-cache.ts`); nothing is hardcoded in the components. Build each section as soon as its design is approved; the payload does not change when layouts do. Envelope, status codes, caching and rate limits: [API.md](API.md). Sample data to build against: `npm run db:dev -- --seed` (every section, every string marked `[SAMPLE]`, no real claims) or `npm run db:dev -- --design` / `npm run db:import-home` for the approved Figma copy (the design's placeholders, such as team names, stay marked in `src/server/db/home-design-content.ts`).

## Rules that apply to every section

1. **Keys are fixed and always present.** A section with nothing to show is `null`: omit it from the page. A `null` is normal (not an error), and arrays inside a present section are never empty.
2. **Absent scalars are `null`, never missing** (`eyebrow`, `description`, `image`, `video`, `cta`, …), so one component can handle any content.
3. **Order is explicit.** Lists are in display order; repeated items also carry `order` (1-based).
4. **Reusable content is referenced, never copied.** Services, work, testimonials and insights are card summaries with a canonical `slug` and `path`. Link to `path` exactly as given; never build a URL from an id, and there are no ids.
5. **Only published content arrives.** Drafts are omitted server-side; a referenced item that is unpublished simply is not in the list.
6. **One primary heading:** `hero.heading` is the page's H1 and the only one. Every other `heading` is a section (H2) heading.
7. **Media** is always `{url, alt, width?, height?, loading, srcSet?, …}` ([MEDIA_ARCHITECTURE.md](MEDIA_ARCHITECTURE.md)). Use `alt` as given (`""` + `decorative` means decorative). `loading: "eager"` is set only on the hero image.
8. **Calls to action** are `{label, target, external}`. `external: false` → an internal canonical path (use the router); `true` → an `https` URL. Targets are validated, so a CTA is always a defined site route or https.
9. **Copy is content.** The backend never inserts keywords, claims or default text. If a field is not supplied it is `null`; do not substitute invented copy.
10. **If a section's stored content is invalid**, it is returned as `null` (and logged server-side) instead of breaking the page.

## Top level

| Key | Type | Notes |
|---|---|---|
| `seo` | object | Resolved metadata for the page (title, description, canonical, robots, Open Graph, Twitter). `canonical` is always `https://smash.international/`. The frontend also gets this through `generateMetadata`; use one source |
| `hero` … `cta` | sections below | |
| `links` | `{services, work, insights, about, contact}` each `{path, available}` | Canonical destinations. **`available: false` means that page is not built yet: do not render a link to it** (it would 404). Flips to `true` when the page exists |
| `publishedAt`, `updatedAt` | ISO date | |

## Sections

Shared: `eyebrow`, `heading`, `description` are `string | null`, and every intro-style section also carries `cta` (`Cta | null`, an optional section-level action such as "View all"). "Card" types are defined after the table.

| # | Key | Purpose | Data source | Shape | Optional / empty | Related route | SEO notes |
|---|---|---|---|---|---|---|---|
| 1 | `hero` | Primary message | HomePage | `{eyebrow, heading, supportingText, primaryCta, secondaryCta, image, video}` (`heading` required) | everything but `heading`; whole section `null` only if stored content is invalid | `primaryCta`/`secondaryCta` target | The H1. Write it naturally; do not repeat one phrase across heading, text, CTA and alt |
| 2 | `businessProof` | Verified metrics | HomePage | `{eyebrow, heading, description, items:[{order,label,value,description,context,link}]}` | `null` if no items | `link` (optional) | Only approved figures; the verification `source` is internal and never sent |
| 3 | `story` | The SMASH story | HomePage | `{eyebrow, heading, description, supportingPoints:[{order,title,description,icon}], image, video, cta}` | `null` if empty | `cta.target` | – |
| 4 | `services` | Featured services | **Service** records (by reference) | `{eyebrow, heading, description, items:[ServiceCard]}` | `null` if no published service is referenced | `/services/{slug}` = `item.path` | Same canonical URL as the service page; no Home-specific slug |
| 5 | `growthEngine` | The growth engine concept | HomePage | `{eyebrow, heading, description, steps:[{order,title,description,icon}]}` | `null` if empty | – | Ordered semantic steps; layout is yours |
| 6 | `selectedWork` | Featured case studies | **CaseStudy** records | `{eyebrow, heading, description, items:[WorkCard]}` | `null` if none published | `/work/{slug}` = `item.path` | Card only; full content lives at the case-study page |
| 7 | `results` | Measurable results | HomePage | same as `businessProof` | `null` if no items | – | Never fabricated; absence is normal |
| 8 | `whySmash` | Reasons to choose SMASH | HomePage | `{eyebrow, heading, description, reasons:[{order,title,description,icon}]}` | `null` if empty | – | Any number of reasons |
| 9 | `testimonials` | Client quotes | **Testimonial** records | `{eyebrow, heading, description, items:[Testimonial]}` | `null` if none published | – | No review/rating schema is generated |
| 10 | `technology` | Platforms used | HomePage | `{eyebrow, heading, description, items:[{order,name,logo,description,url}]}` | `null` if no items | `url` (https, optional) | List only real capabilities |
| 11 | `insights` | Recent/selected articles | **Insight** records | `{eyebrow, heading, description, items:[InsightCard]}` | `null` if none published | `/insights/{slug}` = `item.path` | Card only |
| 13 | `bannerCta` | Mid-page banner with its own photo | HomePage | `{heading, description, image, primaryCta, secondaryCta}` | `null` if not configured | targets | Decorative photo is fine (`alt: ""`) |
| 14 | `industries` | Sectors served | HomePage | `{eyebrow, heading, description, cta, items:[{order,name}]}` | `null` if no items | – | Plain names; the frontend chooses the row layout |
| 15 | `ourStory` | Second story block | HomePage | `{eyebrow, heading, description, cta, lead, image, video, supportingPoints}` | `null` if empty | `cta.target` | `description` may hold several lines |
| 16 | `team` | Team members | **TeamMember** records (by reference) | `{eyebrow, heading, description, cta, items:[{order,name,role,group,shortBio,photo}]}` | `null` if none published | – | `group` is an optional label to group rows under; no personal contact data exists |
| 12 | `cta` | Closing call to action | HomePage | `{eyebrow, heading, description, primaryCta, secondaryCta}` | `null` if not configured | targets | – |

### Card and value types

```
Cta          { label, target, external }          // target: "/contact" | "/services/<slug>" | "https://…"
ServiceCard  { name, slug, path, shortDescription, image, highlights }   // highlights: the service's deliverable titles (Home only)
WorkCard     { title, slug, path, summary, industry, image, client:{name,logo}|null,
               keyResult:{label,value,description}|null, publishedAt }
Testimonial  { quote, personName, personRole, companyName, photo }
InsightCard  { title, slug, path, excerpt, image, category, tags, author:{name,role}|null, publishedAt, updatedAt }
```

- `keyResult` is the case study's first (headline) result, present only if it has one; every result of a published case study carries an internal verification source, which is never sent.
- The client shown on a work card (and the author on an insight) appears only if that client/team member is itself published.
- A "learn more" label on a card is frontend copy; the backend provides the destination (`path`).

## Names that differ from the stored content model

The API uses content names; editors' stored fields keep their Phase 2 names. Mapping: `hero.label`→`eyebrow`, `hero.supportingCopy`→`supportingText`, `hero.ctas[0/1]`→`primaryCta`/`secondaryCta`, `hero.media`→`image`, `story.points`→`supportingPoints`, `story.media`→`image`, `whySmash.items`→`reasons`, `cta.cta`→`primaryCta`, `bannerCta.cta`/`media`→`primaryCta`/`image`, `ourStory.media`/`points`→`image`/`supportingPoints`, testimonial `personName/personRole/companyName` (client name/role/company), `photo` (image; its `alt` is the alt text).

## Internal links the page can rely on

Service, work and insight cards link to their own canonical pages (verified: a Home card's `path` equals the detail page's `path` and canonical). Hubs, About and Contact are in `links`. Related content on the detail pages (`relatedCaseStudies`, `relatedServices`, `relatedInsights`) is documented in API.md. Nothing in the payload creates links for SEO's sake; every link is a real relationship or destination.

## Progressive delivery

| When a section is approved | Do this |
|---|---|
| Any section | Read its key from `GET /api/home`; render nothing when it is `null` |
| A page it links to does not exist | Check `links.<name>.available` (hub/About/Contact) before rendering the link |
| Images | Use `image.width/height` to reserve space, `srcSet`/`loading` as provided; only the hero image is eager |
| Design changes (columns, cards, carousel, animation, order) | No backend change: the data is layout-independent |
| A new field is needed | It must be *content* (added to the model and this contract), not a style; ask before adding |

## Not covered here

The hub, About and Contact pages themselves; their content APIs do not exist. Breadcrumb and FAQ structured data stay off until those sections render (see [SEO_INDEXING.md](SEO_INDEXING.md)). CTA targets are checked for form (a defined route or https), not for whether the destination is published yet.

## How the current Figma homepage uses the payload

| Rendered block | Payload | Presentation decided in code |
|---|---|---|
| Hero + banner | `hero` (label = the tag line), `whySmash.reasons[].title` = the three glass pills | glow ellipses, pill positions |
| Proof cards | `businessProof.items` (`label` = "from" line, `value` = highlighted figure) | icons by position |
| Banner CTA | `bannerCta` | overlay gradient |
| SMASH story | `story` (`heading`'s last word is accented, `description` split on blank lines, `supportingPoints` = manifesto lines) | fading opacity ramp, red line = 5th |
| Services | `services` (+`highlights`) and its `cta` | icons by position |
| Growth Engine | `growthEngine` | 3 + 3 rows, layers icon, step numbers |
| Case studies | `selectedWork` (+`cta`); cards link to `path` | card layout, arrow |
| Industries | `industries.items` | rows of five |
| Our Story | `ourStory` | photo frame |
| Team | `team.items`, one row per `group` | card layout |
| Closing CTA | `cta.primaryCta` | navy band |

`results`, `testimonials`, `technology` and `insights` are served but not rendered: the approved design has no block for them. A `null` section, or a CTA whose destination page does not exist yet, is skipped.
