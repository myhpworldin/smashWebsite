import { closeDb, getDb } from "@/server/db/client";
import { BRAND_NAME, CASE_STUDY_SEO, CATEGORY_COPY, DEFAULT_OG_IMAGE, HOME_SEO, OFFERING_SEO } from "@/server/db/service-seo-copy";

/**
 * Writes the search and social copy in src/server/db/service-seo-copy.ts into the database: each service category's
 * summary, introduction and metadata, every offering page's metadata, Home's and the case studies' metadata, and Site
 * Settings' public brand name and default social image. Only those fields change: any other SEO field an editor has
 * set is kept. Safe to run again. Take a backup first (prototypes/pre-metadata-seo).
 */

/** `$set` entries for an `seo` object: whole when there is none yet (a dotted path cannot be set inside `null`), field by field otherwise. */
function seoSet(at: string, current: unknown, fields: Record<string, unknown>) {
  if (!current || typeof current !== "object") return { [at]: fields };
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [`${at}.${k}`, v]));
}

async function main() {
  const db = getDb();
  const now = new Date();
  const log: string[] = [];

  for (const service of await db.collection("services").find({}).toArray()) {
    const copy = CATEGORY_COPY[service.slug as string];
    const set: Record<string, unknown> = {};
    if (copy) {
      Object.assign(set, { shortDescription: copy.shortDescription, description: copy.description }, seoSet("seo", service.seo, copy.seo));
      log.push(`category ${service.slug}`);
    }
    for (const [i, d] of (service.deliverables ?? []).entries()) {
      const seo = d.offering?.slug ? OFFERING_SEO[d.offering.slug as string] : undefined;
      if (!seo) continue;
      Object.assign(set, seoSet(`deliverables.${i}.offering.seo`, d.offering.seo, seo));
      log.push(`offering ${service.slug}/${d.offering.slug}`);
    }
    if (Object.keys(set).length) await db.collection("services").updateOne({ _id: service._id }, { $set: { ...set, updatedAt: now } });
  }

  for (const home of await db.collection("home_page").find({}).toArray()) {
    await db.collection("home_page").updateOne({ _id: home._id }, { $set: { ...seoSet("seo", home.seo, { ...HOME_SEO, ogImage: DEFAULT_OG_IMAGE }), updatedAt: now } });
    log.push("home");
  }

  for (const study of await db.collection("case_studies").find({ slug: { $in: Object.keys(CASE_STUDY_SEO) } }).toArray()) {
    await db.collection("case_studies").updateOne({ _id: study._id }, { $set: { ...seoSet("seo", study.seo, CASE_STUDY_SEO[study.slug as string]), updatedAt: now } });
    log.push(`case study ${study.slug}`);
  }

  const settings = await db.collection("site_settings").updateMany({}, { $set: { siteName: BRAND_NAME, defaultOgImage: DEFAULT_OG_IMAGE, updatedAt: now } });
  log.push(`site settings (${settings.modifiedCount})`);

  console.log(`Updated:\n  ${log.join("\n  ")}`);
}

main().then(() => closeDb(), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
