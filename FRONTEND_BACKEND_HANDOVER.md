# Frontend ↔ Backend Handover

Written for: the frontend developer/designer integrating the redesigned `smash.international` UI against this existing backend. See [API.md](API.md) for the full endpoint reference this document summarizes, [ARCHITECTURE.md](ARCHITECTURE.md) for how the backend is layered, and [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md)/[SEO_ROUTE_MAP.md](SEO_ROUTE_MAP.md) for SEO specifics.

**The core promise of this document**: every endpoint listed below already exists, is tested, and will not change shape just because the visual design changes. Build the new UI against these contracts directly — nothing here is provisional or needs a backend change to support a new layout, card style, or page arrangement.

## 1. API base URL

The public API is same-origin with the website — there is no separate API host. Requests are always relative paths:

| Tier | Base |
|---|---|
| Development | `http://localhost:3000` |
| Staging | whatever `NEXT_PUBLIC_SITE_URL` is set to for that deploy (an https origin, distinguished from production by its own domain) |
| Production | `https://smash.international` |

No CORS headers are sent anywhere (by design — see [SECURITY.md](SECURITY.md)), so the frontend must be served from the same origin as the API; it cannot call these endpoints from a separately-hosted frontend.

## 2. Available endpoints

| Endpoint | Method | Returns |
|---|---|---|
| `/api/home` | GET | Full Home page payload (all 12 sections) |
| `/api/services` | GET | Published services, card fields only (`?page&limit`, max 50) |
| `/api/services/[slug]` | GET | Full service detail |
| `/api/work` | GET | Published case studies, card fields only (`?page&limit`) |
| `/api/work/[slug]` | GET | Full case study detail |
| `/api/insights` | GET | Published articles, card fields only — never the article body (`?page&limit&category`) |
| `/api/insights/[slug]` | GET | Full article |
| `/api/careers` | GET | Published job listings (unpaginated — small, curated list) |
| `/api/careers/[slug]` | GET | Full job listing |
| `/api/clients` | GET | Published clients (capped at 100) |
| `/api/testimonials` | GET | Published testimonials (capped at 100) |
| `/api/site-settings` | GET | Singleton: site name, logo, social links, contact info, default CTA |
| `/api/contact` | POST | Submit the contact form |
| `/api/health` | GET | Liveness check only — not content |

Everything else (`/api/admin/**`, `/api/leads`) is the CMS/CRM surface, not for the public frontend.

## 3. Content models (what each response actually contains)

Full field-by-field shapes are in [API.md](API.md) and the DTOs in `src/server/api/serializers.ts`/`home.dto.ts`, but the shared pattern across every content type:

- **List/summary responses** contain only what a card needs: title, slug, a short description/excerpt, and an image. They never contain the full body, FAQs, process steps, or other detail-only fields.
- **Detail responses** contain the full content: hero, structured sections (problem/solution/deliverables/process/tools/FAQs for a service; challenge/strategy/execution/results for a case study; full markdown `content` for an insight), related content (published only), and `seo`.
- **No response ever contains**: a raw database `_id` as the primary reference (slugs/paths are used instead), `status`, `createdAt`, internal foreign-key fields (`clientId`, `testimonialId`, `authorId` — these are resolved into the actual related object before being returned), or anything CMS-internal.

## 4. Slug rules (how public URLs work)

- Every content URL is `/{type}/{slug}` — `/services/performance-marketing`, `/work/some-case-study`, `/insights/some-article`, `/careers/some-role`.
- Slugs are lowercase, hyphen-separated, unique, and **stable once published** — editing a title never silently changes the URL (a slug change only happens via an explicit edit, which automatically creates a redirect from the old URL).
- A malformed slug (wrong case, double hyphens, over 100 chars) returns `400`. A well-formed slug with no matching published content returns `404`. There is no ID-based fallback route — slugs are the only identifier, by design, for SEO stability.

## 5. SEO data

Every indexable content type's detail response includes an `seo` object (where the service actually resolves metadata server-side for the page's own `<head>` — the frontend's job is mainly to render `<h1>`/content that matches what `seo` describes, not to invent its own metadata logic). Full mechanics in [SEO_ARCHITECTURE.md](SEO_ARCHITECTURE.md). In short:

