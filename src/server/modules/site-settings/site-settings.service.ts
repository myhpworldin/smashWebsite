import { SINGLETON_ID, siteSettings } from "@/server/db/schema";
import { col, findOneRow, insertRow, mapDbError, toRow, type Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { siteSettingsInputSchema, siteSettingsUpdateSchema } from "./site-settings.schema";

/** Create the singleton (siteName required) or merge changes into it. */
export async function saveSiteSettings(db: Db, input: unknown) {
  const existing = await findOneRow(db, siteSettings, { _id: SINGLETON_ID as never });
  if (!existing) return insertRow(db, siteSettings, { id: SINGLETON_ID, ...siteSettingsInputSchema.parse(input) }, "Site settings");
  const changes = Object.fromEntries(Object.entries(siteSettingsUpdateSchema.parse(input)).filter(([, v]) => v !== undefined));
  try {
    const doc = await col(db, siteSettings).findOneAndUpdate({ _id: SINGLETON_ID as never }, { $set: { ...changes, updatedAt: new Date() } }, { returnDocument: "after" });
    return toRow(siteSettings, doc!);
  } catch (err) {
    return mapDbError(err, "Site settings");
  }
}

/** Site settings are always public (there is no draft state for them). */
export async function getSiteSettings(db: Db) {
  const row = await findOneRow(db, siteSettings, { _id: SINGLETON_ID as never });
  if (!row) throw AppError.notFound("Site settings");
  return row;
}
