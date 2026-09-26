import { CONTENT_ROUTES, LIVE_STATIC_ROUTES, ROUTES, normalizePathname } from "@/lib/routes";
import { HOME_LABEL, STATIC_PAGES } from "@/server/seo/static-pages";

/** `path: null` means the segment names a real place in the hierarchy but has no live page to link to (Stage 3, Phase 9 fix — see below). */
export type Crumb = { name: string; path: string | null };

/**
 * Breadcrumbs follow the real route hierarchy: Home → hub → detail.
 * `leafName` is the content's own title; without it the slug is shown.
 *
 * The hub segment is only a link when that hub actually has a page file
 * (`LIVE_STATIC_ROUTES`, the same rule `nav.ts` already applies to primary
 * navigation) — a service's breadcrumb previously linked "Services" to
 * `/services`, which 404s (no hub page exists yet), in both the visible trail
 * and the BreadcrumbList schema. Found live during Stage 3, Phase 9's
 * broken-link audit; `Breadcrumbs.tsx` and `breadcrumbJsonLd` both render a
 * `path: null` crumb as unlinked text instead.
 */
export function buildBreadcrumbs(rawPath: string, leafName?: string): Crumb[] {
  const path = normalizePathname(rawPath);
  const crumbs: Crumb[] = [{ name: HOME_LABEL, path: ROUTES.HOME }];
  if (path === ROUTES.HOME) return crumbs;

  const [, prefix, slug] = path.split("/");
  const hub = `/${prefix}`;
  crumbs.push({ name: STATIC_PAGES[hub]?.title ?? prefix, path: LIVE_STATIC_ROUTES.includes(hub) ? hub : null });

  const isDetail = slug && Object.values(CONTENT_ROUTES).some((r) => r.prefix === hub);
  if (isDetail) crumbs.push({ name: leafName?.trim() || slug, path });
  return crumbs;
}
