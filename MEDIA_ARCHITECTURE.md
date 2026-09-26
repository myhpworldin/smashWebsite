# Media architecture

Only what exists and was verified is described as working. Choices that are still open are listed as decisions.

## 1. Current storage

**None is configured.** The backend stores no files and there is no upload endpoint, object store or media library. A media item is a *reference* (a URL plus metadata) embedded in content records. Two places can serve the bytes today:

| Location | Status |
|---|---|
| `public/media/…` in this repository (served by Next.js at `/media/…`) | Supported and verified. The folder does not exist yet; create it when the first real asset is added |
| An https host listed in `MEDIA_ALLOWED_HOSTS` | Supported by validation and by the optimizer configuration. **No such host is configured or chosen** |

**Decision needed (client/team):** where production media lives (repository `public/`, an object store, or a headless-CMS asset host). Nothing else in this document changes when that is decided; only the host list and `buildOptimizedUrl()` ([src/lib/media.ts](src/lib/media.ts)).

## 2. CDN / delivery

- **CDN: none configured.** Whether responses are edge-cached depends on the hosting platform, which is not chosen. No CDN claim is made.
- **Image optimization: the Next.js built-in optimizer** (`/_next/image`, using the installed `sharp`), configured in [next.config.ts](next.config.ts). It resizes on demand, converts formats, and caches results.
- **Verified** against the production build with a synthetic 2400×1350 PNG (89,922 bytes): a 960px request returned **AVIF in 2,629 bytes** to `Accept: image/avif`, WebP (4,520) to WebP-capable clients, and PNG (4,309) otherwise; `Vary: Accept` is set; widths and qualities outside the configuration, `.php` sources and non-approved hosts return 400. The temporary files were deleted afterwards.
- `dangerouslyAllowSVG` stays off: SVG is served as-is (never transformed) and only through `<img>`.

## 3. Formats and variants

- Accepted source types: JPEG, PNG, WebP, AVIF, GIF, SVG. Delivered formats (via the optimizer): AVIF, then WebP, falling back to the source format by content negotiation.
- Variants are on-demand, not pre-generated: **480 / 960 / 1440 / 1920 px** (small/medium/large/XL) plus 96/192/384 for logos and thumbnails, quality 75 (`IMAGE_WIDTHS`, `IMAGE_SMALL_SIZES`, `IMAGE_QUALITY`). These are defaults, not derived from a design; adjust when real layouts exist.
- The API returns a `srcSet` containing only widths the source can supply (never upscaled), and none for SVG/GIF, unknown-width sources, or hosts the optimizer is not configured for. Originals are never deleted or modified.
- OG/Twitter images use the stored URL directly (not an optimizer URL) so the link is stable; supply a purpose-made JPEG/PNG/WebP (commonly ~1200×630). Cropping is not automated.

## 4. Media reference (stored)

`{ url, alt, decorative?, width?, height?, mimeType?, caption? }` ([validation/media.ts](src/server/validation/media.ts)), embedded wherever content needs an image (hero, story, service tools, case-study hero/gallery, insight featured image, team photo, testimonial photo, client logo, site logo/favicon/default OG). One shared schema, no duplicated file records. Only fields with a use were added: `format` is derived from `mimeType`/extension, aspect ratio from width/height, and blur placeholders, credits, focal point and file size were deliberately not added.

Video: `{ url, mimeType (mp4|webm), poster (required image), duration?, width?, height?, autoplay? }` on `hero.video` and `story.video`.

## 5. Validation rules (every write)

- **URL:** root-relative path or `https` URL. Rejected: `javascript:`/`data:`/`file:`, protocol-relative, credentials in the URL, whitespace/backslashes, `..` and encoded traversal, **signed/temporary URLs** (`X-Amz-*`, `signature`, `token`, `expires`, …), and any extension outside the allowed image/video list (`.php`, `.html`, `.exe`, `.js`, …). A URL with no extension is accepted only if `mimeType` is given, and `mimeType` must match an extension when both exist.
- **Production:** absolute URLs must be on this site or `MEDIA_ALLOWED_HOSTS` (supports `*.host`); localhost, private ranges, single-label hosts and plain http are refused. (Development permits `http://localhost` and any https host.)
- **Dimensions:** integers 1–10 000, and width and height must be given together. Both may be omitted, but then the frontend cannot reserve space and the SEO audit warns.
- **OG/Twitter images:** JPEG, PNG, WebP or GIF only (no SVG/AVIF). At render time, on an indexable tier, an image that is not on a public https host is dropped and the site default is used, so stale data cannot put a localhost or private URL in `og:image`.
- **Video:** must have a poster with valid alt text; long side ≤ 2560 px (rules out 4K); duration ≤ 600 s.
- **File size:** *not enforced*, because nothing is uploaded here. Guidance for whoever supplies files: hero images ≲ 300 KB and gallery images ≲ 200 KB after export at the largest display width (2× for retina); source files can be larger since the optimizer resizes; encode video at 1080p, H.264 MP4 (optionally a WebM), ideally < 5 MB for background loops.

