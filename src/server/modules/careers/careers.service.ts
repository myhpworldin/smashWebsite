import { careers } from "@/server/db/schema";
import { assertNoDuplicateIntent, findOneRow, findRows, getRowById, insertRow, isPublished, publishedAnd, publishFields, toPublic, updateRow, type Db } from "@/server/db/helpers";
import { assertPublishable } from "@/server/validation/publish";
import { assertNoCanonicalConflict } from "@/server/seo/validate";
import { AppError } from "@/server/lib/errors";
import { ROUTES } from "@/lib/routes";
import { recordPathChange } from "@/server/seo/redirects";
import { careerInputSchema, careerUpdateSchema } from "./careers.schema";

export const createCareer = async (db: Db, input: unknown) => {
  const data = careerInputSchema.parse(input);
  if (data.status === "published") {
    assertPublishable("career", data);
    await assertNoCanonicalConflict(db, ROUTES.CAREER(data.slug), data.seo);
  }
  await assertNoDuplicateIntent(db, careers, data.slug, "career");
  return insertRow(db, careers, { ...data, ...publishFields(data.status) }, "Career");
};

export async function updateCareer(db: Db, id: string, patch: unknown) {
  const data = careerUpdateSchema.parse(patch);
  const existing = await getRowById(db, careers, id, "Career");
  const merged = { ...existing, ...data };
  if (merged.status === "published") {
    assertPublishable("career", merged);
    await assertNoCanonicalConflict(db, ROUTES.CAREER(merged.slug), merged.seo);
  }
  const slugChanged = !!data.slug && data.slug !== existing.slug;
  if (slugChanged) await assertNoDuplicateIntent(db, careers, data.slug!, "career", id);
  const row = await updateRow(db, careers, id, { ...data, ...publishFields(data.status, existing.publishedAt) }, "Career");
  if (slugChanged && existing.publishedAt) await recordPathChange(db, ROUTES.CAREER(existing.slug), ROUTES.CAREER(data.slug!));
  return row;
}

export async function listPublishedCareers(db: Db) {
  const rows = await findRows(db, careers, isPublished(), { sort: { publishedAt: -1 } });
  return rows.map(toPublic);
}

/** `includeDrafts`: preview only (Stage 4, Phase 2 — `server/api/preview.ts`), never the public path. */
export async function getPublishedCareerBySlug(db: Db, slug: string, { includeDrafts = false }: { includeDrafts?: boolean } = {}) {
  const row = await findOneRow(db, careers, includeDrafts ? { slug } : publishedAnd({ slug }));
  if (!row) throw AppError.notFound("Career");
  return toPublic(row);
}
