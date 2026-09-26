# Slug strategy

Code: [src/server/seo/slug.ts](src/server/seo/slug.ts), [src/server/seo/redirects.ts](src/server/seo/redirects.ts).

## Principle

A slug names the page's actual topic in the site's own words. It is chosen once and then left alone. There is no keyword database behind any slug; keywords are *unvalidated* until real research is supplied.

## Generation

`slugify(title)` / `generateSlug(title)` **suggest** a slug; nothing regenerates slugs automatically. The suggestion:
lowercases, strips accents, turns `&` into `and`, drops apostrophes, converts every other non-alphanumeric run to one hyphen, collapses immediate repeated words ("marketing marketing"), and stops at a word boundary at ≤ 60 characters. It never removes stop words or truncates mid-word, because meaning matters more than brevity. An editor may shorten it (e.g. an article slug need not be the full title). It is deterministic and returns `""` (or throws in `generateSlug`) when nothing usable remains.

## Validation (server-side, every write)

`slugSchema` / `slugProblem` reject: empty, > 100 chars, non-kebab-case, reserved words equal to a top-level route segment, and identifier-like values (digits only, UUIDs, `page|service|project|article|post|item|case-<n>`). A database check constraint repeats the format rule.

## Uniqueness

- Unique index per content type (services, case_studies, insights, careers): duplicates fail with `CONFLICT` (409).
- Different types may share a slug (`/services/branding`, `/work/branding`) because their prefixes differ.
- Services additionally reject a slug with the same *intent key* as an existing service (`performance-marketing` vs `performance-marketing-services`).
- Numeric suffixes are never added automatically.

## Stability

`update*` changes the slug only when a `slug` value is explicitly supplied. Editing a title/name leaves the URL unchanged (tested).

## Style warnings

`slugStyleWarnings` (shown by `seo:audit`, never a block) flags slugs written for search engines rather than people: promotional filler (`best`, `top`, `leading`, `cheapest`, …), repeated terms, and slugs longer than seven words. The approved examples (`performance-marketing`, `social-media-management`, `website-development`, `crm-automation`) pass; `best-top-leading-digital-marketing-agency-services` does not.

## Slug changes and redirects

When a slug of content that **has been published** (`publishedAt` set, even if now draft) is changed explicitly, the old path is stored in the `redirects` table (`from_path` unique → `to_path`). Pages answer with Next's `permanentRedirect`, an HTTP 308 (permanent, treated like a 301 for indexing). Redirects are kept flat (older entries are repointed, not chained) and a path that becomes live again loses its redirect. `resolvePublicRoute` returns `{kind: "redirect"}` when no published content matches, and the detail pages issue `permanentRedirect`.

Not implemented: a redirect-management UI, manual redirects, redirects for non-content paths, and proxy-level redirect lookup (redirects are served by the detail pages only).

## Adding a content type with a public URL

1. Add its prefix to `CONTENT_ROUTES`/`ROUTES` in `src/lib/routes.ts`.
2. Add its table to `TABLES` in `resolve.ts`, use `slugSchema`, unique index, and `recordPathChange` in its update function.
3. Add a row to SEO_ROUTE_MAP.md.
