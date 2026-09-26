import type { Document } from "mongodb";
import { caseStudies, homeInsights, insightCaseStudies, insightServices, insights, services, teamMembers } from "@/server/db/schema";
import {
  assertExist,
  assertNoDuplicateIntent,
  col,
  countWhere,
  DEFAULT_PAGE,
  findOneRow,
  findPicked,
  getRowById,
  homeRefStages,
  insertRow,
  offsetOf,
  omit,
  publishedAnd,
  publishFields,
  replaceLinks,
  toPublic,
  updateRow,
  isPublished,
  type Db,
  type PageParams,
  type Tx,
} from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { assertNoCanonicalConflict } from "@/server/seo/validate";
import { ROUTES } from "@/lib/routes";
import { recordPathChange } from "@/server/seo/redirects";
import { insightInputSchema, insightUpdateSchema } from "./insights.schema";

type Relations = { relatedServiceIds?: string[]; relatedCaseStudyIds?: string[] };

async function checkRefs(db: Db, data: Relations & { authorId?: string | null }) {
  await assertExist(db, teamMembers, [data.authorId], "authorId");
  await assertExist(db, services, data.relatedServiceIds ?? [], "relatedServiceIds");
  await assertExist(db, caseStudies, data.relatedCaseStudyIds ?? [], "relatedCaseStudyIds");
}

async function saveLinks(tx: Tx, insightId: string, rel: Relations) {
  if (rel.relatedServiceIds) {
    await replaceLinks(tx, insightServices, "insightId", insightId, rel.relatedServiceIds.map((serviceId) => ({ insightId, serviceId })));
  }
  if (rel.relatedCaseStudyIds) {
    await replaceLinks(tx, insightCaseStudies, "insightId", insightId, rel.relatedCaseStudyIds.map((caseStudyId) => ({ insightId, caseStudyId })));
  }
}

export async function createInsight(db: Db, input: unknown) {
  const { relatedServiceIds, relatedCaseStudyIds, ...data } = insightInputSchema.parse(input);
  await checkRefs(db, { ...data, relatedServiceIds, relatedCaseStudyIds });
  await assertNoDuplicateIntent(db, insights, data.slug, "insight");
  if (data.status === "published") await assertNoCanonicalConflict(db, ROUTES.INSIGHT(data.slug), data.seo);
  const row = await insertRow(db, insights, { ...data, ...publishFields(data.status) }, "Insight");
  await saveLinks(db, row.id, { relatedServiceIds, relatedCaseStudyIds });
  return row;
}

export async function updateInsight(db: Db, id: string, patch: unknown) {
  const { relatedServiceIds, relatedCaseStudyIds, ...data } = insightUpdateSchema.parse(patch);
  const existing = await getRowById(db, insights, id, "Insight");
  await checkRefs(db, { ...data, relatedServiceIds, relatedCaseStudyIds });
  const slugChanged = !!data.slug && data.slug !== existing.slug;
  if (slugChanged) await assertNoDuplicateIntent(db, insights, data.slug!, "insight", id);
  const merged = { ...existing, ...data };
  if (merged.status === "published") await assertNoCanonicalConflict(db, ROUTES.INSIGHT(merged.slug), merged.seo);
  const row = await updateRow(db, insights, id, { ...data, ...publishFields(data.status, existing.publishedAt) }, "Insight");
  if (slugChanged && existing.publishedAt) await recordPathChange(db, ROUTES.INSIGHT(existing.slug), ROUTES.INSIGHT(data.slug!));
  await saveLinks(db, id, { relatedServiceIds, relatedCaseStudyIds });
  return row;
}

/** Card-level projection: the article body is never read; the author is joined only when published. */
const summaryStages = (): Document[] => [
  { $lookup: { from: teamMembers, localField: "authorId", foreignField: "_id", pipeline: [{ $match: isPublished() }, { $project: { name: 1, role: 1 } }], as: "author" } },
  { $project: { title: 1, slug: 1, excerpt: 1, featuredImage: 1, category: 1, tags: 1, publishedAt: 1, updatedAt: 1, author: { $arrayElemAt: ["$author", 0] } } },
];

const insightSummary = (doc: Document) => ({
  id: doc._id as string,
  title: doc.title as string,
  slug: doc.slug as string,
  excerpt: doc.excerpt as string,
  featuredImage: doc.featuredImage ?? null,
  category: (doc.category ?? null) as string | null,
  tags: (doc.tags ?? []) as string[],
  publishedAt: doc.publishedAt as Date,
  updatedAt: doc.updatedAt as Date,
  authorName: (doc.author?.name ?? null) as string | null,
  authorRole: (doc.author?.role ?? null) as string | null,
});

export async function listPublishedInsights(db: Db, opts: Partial<PageParams> & { category?: string } = {}) {
  const page = { ...DEFAULT_PAGE, ...opts };
  const where = publishedAnd(opts.category ? { category: opts.category } : undefined);
  const [docs, total] = await Promise.all([
    col(db, insights)
      .aggregate([{ $match: where }, { $sort: { publishedAt: -1, slug: 1 } }, { $skip: offsetOf(page) }, { $limit: page.limit }, ...summaryStages()])
      .toArray(),
    countWhere(db, insights, where),
  ]);
  return { items: docs.map(insightSummary), total };
}

/** The insights a Home page references, in the editor's order, published ones only. One query. */
export async function getPublishedInsightSummariesForHome(db: Db, homeId: string) {
  const docs = await col(db, homeInsights).aggregate([...homeRefStages(insights, homeId), ...summaryStages()]).toArray();
  return docs.map(insightSummary);
}

/** `includeDrafts`: preview only (Stage 4, Phase 2 — `server/api/preview.ts`), never the public path. */
export async function getPublishedInsightBySlug(db: Db, slug: string, { includeDrafts = false }: { includeDrafts?: boolean } = {}) {
  const row = await findOneRow(db, insights, includeDrafts ? { slug } : publishedAnd({ slug }));
  if (!row) throw AppError.notFound("Insight");

  const [author] = row.authorId ? await findPicked(db, teamMembers, publishedAnd({ _id: row.authorId as never }), ["name", "role", "photo"] as const) : [];
  const serviceIds = (await col(db, insightServices).find({ insightId: row.id }).toArray()).map((r) => r.serviceId as string);
  const caseIds = (await col(db, insightCaseStudies).find({ insightId: row.id }).toArray()).map((r) => r.caseStudyId as string);

  const relatedServices = serviceIds.length ? await findPicked(db, services, publishedAnd({ _id: { $in: serviceIds } as never }), ["name", "slug"] as const) : [];
  const relatedCaseStudies = caseIds.length ? await findPicked(db, caseStudies, publishedAnd({ _id: { $in: caseIds } as never }), ["title", "slug"] as const) : [];

  return { ...omit(toPublic(row), "authorId"), author: author ?? null, relatedServices, relatedCaseStudies };
}
