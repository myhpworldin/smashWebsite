import type { Db } from "@/server/db/helpers";
import { findOneRow } from "@/server/db/helpers";
import { homePage, SINGLETON_ID } from "@/server/db/schema";
import { getSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { AppError } from "@/server/lib/errors";
import { homeSeoProblems } from "@/server/validation/publish";

/** Search results show roughly this much before truncating; longer values are a warning, never an error. */
const TITLE_MAX = 65;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;

/**
 * What is missing for the Home page's SEO, for the person editing it (returned with `GET /api/admin/home`).
 *  - `required`: blocks publishing an indexable Home (the same rule `saveHomePage` enforces).
 *  - `recommended`: does not block, but the page is weaker or falls back to site-wide values without it.
 */
export async function getHomeSeoReadiness(db: Db) {
  const home = await findOneRow(db, homePage, { _id: SINGLETON_ID as never });
  const seo = home?.seo ?? null;
  const required = Object.values(homeSeoProblems(seo));

  let settings: Awaited<ReturnType<typeof getSiteSettings>> | null = null;
  try {
    settings = await getSiteSettings(db);
  } catch (err) {
    if (!(err instanceof AppError && err.code === "NOT_FOUND")) throw err;
  }

  const recommended: string[] = [];
  if (!settings) recommended.push("Site Settings are not saved yet: the site name (used in previews and Organization data) falls back to the host name.");
  else if (!settings.siteDescription && !settings.defaultSeo?.metaDescription) recommended.push("Site Settings have no site description or default SEO description for pages without their own.");
  if (!seo?.ogImage && !home?.hero?.media && !settings?.defaultOgImage) recommended.push("No social preview image: add a Home OG image, a hero image or a default OG image in Site Settings.");
  if (seo?.metaTitle && seo.metaTitle.length > TITLE_MAX) recommended.push(`SEO title is ${seo.metaTitle.length} characters; about ${TITLE_MAX} or fewer avoids truncation in search results.`);
  const d = seo?.metaDescription?.length ?? 0;
  if (d && (d < DESCRIPTION_MIN || d > DESCRIPTION_MAX)) recommended.push(`SEO description is ${d} characters; ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} reads best in search results.`);
  return { indexable: seo?.robotsIndex !== false, required, recommended };
}
