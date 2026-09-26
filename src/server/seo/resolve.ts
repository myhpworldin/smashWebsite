import { careers, caseStudies, insights, services } from "@/server/db/schema";
import { findPicked, publishedAnd, type Db } from "@/server/db/helpers";
import { CONTENT_ROUTES, STATIC_ROUTES, normalizePathname, type ContentRouteType } from "@/lib/routes";
import { findRedirect } from "@/server/seo/redirects";

const TABLES: Record<ContentRouteType, typeof careers | typeof caseStudies | typeof insights | typeof services> = { service: services, caseStudy: caseStudies, insight: insights, career: careers };

export type RouteResolution =
  | { kind: "static"; path: string }
  | { kind: "content"; type: ContentRouteType; slug: string; canonicalPath: string }
  | { kind: "redirect"; to: string; status: 301 | 308 }
  | { kind: "not-found" };

/** Split a normalized path into a content type and slug, if it has that shape. */
export function parseContentPath(path: string): { type: ContentRouteType; slug: string } | null {
  const [, prefix, slug, ...rest] = path.split("/");
  if (!prefix || !slug || rest.length) return null;
  const entry = (Object.entries(CONTENT_ROUTES) as [ContentRouteType, (typeof CONTENT_ROUTES)[ContentRouteType]][]).find(
    ([, r]) => r.prefix === `/${prefix}`,
  );
  return entry ? { type: entry[0], slug } : null;
}

/**
 * The one place a public URL is mapped to content. A path resolves to
 * published content, a recorded permanent redirect, or not-found. Drafts never
 * resolve, so an unpublished slug is indistinguishable from a missing one.
 */
export async function resolvePublicRoute(db: Db, rawPath: string): Promise<RouteResolution> {
  const path = normalizePathname(rawPath);
  if (STATIC_ROUTES.includes(path)) return { kind: "static", path };

  const parsed = parseContentPath(path);
  if (!parsed) return { kind: "not-found" };

  const table = TABLES[parsed.type];
  const [hit] = await findPicked(db, table, publishedAnd({ slug: parsed.slug }), [] as const, { limit: 1 });
  if (hit) return { kind: "content", ...parsed, canonicalPath: CONTENT_ROUTES[parsed.type].build(parsed.slug) };

  const moved = await findRedirect(db, path);
  return moved ? { kind: "redirect", ...moved } : { kind: "not-found" };
}
