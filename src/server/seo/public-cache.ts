import "server-only";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db/client";
import { findPicked, isPublished } from "@/server/db/helpers";
import { services } from "@/server/db/schema";
import { logger } from "@/server/lib/logger";
import { CONTENT_TABLES } from "@/server/seo/sitemap";
import type { ContentRouteType } from "@/lib/routes";

/**
 * Public pages are cached and regenerated (ISR) instead of rendered on every request: each public page file exports
 * `revalidate = 3600` (a literal, as Next.js requires), so a cached page is rebuilt in the background at most an hour
 * after it was generated, and a failed rebuild (e.g. a database outage) keeps serving the last good page. Content edits
 * do not wait for that hour: every successful admin content write calls `revalidatePublicPages()` (`adminApi`,
 * handler.ts), and the next visit to each page renders it fresh. The hour only bounds edits made outside the admin API
 * (a DB script, a direct Atlas edit); `POST /api/admin/revalidate` clears the cache straight away after one of those.
 *
 * Only pages with no per-visitor content are cached. Admin, client portal, preview, the API and the paginated
 * listings (Work, Insights, which read `?page=`) still render per request.
 */

/** `generateStaticParams` for a detail route: its published slugs, prerendered at build. Slugs published later render on their first visit and are cached from then on. */
export async function publishedSlugParams(type: ContentRouteType): Promise<{ slug: string }[]> {
  const rows = await findPicked(getDb(), CONTENT_TABLES[type], isPublished(), ["slug"] as const);
  return rows.map((r) => ({ slug: String(r.slug) }));
}

/** The same for the offering pages, which live inside their published category's `deliverables[]`. */
export async function publishedOfferingParams(): Promise<{ slug: string; offeringSlug: string }[]> {
  const rows = (await findPicked(getDb(), services, isPublished(), ["slug", "deliverables"] as const)) as { slug: string; deliverables: { offering?: { slug?: string } }[] | null }[];
  return rows.flatMap((c) => (c.deliverables ?? []).flatMap((d) => (d.offering?.slug ? [{ slug: c.slug, offeringSlug: d.offering.slug }] : [])));
}

/**
 * Drops every cached public page, so each one renders from the database on its next visit. All of them, not just the
 * edited one: the header menu, footer and structured data on every page read services and Site Settings. Never
 * throws: it runs after a write has already succeeded, and a failure here must not report that write as failed.
 */
export function revalidatePublicPages() {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
  } catch (err) {
    logger.error("Public page cache could not be cleared", { error: err instanceof Error ? err.message : String(err) });
  }
}
