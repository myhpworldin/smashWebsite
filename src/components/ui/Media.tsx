import Image from "next/image";
import type { PublicMedia } from "@/server/media/public";

/**
 * Matches the dominant real usage: a card in a `CardGrid` (1 col below 768px,
 * 2 at 768px, 3 at 1024px — the exact breakpoints in `CardGrid.module.css`).
 * `sizes` only ever narrows the srcset candidate `next/image` picks; a caller
 * whose layout differs (a full-bleed hero, a fixed-size avatar) passes its own
 * `sizes` explicitly rather than this being wrong for them (Stage 3, Phase 8:
 * no `<Media>` caller specified `sizes` at all, so every image was choosing a
 * fixed-DPR srcset instead of one that accounts for how much of the viewport
 * it actually occupies at each breakpoint — a real, if quiet, mobile payload cost).
 */
const DEFAULT_SIZES = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";

/**
 * The one place a public `Media` object (API.md "Media") becomes a rendered
 * image. Never render a raw `<img src={...}>` in a page/content component
 * (phase brief §20) — always go through this, so responsive sizing, lazy
 * loading and dimensions stay consistent everywhere. Types against
 * `PublicMedia`, the exact shape every API response actually returns
 * (`src/server/media/public.ts`), not the internal storage shape.
 */
export function Media({ media, sizes, className }: { media: PublicMedia | null; sizes?: string; className?: string }) {
  if (!media) return null;
  const { url, alt, width, height, decorative, loading } = media;
  return (
    <Image
      src={url}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={width ?? 1200}
      height={height ?? 800}
      loading={loading}
      sizes={sizes ?? DEFAULT_SIZES}
      className={className}
    />
  );
}