- **Metadata** (title, description) is already resolved with sane fallbacks server-side — if a specific page has no override, it still gets a sensible title/description, never a blank one.
- **Canonical** always points at the record's own stable slug-based URL on the real production domain — never a staging URL, never carrying tracking parameters.
- **Open Graph / Twitter** images fall back sensibly (content image → site default → none) — the frontend never needs to supply a fallback image itself.
- **Schema (JSON-LD)**: Organization (Home), Service (service pages), Article (insight pages), BreadcrumbList (all detail pages), FAQPage (service pages with real FAQs) are already generated server-side via Next's `generateMetadata`/page-level JSON-LD — the frontend doesn't need to build any of this itself, just render the page's `<Script type="application/ld+json">` the existing page components already emit.
- **Indexability**: handled entirely server-side (published + production tier + the record's own `robotsIndex` flag). The frontend never needs its own "is this indexable" logic.

## 6. Image data

Every image reference across every content type has the same shape:

```json
{ "url": "...", "alt": "...", "width": 1200, "height": 800 }
```

`alt` is always meaningful (validated server-side — never a generic placeholder like "image" or a filename). `width`/`height` are always present together or both absent — never one without the other, so the frontend can reliably reserve layout space (for CLS) whenever both are present. Serve images through Next's `<Image>` component using these dimensions; the backend/Next config already handles WebP/AVIF conversion and responsive sizing — the frontend doesn't need its own image pipeline.

## 7. Publishing (how content becomes available)

- Content is either `draft` or `published`. Only `published` content is ever returned by any public endpoint, included in the sitemap, or indexable — enforced at the database query level, not by a response-time filter a frontend bug could accidentally bypass.
- There is no "scheduled publish" — an editor publishing content makes it live immediately.
- Publishing has minimum-content gates (e.g., a service needs a description, a case study needs at least one of challenge/strategy/execution, Home needs its own SEO title/description) — so if something looks unexpectedly sparse in a published response, that's real content, not a bug; the backend already refused to let genuinely incomplete content go live.
- A CDN/browser may cache a public response for up to 60 seconds (`Cache-Control: public, s-maxage=60`) — so a just-published or just-edited item may take up to a minute to visibly update. This is expected, not a bug to report.

## 8. Error states

Every error follows one shape:

```json
{ "success": false, "message": "Human-readable message", "error": { "code": "ERROR_CODE", "fields": {} } }
```

| Status | When | What the frontend should do |
|---|---|---|
| `400` | Malformed slug or query parameter | Treat like a 404 — nothing to recover |
| `404` | Unknown or unpublished slug | Render your "not found" page |
| `422` | Invalid pagination (`page`/`limit` out of range) | Only reachable if the frontend sends a bad value itself — validate pagination controls client-side too |
| `429` | Rate-limited | Respect the `Retry-After` header before retrying |
| `500` | Unexpected server error | Render a generic error state; never show `message`/`error.code` as if it were user-facing content beyond what's already safe to show |

Never attempt to parse or branch on `error.message` text — only `error.code` is a stable contract; `message` is for display, not logic.

## 9. Empty states (missing optional content)

- A list endpoint with no matching content returns `{"success":true,"data":[],"meta":{"pagination":{...,"total":0,"totalPages":0}}}` — not an error. Render an empty state, not an error state.
- A detail record's optional sections (e.g., a service with no FAQs, a case study with no testimonial) return `null` or `[]` for that field, never an absent key. The frontend should always check for empty/null rather than assuming a field is populated, and should hide that section gracefully rather than rendering a broken-looking empty block.
- Home's sections (`businessProof`, `growthEngine`, `whySmash`, `technology`, etc.) are all individually optional (`null` if not yet configured) — the frontend must handle each section being absent independently; Home is not guaranteed to have all 12 sections populated at every point in time, especially during an active content migration.

## 10. Important constraints

- **Do not request content by database ID.** There is no such route, and none will be added — slugs are the permanent public identifier.
- **Do not rely on response field order or build assumptions about undocumented fields** — anything not in [API.md](API.md)'s documented shape may be removed without notice; anything that is documented will not be removed without a deliberate, communicated contract change.
- **Pagination is capped at `limit=50`** — a request for more fails with `422`, it does not silently return fewer items than asked or truncate; design list UI around page-based navigation, not "load everything."
- **This API has no authentication for public reads** — anything returned by a public endpoint is meant to be fully public; don't add client-side gating logic expecting the backend to also restrict it.
- **The backend will not change shape to match a new visual layout.** If the redesign needs data the backend doesn't currently expose (e.g., a genuinely new content field), that's a real backend change to request — but reorganizing, restyling, or re-arranging existing fields into new components should never require one.