## 6. Alt text ([`altProblem`](src/server/validation/media.ts))

Required unless `decorative: true` (then stored as `""` so it renders as a decorative image). Rejected as objectively wrong: generic words (`image`, `photo`, `banner`, …), filename-like text (`IMG_1234`, `photo.jpg`), and keyword lists (a word repeated 4+ times, or 6+ commas). Whether alt text is *good* is an editorial decision; the SEO audit also warns on generic alt and missing dimensions. Guidance: describe what the image shows or does, briefly and naturally; never add keywords for search. Filenames should likewise describe the content (`team-workshop-3fa9c2d1.jpg`). Filenames and alt text are never generated from search terms.

## 7. Loading hints (API)

Every media object in the API carries `loading`: `"eager"` for above-the-fold hero media (Home `hero`, service `hero`, case-study `heroImage`, article `image` on detail responses) and `"lazy"` everywhere else, including all list/card images. It is a hint derived from the content role, not a layout rule; the frontend may override it (an above-the-fold LCP image should also be marked high priority). Videos never autoplay by default; `autoplay: true` means muted, looping, decorative playback and the response sets `muted: true`. Video responses carry the poster and should be loaded lazily unless in the hero.

## 8. Public API contract

```json
{ "url": "/media/team-workshop-3fa9c2d1.jpg", "alt": "SMASH team reviewing a campaign report",
  "width": 2400, "height": 1350, "mimeType": "image/jpeg", "format": "jpeg",
  "caption": "…", "loading": "eager",
  "srcSet": "/_next/image?url=%2Fmedia%2F…&w=480&q=75 480w, … 1920w" }
```

`decorative: true` appears only for decorative images; `caption`, `srcSet`, `width`/`height` only when known. No storage, provider, filesystem or credential fields exist in responses (tested). This is additive to the earlier `{url, alt, width, height}`. The projection is applied centrally to every response ([media/public.ts](src/server/media/public.ts)), so a new endpoint cannot forget it. The `seo` block is left as generated (absolute OG URLs).

## 9. Cache strategy

| Asset | Header | Notes |
|---|---|---|
| Optimized images (`/_next/image`) | `public, max-age=2592000, must-revalidate` (30 days, verified) | Same URL ⇒ same bytes; replacing a source at the same URL can stay stale up to 30 days, so **publish a new filename**, don't overwrite |
| `/media/*-<8+ hex>.<ext>` (content-hashed name) | `public, max-age=31536000, immutable` (verified) | Convention: name = slug + short content hash |
| Other `/media/*` files | `public, max-age=86400, stale-while-revalidate=604800` (verified) | Safe default when a name is not versioned |
| API responses referencing media | `public, s-maxage=60` (Phase 5) | URLs only; bytes cache as above |

Versioning strategy = new filename per change; there is no purge/invalidation tooling and none is needed with that convention. Private assets do not exist; everything referenced is intentionally public.

## 10. Production URL strategy

Stored URLs are stable and deterministic (no random or signed URLs, no database ids). Root-relative `/media/…` resolves against `NEXT_PUBLIC_SITE_URL` for OG images. Production rejects non-approved hosts at write time and drops non-public hosts at render time.

## 11. Environment variables

| Variable | Class | Purpose |
|---|---|---|
| `MEDIA_ALLOWED_HOSTS` | SERVER-ONLY (not secret; read at build for the optimizer) | Optional comma-separated hostnames (`cdn.example.com`, `*.img.example.com`, optional `:port`) allowed to serve media. Unset ⇒ production allows only this site's own files |

There are no storage credentials, and none should ever be placed in `NEXT_PUBLIC_*` variables. If a provider that needs an API key is adopted later, it becomes a SECRET server-only variable.

## 12. Uploads

No upload path exists, so no upload validators (magic-byte sniffing, size limits, virus scanning) were built: they would be dead code. If uploads are introduced (e.g. an admin), they must sniff file content rather than trust extensions, reject SVG unless sanitized, cap size and dimensions, store under generated names, be authenticated, and never be served with an executable or HTML content type.

## 13. Known limitations

- No storage provider, CDN, or upload flow is chosen or configured; optimization currently applies to files under `public/` and configured hosts only.
- The optimizer cannot be exercised by the automated tests (tests cover the configuration, URL building and API); it was verified manually with the production build.
- Width/height are declared by the editor, not read from the file; a wrong value is not detected.
- No blur placeholders, art-direction crops, or automatic OG image generation.
- No video transcoding or streaming; self-hosted/CDN mp4/webm files only, no YouTube/Vimeo embeds.
- `format` in responses reflects the source (or declared `mimeType`), not the negotiated delivery format.
- Cache headers for `public/` assets depend on the hosting platform honouring Next.js `headers()`.
