import "server-only";
import { cache } from "react";
import { getDb } from "@/server/db/client";
import { indexingFromEnv } from "@/server/seo/env-context";
import { loadSiteSeoContext } from "@/server/seo/site-context";
import { getPublishedHome } from "@/server/modules/home/home.service";
import { getPublishedServiceBySlug, listPublishedServices } from "@/server/modules/services/services.service";
import { getPublishedCaseStudyBySlug } from "@/server/modules/work/work.service";
import { getPublishedInsightBySlug } from "@/server/modules/insights/insights.service";
import { getPublishedCareerBySlug } from "@/server/modules/careers/careers.service";
import { getSiteSettings as getSiteSettingsRecord } from "@/server/modules/site-settings/site-settings.service";
import { AppError } from "@/server/lib/errors";
import { ROUTES } from "@/lib/routes";
import { homeDto, type HomeResponse } from "@/server/api/home.dto";
import { toPublicSeo } from "@/server/api/serializers";
import { homeSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";

/**
 * Per-request memoisation: generateMetadata, JSON-LD and the page body all need
 * the same record and site context, so each is fetched once per request.
 */
export const getSiteContext = cache(() => loadSiteSeoContext(getDb(), indexingFromEnv()));
export const getHome = cache(() => getPublishedHome(getDb()));
/**
 * The Home page exactly as `GET /api/home` returns it (same DTO, same media projection), so the page and the API
 * cannot disagree. `null` only when Home is not published (a real empty state); any other failure still propagates.
 */
export const getHomeResponse = cache(async (): Promise<HomeResponse | null> => {
  try {
    const raw = await getHome();
    const seo = toPublicSeo(resolveMetadata(await getSiteContext(), homeSource(raw)));
    return publicizeMedia(homeDto(raw, seo), ["hero"]) as HomeResponse;
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") return null;
    throw err;
  }
});
/** The published services in display order, for the header's Services menu. Empty (menu hidden) if they cannot be read: the header renders on every page, error pages included. */
export const getServiceNavItems = cache(async (): Promise<{ label: string; path: string }[]> => {
  try {
    const { items } = await listPublishedServices(getDb(), { page: 1, limit: 50 });
    return items.map((s) => ({ label: s.name, path: ROUTES.SERVICE(s.slug) }));
  } catch {
    return [];
  }
});
export const getService = cache((slug: string) => getPublishedServiceBySlug(getDb(), slug));
export const getCaseStudy = cache((slug: string) => getPublishedCaseStudyBySlug(getDb(), slug));
export const getInsight = cache((slug: string) => getPublishedInsightBySlug(getDb(), slug));
export const getCareer = cache((slug: string) => getPublishedCareerBySlug(getDb(), slug));
/**
 * Used by the global Footer (Stage 3, Phase 1) — resolves to `null` only when
 * settings genuinely don't exist yet (a real empty state, not an error). Any
 * other failure (e.g. a database outage) still propagates, consistent with the
 * project's outage policy (SEO_INDEXING.md "Outages": never a blank, silently
 * "successful" page when the database is actually down).
 */
export const getSiteSettings = cache(async () => {
  // `async` so a synchronous throw from getDb() (e.g. no MONGODB_URI) becomes a
  // rejected promise too, and the Footer's own .catch() can actually see it —
  // a plain arrow function returning a rejected promise would not catch a throw
  // that happens before the promise chain is even constructed.
  try {
    return await getSiteSettingsRecord(getDb());
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") return null;
    throw err;
  }
});
