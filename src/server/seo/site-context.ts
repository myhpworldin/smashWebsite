import { getSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { AppError } from "@/server/lib/errors";
import type { Db } from "@/server/db/helpers";
import type { SiteSeoContext } from "@/server/seo/metadata";

/**
 * Build the site-wide SEO context from SiteSettings. With no settings row the
 * site name falls back to the host name (nothing is invented).
 */
export async function loadSiteSeoContext(db: Db, opts: { siteUrl: string; allowIndexing: boolean }): Promise<SiteSeoContext> {
  const base = { siteUrl: opts.siteUrl, allowIndexing: opts.allowIndexing };
  try {
    const s = await getSiteSettings(db);
    return {
      ...base,
      siteName: s.siteName,
      siteDescription: s.siteDescription ?? undefined,
      defaultSeo: s.defaultSeo,
      defaultOgImage: s.defaultOgImage,
      logo: s.logo,
      socialLinks: s.socialLinks,
      contact: s.contact,
    };
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") return { ...base, siteName: new URL(opts.siteUrl).hostname };
    throw err;
  }
}
