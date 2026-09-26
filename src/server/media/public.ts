import { IMAGE_TYPES, buildSrcSet, extensionOf, formatOf, imageMimeFromExtension } from "@/lib/media";
import { getMediaHosts } from "@/lib/media-config";
import type { Media, Video } from "@/server/validation/media";

/**
 * Public media contract. Stored references are projected to a stable shape;
 * nothing provider-specific is exposed. `format` is derived, `srcSet` lists
 * only sizes the source can supply (never upscaled), and `loading` is a hint
 * ("eager" for above-the-fold hero media, otherwise "lazy") that the frontend may override.
 */
export type PublicMedia = {
  url: string;
  alt: string;
  decorative?: true;
  width?: number;
  height?: number;
  mimeType?: string;
  format?: string;
  caption?: string;
  loading: "eager" | "lazy";
  srcSet?: string;
};

export type PublicVideo = {
  url: string;
  mimeType: string;
  poster: PublicMedia;
  duration?: number;
  width?: number;
  height?: number;
  autoplay: boolean;
  /** Autoplay is only ever muted; the player must set `muted` when `autoplay` is true. */
  muted: boolean;
  loading: "eager" | "lazy";
};

/** The optimizer serves this site's files and configured media hosts (next.config.ts) only. */
const canOptimize = (url: string): boolean => {
  if (url.startsWith("/")) return true;
  try {
    const host = new URL(url).host.toLowerCase();
    return getMediaHosts().some((a) => (a.startsWith("*.") ? host.endsWith(a.slice(1)) : host === a));
  } catch {
    return false;
  }
};

export function toPublicMedia(m: Media, eager = false): PublicMedia {
  const mime = m.mimeType ?? imageMimeFromExtension(extensionOf(m.url)) ?? undefined;
  const srcSet = buildSrcSet({ url: m.url, width: m.width, mimeType: mime, canOptimize: canOptimize(m.url) });
  return {
    url: m.url,
    alt: m.decorative ? "" : m.alt,
    ...(m.decorative ? { decorative: true as const } : {}),
    ...(m.width && m.height ? { width: m.width, height: m.height } : {}),
    ...(mime ? { mimeType: mime, format: formatOf(mime) } : {}),
    ...(m.caption ? { caption: m.caption } : {}),
    loading: eager ? "eager" : "lazy",
    ...(srcSet ? { srcSet } : {}),
  };
}

export function toPublicVideo(v: Video, eager = false): PublicVideo {
  return {
    url: v.url,
    mimeType: v.mimeType,
    poster: toPublicMedia(v.poster, eager),
    ...(v.duration ? { duration: v.duration } : {}),
    ...(v.width && v.height ? { width: v.width, height: v.height } : {}),
    autoplay: v.autoplay === true,
    muted: v.autoplay === true,
    loading: eager ? "eager" : "lazy",
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
const isVideo = (v: Record<string, unknown>) => typeof v.url === "string" && isObject(v.poster) && typeof v.mimeType === "string" && v.mimeType.startsWith("video/");
const isImage = (v: Record<string, unknown>) => typeof v.url === "string" && typeof v.alt === "string" && !("label" in v);

/** Subtrees that carry image metadata for previews, not renderable page media. */
const SKIP_KEYS = new Set(["seo"]);

/**
 * Walks a response and projects every embedded media reference (hero, story,
 * tool logos, gallery, …) so no endpoint can forget to. `eagerKeys` are the
 * top-level keys holding above-the-fold media.
 */
export function publicizeMedia(value: unknown, eagerKeys: readonly string[] = [], top = ""): unknown {
  if (Array.isArray(value)) return value.map((v) => publicizeMedia(v, eagerKeys, top));
  if (!isObject(value)) return value;
  if (isVideo(value)) return toPublicVideo(value as unknown as Video, eagerKeys.includes(top));
  if (isImage(value)) return toPublicMedia(value as unknown as Media, eagerKeys.includes(top));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, SKIP_KEYS.has(k) ? v : publicizeMedia(v, eagerKeys, top || k)]),
  );
}

export { IMAGE_TYPES };
