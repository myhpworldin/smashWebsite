import type { NextConfig } from "next";
import { IMAGE_CACHE_SECONDS, IMAGE_QUALITY, IMAGE_SMALL_SIZES, IMAGE_WIDTHS } from "./src/lib/media";
import { getMediaHosts } from "./src/lib/media-config";

const isProduction = process.env.APP_ENV === "production";

/**
 * Security headers for every response. The CSP is deliberately limited to
 * directives that cannot break the site: there is no script-src/img-src/style-src
 * yet because Next.js inline scripts need per-request nonces and the frontend's
 * fonts, analytics and media hosts are not decided. Tighten it when they are.
 */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS only where HTTPS is guaranteed; no `preload` (a hard-to-reverse commitment to make deliberately).
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
  // Second layer behind meta robots and robots.txt: nothing outside production may be indexed.
  // APP_ENV must therefore be set when the app is built as well as when it runs.
  ...(isProduction ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

/** The JSON API is a data feed, not a page: crawlable (no robots.txt block) but never indexed. */
export const apiRobotsHeaders = [{ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];

/** Draft preview (Stage 4, Phase 2): noindex at the header level too, on every tier — the same page-level `generateMetadata` already returns this, this is the belt-and-suspenders header layer. */
export const previewRobotsHeaders = [{ source: "/preview/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];

/** MEDIA_ALLOWED_HOSTS entries become optimizer remote patterns: "cdn.x.com", "cdn.x.com:8443", "*.x.com". */
export const remotePatterns = getMediaHosts().map((entry) => {
  const [host, port = ""] = entry.split(":");
  return { protocol: "https" as const, hostname: host.startsWith("*.") ? `**.${host.slice(2)}` : host, port };
});

/**
 * Media caching. Optimized images are cached for IMAGE_CACHE_SECONDS. Files
 * under /media whose name ends in a content hash ("hero-3fa9c2d1.jpg") never
 * change, so they are immutable for a year; any other file there is cached for
 * a day with background revalidation. Replace a file by publishing a new name.
 */
export const mediaCacheHeaders = [
  { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
  {
    source: "/media/:path*/:file(.+-[a-f0-9]{8,}\\.[a-z0-9]+)",
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [...IMAGE_WIDTHS],
    imageSizes: [...IMAGE_SMALL_SIZES],
    qualities: [IMAGE_QUALITY],
    minimumCacheTTL: IMAGE_CACHE_SECONDS,
    remotePatterns,
    dangerouslyAllowSVG: false,
  },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }, ...apiRobotsHeaders, ...previewRobotsHeaders, ...mediaCacheHeaders],
};

export default nextConfig;
