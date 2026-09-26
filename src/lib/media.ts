/**
 * Media facts shared by validation, API projection and next.config.ts. Pure and
 * isomorphic. The delivery mechanism (today: the Next.js image optimizer) is
 * confined to buildOptimizedUrl(), so swapping in a CDN/provider changes one function.
 */
export const IMAGE_TYPES = {
  "image/jpeg": { format: "jpeg", extensions: ["jpg", "jpeg"], optimizable: true },
  "image/png": { format: "png", extensions: ["png"], optimizable: true },
  "image/webp": { format: "webp", extensions: ["webp"], optimizable: true },
  "image/avif": { format: "avif", extensions: ["avif"], optimizable: true },
  "image/gif": { format: "gif", extensions: ["gif"], optimizable: false },
  // Only ever rendered through <img>; never inlined, never used for OG.
  "image/svg+xml": { format: "svg", extensions: ["svg"], optimizable: false },
} as const;
export type ImageMime = keyof typeof IMAGE_TYPES;
export const IMAGE_MIMES = Object.keys(IMAGE_TYPES) as [ImageMime, ...ImageMime[]];

export const VIDEO_TYPES = {
  "video/mp4": { extensions: ["mp4"] },
  "video/webm": { extensions: ["webm"] },
} as const;
export type VideoMime = keyof typeof VIDEO_TYPES;
export const VIDEO_MIMES = Object.keys(VIDEO_TYPES) as [VideoMime, ...VideoMime[]];

/** Small / medium / large / extra-large. Also the optimizer's allowed widths (see next.config.ts). */
export const IMAGE_WIDTHS = [480, 960, 1440, 1920] as const;
/** Small fixed sizes for logos, avatars and thumbnails. */
export const IMAGE_SMALL_SIZES = [96, 192, 384] as const;
export const IMAGE_QUALITY = 75;
/** Optimized responses are cached this long (versioned filenames make that safe; see MEDIA_ARCHITECTURE.md). */
export const IMAGE_CACHE_SECONDS = 60 * 60 * 24 * 30;

/** OG/Twitter previews: formats crawlers reliably render. */
export const SOCIAL_IMAGE_MIMES: readonly ImageMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Sanity limits for references (no upload path exists to enforce file sizes). */
export const MAX_IMAGE_DIMENSION = 10_000;
export const MAX_VIDEO_LONG_SIDE = 2560; // rules out 4K (3840)
export const MAX_VIDEO_SECONDS = 600;

export const extensionOf = (url: string): string | null => {
  const path = url.split(/[?#]/, 1)[0];
  const m = /\.([a-z0-9]+)$/i.exec(path.slice(path.lastIndexOf("/") + 1));
  return m ? m[1].toLowerCase() : null;
};

export function imageMimeFromExtension(ext: string | null): ImageMime | null {
  if (!ext) return null;
  return (IMAGE_MIMES.find((m) => (IMAGE_TYPES[m].extensions as readonly string[]).includes(ext)) ?? null) as ImageMime | null;
}

/** Deterministic optimizer URL for one width. Never upscales: callers pass widths <= the source width. */
export function buildOptimizedUrl(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${IMAGE_QUALITY}`;
}

export type SrcSetInput = { url: string; width?: number; mimeType?: ImageMime; canOptimize: boolean };

/**
 * `srcset` for a raster image, only for widths the source can actually supply.
 * Returns undefined when it would not help (unknown/small source, SVG/GIF, or a host the optimizer is not configured for).
 */
export function buildSrcSet({ url, width, mimeType, canOptimize }: SrcSetInput): string | undefined {
  if (!canOptimize || !width) return undefined;
  const mime = mimeType ?? imageMimeFromExtension(extensionOf(url));
  if (mime && !IMAGE_TYPES[mime].optimizable) return undefined;
  // Only configured widths are valid optimizer requests, and never wider than the source.
  const sizes = IMAGE_WIDTHS.filter((w) => w <= width);
  return sizes.length > 1 ? sizes.map((w) => `${buildOptimizedUrl(url, w)} ${w}w`).join(", ") : undefined;
}

export const formatOf = (mimeType?: ImageMime, url?: string): string | undefined => {
  const mime = mimeType ?? (url ? imageMimeFromExtension(extensionOf(url)) : null);
  return mime ? IMAGE_TYPES[mime].format : undefined;
};
