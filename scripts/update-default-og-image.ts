import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { closeDb, getDb } from "@/server/db/client";
import { homePage, siteSettings } from "@/server/db/schema";
import { DEFAULT_OG_IMAGE } from "@/server/db/service-seo-copy";
import { mediaSchema } from "@/server/validation/media";

/**
 * Final audit (2026-10-23): the social-sharing image used by Home (its `seo.ogImage`) and by every page without an image
 * of its own (Site Settings `defaultOgImage`) becomes public/media/og-default.jpg — 1200×630, ~21 KB, the brand backdrop
 * with the SMASH logo — instead of the 2880×1768, 1 MB main-banner.png with no logo. Backs up both current values to
 * prototypes/pre-final-audit/og-backup.json first (refusing to overwrite an earlier backup).
 * Undo: node --env-file=.env.local prototypes/pre-final-audit/restore-og.js
 */
const BACKUP = "prototypes/pre-final-audit/og-backup.json";
const OG_IMAGE = mediaSchema.parse(DEFAULT_OG_IMAGE);

async function main() {
  const db = getDb();
  const settings = await db.collection(siteSettings).find({}).toArray();
  const homes = await db.collection(homePage).find({}).toArray();
  if (!settings.length) throw new Error("No Site Settings record found");
  if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists: restore or move it before running again`);
  mkdirSync("prototypes/pre-final-audit", { recursive: true });
  writeFileSync(BACKUP, JSON.stringify({
    takenAt: new Date().toISOString(),
    siteSettings: settings.map((s) => ({ _id: s._id, defaultOgImage: s.defaultOgImage ?? null })),
    home: homes.map((h) => ({ _id: h._id, ogImage: h.seo?.ogImage ?? null })),
  }, null, 1));
  const now = new Date();
  for (const s of settings) await db.collection(siteSettings).updateOne({ _id: s._id }, { $set: { defaultOgImage: OG_IMAGE, updatedAt: now } });
  for (const h of homes) await db.collection(homePage).updateOne({ _id: h._id }, { $set: { "seo.ogImage": OG_IMAGE, updatedAt: now } });
  console.log(`Default and Home OG image → ${OG_IMAGE.url} (${settings.length} settings, ${homes.length} home). Backup: ${BACKUP}`);
  console.log("Public pages refresh within the hour, or straight away after POST /api/admin/revalidate.");
}

main().then(() => closeDb(), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
