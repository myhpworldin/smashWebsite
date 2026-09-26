import { z } from "zod";
import { getSiteUrl } from "@/lib/site-url";
import { getMediaHosts, isProductionTier } from "@/lib/media-config";
import {
  IMAGE_MIMES,
  IMAGE_TYPES,
  MAX_IMAGE_DIMENSION,
  MAX_VIDEO_LONG_SIDE,
  MAX_VIDEO_SECONDS,
  SOCIAL_IMAGE_MIMES,
  VIDEO_MIMES,
  VIDEO_TYPES,
  extensionOf,
  imageMimeFromExtension,
  type ImageMime,
  type VideoMime,
} from "@/lib/media";

/* ── URL policy ───────────────────────────────────────────────────────── */

const SIGNED_QUERY = /^(x-amz-|x-goog-|signature|sig$|token|expires|policy|key-pair-id|access_key|auth|credential)/i;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$)|\.(local|internal|localhost)$|^[^.]+$/i;

const hostAllowed = (host: string): boolean => {
  const allowed = [new URL(getSiteUrl()).host.toLowerCase(), ...getMediaHosts()];
  return allowed.some((a) => (a.startsWith("*.") ? host.endsWith(a.slice(1)) && host.length > a.length - 1 : host === a));
};

/**
 * Why a media URL is not acceptable, or null. Public media must be a stable,
 * intentionally public URL: a root-relative path (served from this site) or an
 * https URL. Production additionally requires an approved host and refuses
 * localhost/private addresses, plain http and signed/temporary URLs everywhere.
 */
export function mediaUrlProblem(raw: string, kind: "image" | "video"): string | null {
  if (raw !== raw.trim() || /[\s\u0000-\u001f\u007f\\]/.test(raw)) return "URL contains whitespace, control characters or backslashes";
  if (raw.length > 2000) return "URL is too long";

  let path: string;
  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) return "Protocol-relative URLs are not allowed";
    path = raw.split(/[?#]/, 1)[0];
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return "URL is not validly encoded";
    }
    if (/%2f|%5c/i.test(path) || decoded.split("/").some((seg) => seg === ".." || seg === ".") || decoded.includes("\u0000")) {
      return "Path traversal is not allowed";
    }
  } else {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return "Must be an absolute https URL or a root-relative path";
    }
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local && !isProductionTier())) return "Media URLs must use https";
    if (url.username || url.password) return "URL must not contain credentials";
    if ([...url.searchParams.keys()].some((k) => SIGNED_QUERY.test(k))) return "Signed or temporary URLs are not stable public URLs";
    if (isProductionTier()) {
      if (PRIVATE_HOST.test(url.hostname)) return "Localhost and private addresses are not public media URLs";
      if (!hostAllowed(url.host.toLowerCase())) return `Host "${url.host}" is not an approved media host (MEDIA_ALLOWED_HOSTS)`;
    }
    path = url.pathname;
  }

  const ext = extensionOf(path);
  if (ext) {
    const known = kind === "image" ? imageMimeFromExtension(ext) : VIDEO_MIMES.find((m) => (VIDEO_TYPES[m].extensions as readonly string[]).includes(ext));
    if (!known) return `".${ext}" is not a supported ${kind} file type`;
  }
  return null;
}

/* ── alt text ─────────────────────────────────────────────────────────── */

const GENERIC_ALT = /^(image|photo|picture|pic|img|graphic|banner|thumbnail|untitled|placeholder|image of|photo of|picture of|screenshot)$/i;
const FILENAME_ALT = /\.(jpe?g|png|webp|avif|gif|svg)$|^(img|dsc|dscn|image|photo|screenshot|pic)[-_ ]?\d+/i;

/** Objective alt-text problems only. Whether the text is *good* stays an editorial call. */
export function altProblem(alt: string): string | null {
  const text = alt.trim();
  if (GENERIC_ALT.test(text)) return `"${text}" is generic; describe what the image shows`;
  if (FILENAME_ALT.test(text)) return "Alt text looks like a filename; describe what the image shows";
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  if ([...counts.values()].some((n) => n >= 4) || (text.match(/,/g) ?? []).length >= 6) return "Alt text looks like a keyword list; describe the image naturally";
  return null;
}

