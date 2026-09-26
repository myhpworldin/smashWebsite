import "server-only";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/lib/errors";
import { CONTENT_ROUTES, type ContentRouteType } from "@/lib/routes";
import { resolvePublicRoute } from "@/server/seo/resolve";

/**
 * For dynamic detail pages: exits with the framework's 404 or a permanent
 * redirect unless the slug names published content. Then load with the
 * matching module `getPublished*BySlug` (which also refuses drafts).
 */
export async function requirePublishedRoute(type: ContentRouteType, slug: string) {
  const path = CONTENT_ROUTES[type].build(slug);
  const result = await resolvePublicRoute(getDb(), path);
  if (result.kind === "redirect") return result.status === 301 ? permanentRedirect(result.to) : redirect(result.to);
  if (result.kind !== "content") notFound();
}

/** Run a module lookup and turn its NOT_FOUND into the framework 404. */
export async function orNotFound<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
