import { canonicalUrl, normalizePathname } from "@/lib/routes";
import type { ContentStatus, Media, Seo } from "@/server/validation/common";
import type { SiteContact, SocialLink } from "@/server/validation/content";

/** Site-wide inputs to SEO generation. Built from SiteSettings + environment. */
export type SiteSeoContext = {
  siteUrl: string;
  siteName: string;
  siteDescription?: string;
  defaultSeo?: Seo | null;
  defaultOgImage?: Media | null;
  logo?: Media | null;
  socialLinks?: SocialLink[];
  contact?: SiteContact | null;
  /** False on development/staging: everything is forced to noindex. */
  allowIndexing: boolean;
};

/** Content-agnostic description of one public page, produced by an adapter. */
export type SeoSource = {
  path: string;
  type?: "website" | "article";
  status: ContentStatus;
  /** Content title/name. Empty for the Home page (falls back to site defaults). */
  title: string;
  /** Plain-text summary/excerpt used as the description fallback. */
  summary?: string | null;
  /** Content image used as the OG fallback. */
  image?: Media | null;
  seo?: Seo | null;
  isHome?: boolean;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
};

export type ResolvedImage = { url: string; alt: string; width?: number; height?: number };

export type ResolvedMetadata = {
  path: string;
  title: string;
  description?: string;
  canonical: string;
  robots: { index: boolean; follow: boolean };
  openGraph: { title: string; description?: string; url: string; type: "website" | "article"; siteName: string; image?: ResolvedImage };
  twitter: { card: "summary" | "summary_large_image"; title: string; description?: string; image?: ResolvedImage };
  publishedTime?: string;
  modifiedTime?: string;
};

export const DESCRIPTION_MAX = 160;

const clean = (v?: string | null) => v?.replace(/\s+/g, " ").trim() || undefined;

/** Cut at a word boundary, adding an ellipsis only when something was removed. */
export function truncateAtWord(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const atWord = cut.slice(0, cut.lastIndexOf(" ") > max / 2 ? cut.lastIndexOf(" ") : undefined);
  return `${atWord.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/** "Title | Site", unless the title is the Home page or already names the site. */
export function formatTitle(title: string, siteName: string, isHome = false): string {
  if (isHome || title.toLowerCase().includes(siteName.toLowerCase())) return title;
  return `${title} | ${siteName}`;
}

export function absoluteUrl(url: string, siteUrl: string): string {
  return new URL(url, siteUrl).toString();
}

const NON_PUBLIC_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?$)|\.(local|internal)$|^[^.]+$/i;

/**
 * Absolute image URL for previews. On an indexable (production) tier an image
 * that is not on a public https host is dropped, so stale or development data
 * can never put a localhost/private URL into og:image.
 */
function resolveImage(media: Media | null | undefined, site: SiteSeoContext): ResolvedImage | undefined {
  if (!media) return undefined;
  const url = new URL(media.url, site.siteUrl);
  if (site.allowIndexing && (url.protocol !== "https:" || NON_PUBLIC_HOST.test(url.hostname))) return undefined;
  return { url: url.toString(), alt: media.alt, width: media.width, height: media.height };
}

/** The site's own path for an explicit canonical override, or null if it is foreign/unparseable. */
export function ownCanonicalOverride(override: string | undefined, siteUrl: string): string | null {
  if (!override) return null;
  try {
    const u = new URL(override);
    return u.origin === new URL(siteUrl).origin ? canonicalUrl(u.pathname, siteUrl) : null;
  } catch {
    return null;
  }
}

/** Canonical URL: a same-origin explicit override, else the route on the configured site origin. Never the request host. */
export function resolveCanonical(site: SiteSeoContext, path: string, seo?: Seo | null): string {
  return ownCanonicalOverride(seo?.canonicalUrl, site.siteUrl) ?? canonicalUrl(normalizePathname(path), site.siteUrl);
}

/** Robots decision: forced noindex,nofollow unless published on an indexable tier; flags then default to index,follow. */
export function resolveRobots(site: SiteSeoContext, status: ContentStatus, seo?: Seo | null) {
  const indexable = status === "published" && site.allowIndexing;
  return { index: indexable && (seo?.robotsIndex ?? true), follow: indexable && (seo?.robotsFollow ?? true) };
}

/**
 * The single metadata resolver. Fallback order:
 *  title       seo.metaTitle → content title → site default title → site name
 *  description seo.metaDescription → content summary (trimmed) → site default → site description
 *  og image    seo.ogImage → content image → site default OG image → none
 *  canonical   same-host seo.canonicalUrl → route path on the configured site URL
 *  robots      forced noindex,nofollow unless published on an indexable tier
 */
export function resolveMetadata(site: SiteSeoContext, source: SeoSource): ResolvedMetadata {
  const seo = source.seo ?? {};
  const path = normalizePathname(source.path);

  const baseTitle = clean(seo.metaTitle) ?? clean(source.title) ?? clean(site.defaultSeo?.metaTitle) ?? site.siteName;
  const title = formatTitle(baseTitle, site.siteName, source.isHome);
  const summary = clean(source.summary);
  const description =
    clean(seo.metaDescription) ??
    (summary ? truncateAtWord(summary) : undefined) ??
    clean(site.defaultSeo?.metaDescription) ??
    clean(site.siteDescription);

  const canonical = resolveCanonical(site, path, seo);
  const robots = resolveRobots(site, source.status, seo);

  const type = source.type ?? "website";
  const image = resolveImage(seo.ogImage ?? source.image ?? site.defaultOgImage, site);
  const ogTitle = clean(seo.ogTitle) ?? title;
  const ogDescription = clean(seo.ogDescription) ?? description;
  const twitterImage = resolveImage(seo.twitterImage, site) ?? image;

  return {
    path,
    title,
    description,
    canonical,
    robots,
    openGraph: { title: ogTitle, description: ogDescription, url: canonical, type, siteName: site.siteName, image },
    twitter: {
      card: seo.twitterCard ?? (twitterImage ? "summary_large_image" : "summary"),
      title: clean(seo.twitterTitle) ?? ogTitle,
      description: clean(seo.twitterDescription) ?? ogDescription,
      image: twitterImage,
    },
    ...(type === "article" && source.publishedAt ? { publishedTime: source.publishedAt.toISOString() } : {}),
    ...(type === "article" && source.updatedAt ? { modifiedTime: source.updatedAt.toISOString() } : {}),
  };
}