/* ── image and video schemas ──────────────────────────────────────────── */

const dimension = z.number().int().positive().max(MAX_IMAGE_DIMENSION);

/**
 * A media reference. `alt` is required unless the image is marked decorative,
 * in which case it is normalised to "" so the frontend renders it as decorative.
 * `format` is derived (never stored); `loading` is decided at the API boundary.
 */
export const mediaSchema = z
  .object({
    url: z.string(),
    alt: z.string().trim().max(300).default(""),
    decorative: z.boolean().optional(),
    width: dimension.optional(),
    height: dimension.optional(),
    mimeType: z.enum(IMAGE_MIMES).optional(),
    caption: z.string().trim().min(1).max(300).optional(),
  })
  .superRefine((m, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    const urlProblem = mediaUrlProblem(m.url, "image");
    if (urlProblem) issue("url", urlProblem);

    if (!m.decorative) {
      if (!m.alt) issue("alt", "Alt text is required (or mark the image as decorative)");
      else {
        const p = altProblem(m.alt);
        if (p) issue("alt", p);
      }
    }
    if ((m.width === undefined) !== (m.height === undefined)) issue(m.width === undefined ? "width" : "height", "Provide both width and height, or neither");

    const ext = extensionOf(m.url);
    const fromExt = imageMimeFromExtension(ext);
    if (!ext && !m.mimeType) issue("mimeType", "URL has no file extension, so mimeType is required");
    if (m.mimeType && fromExt && m.mimeType !== fromExt) issue("mimeType", `mimeType ${m.mimeType} does not match the .${ext} extension`);
  })
  .transform((m) => (m.decorative ? { ...m, alt: "" } : m));
export type Media = z.infer<typeof mediaSchema>;

/** Social preview images: a raster format crawlers reliably render (no SVG/AVIF). */
export const socialImageSchema = mediaSchema.refine(
  (m) => {
    const mime: ImageMime | null = m.mimeType ?? imageMimeFromExtension(extensionOf(m.url));
    return !mime || SOCIAL_IMAGE_MIMES.includes(mime);
  },
  { path: ["url"], message: "Social preview images must be JPEG, PNG, WebP or GIF" },
);

/**
 * A self-hosted or CDN video file with a required poster. Autoplay is opt-in and
 * means muted, looping, decorative playback only. No embeds/streaming provider is supported.
 */
export const videoSchema = z
  .object({
    url: z.string(),
    mimeType: z.enum(VIDEO_MIMES),
    poster: mediaSchema,
    duration: z.number().positive().max(MAX_VIDEO_SECONDS).optional(),
    width: dimension.optional(),
    height: dimension.optional(),
    autoplay: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const problem = mediaUrlProblem(v.url, "video");
    if (problem) ctx.addIssue({ code: "custom", path: ["url"], message: problem });
    const ext = extensionOf(v.url);
    const expected = (VIDEO_TYPES[v.mimeType as VideoMime].extensions as readonly string[]);
    if (ext && !expected.includes(ext)) ctx.addIssue({ code: "custom", path: ["mimeType"], message: `mimeType ${v.mimeType} does not match the .${ext} extension` });
    if ((v.width === undefined) !== (v.height === undefined)) ctx.addIssue({ code: "custom", path: ["width"], message: "Provide both width and height, or neither" });
    if (v.width && v.height && Math.max(v.width, v.height) > MAX_VIDEO_LONG_SIDE) {
      ctx.addIssue({ code: "custom", path: ["width"], message: `Video is larger than ${MAX_VIDEO_LONG_SIDE}px on its long side; encode at 1080p or 1440p (no 4K)` });
    }
  });
export type Video = z.infer<typeof videoSchema>;

export { IMAGE_TYPES };
