import type { Document } from "mongodb";
import { caseStudies, clients, homeCaseStudies, insightCaseStudies, insights, serviceCaseStudies, services, testimonials } from "@/server/db/schema";
import {
  assertExist,
  assertMetricsVerified,
  assertNoDuplicateIntent,
  col,
  countWhere,
  DEFAULT_PAGE,
  findOneRow,
  findPicked,
  getRowById,
  homeRefStages,
  insertRow,
  isPublished,
  offsetOf,
  omit,
  publishedAnd,
  publishFields,
  replaceLinks,
  toPublic,
  updateRow,
  type Db,
  type PageParams,
} from "@/server/db/helpers";
import { assertPublishable } from "@/server/validation/publish";
import { assertNoCanonicalConflict } from "@/server/seo/validate";
import { AppError } from "@/server/lib/errors";
import { ROUTES } from "@/lib/routes";
import { recordPathChange } from "@/server/seo/redirects";
import { caseStudyInputSchema, caseStudyUpdateSchema } from "./work.schema";
import type { Metric } from "@/server/validation/common";

const serviceLinks = (caseStudyId: string, ids: string[]) => ids.map((serviceId) => ({ serviceId, caseStudyId }));

export async function createCaseStudy(db: Db, input: unknown) {
  const { relatedServiceIds, ...data } = caseStudyInputSchema.parse(input);
  if (data.status === "published") {
    assertPublishable("caseStudy", data);
    assertMetricsVerified(data.results ?? [], "results");
    await assertNoCanonicalConflict(db, ROUTES.CASE_STUDY(data.slug), data.seo);
  }
  await assertExist(db, clients, [data.clientId], "clientId");
  await assertExist(db, testimonials, [data.testimonialId], "testimonialId");
  await assertExist(db, services, relatedServiceIds ?? [], "relatedServiceIds");
  await assertNoDuplicateIntent(db, caseStudies, data.slug, "case study");
  const row = await insertRow(db, caseStudies, { ...data, ...publishFields(data.status) }, "Case study");
  if (relatedServiceIds?.length) await replaceLinks(db, serviceCaseStudies, "caseStudyId", row.id, serviceLinks(row.id, relatedServiceIds));
  return row;
}

export async function updateCaseStudy(db: Db, id: string, patch: unknown) {
  const { relatedServiceIds, ...data } = caseStudyUpdateSchema.parse(patch);
  const existing = await getRowById(db, caseStudies, id, "Case study");
  const merged = { ...existing, ...data };
  if (merged.status === "published") {
    assertPublishable("caseStudy", merged);
    assertMetricsVerified(data.results ?? existing.results, "results");
    await assertNoCanonicalConflict(db, ROUTES.CASE_STUDY(merged.slug), merged.seo);
  }
  await assertExist(db, clients, [data.clientId], "clientId");
  await assertExist(db, testimonials, [data.testimonialId], "testimonialId");
  await assertExist(db, services, relatedServiceIds ?? [], "relatedServiceIds");
  const slugChanged = !!data.slug && data.slug !== existing.slug;
  if (slugChanged) await assertNoDuplicateIntent(db, caseStudies, data.slug!, "case study", id);
  const row = await updateRow(db, caseStudies, id, { ...data, ...publishFields(data.status, existing.publishedAt) }, "Case study");
  if (slugChanged && existing.publishedAt) await recordPathChange(db, ROUTES.CASE_STUDY(existing.slug), ROUTES.CASE_STUDY(data.slug!));
  if (relatedServiceIds) await replaceLinks(db, serviceCaseStudies, "caseStudyId", id, serviceLinks(id, relatedServiceIds));
  return row;
}

/** Card-level projection; the client is joined only when it is itself published. */
const summaryStages = (): Document[] => [
  { $lookup: { from: clients, localField: "clientId", foreignField: "_id", pipeline: [{ $match: isPublished() }, { $project: { name: 1, logo: 1 } }], as: "client" } },
  {
    $project: {
      title: 1,
      slug: 1,
      summary: 1,
      industry: 1,
      heroImage: 1,
      publishedAt: 1,
      /** First (headline) result only; every result of a published case study is verified. */
      keyResult: { $arrayElemAt: ["$results", 0] },
      client: { $arrayElemAt: ["$client", 0] },
    },
  },
];

const caseStudySummary = (doc: Document) => ({
  id: doc._id as string,
  title: doc.title as string,
  slug: doc.slug as string,
  summary: doc.summary as string,
  industry: (doc.industry ?? null) as string | null,
  heroImage: doc.heroImage ?? null,
  publishedAt: doc.publishedAt as Date,
  keyResult: (doc.keyResult ?? null) as Metric | null,
  clientName: (doc.client?.name ?? null) as string | null,
  clientLogo: doc.client?.logo ?? null,
});

export async function listPublishedCaseStudies(db: Db, page: PageParams = DEFAULT_PAGE) {
  const where = isPublished();
  const [docs, total] = await Promise.all([
    col(db, caseStudies)
      .aggregate([{ $match: where }, { $sort: { publishedAt: -1, slug: 1 } }, { $skip: offsetOf(page) }, { $limit: page.limit }, ...summaryStages()])
      .toArray(),
    countWhere(db, caseStudies, where),
  ]);
  return { items: docs.map(caseStudySummary), total };
}

/** The case studies a Home page references, in the editor's order, published ones only. One query. */
export async function getPublishedCaseStudySummariesForHome(db: Db, homeId: string) {
  const docs = await col(db, homeCaseStudies).aggregate([...homeRefStages(caseStudies, homeId), ...summaryStages()]).toArray();
  return docs.map(caseStudySummary);
}

/** `includeDrafts`: preview only (Stage 4, Phase 2 — `server/api/preview.ts`), never the public path. */
export async function getPublishedCaseStudyBySlug(db: Db, slug: string, { includeDrafts = false }: { includeDrafts?: boolean } = {}) {
  const row = await findOneRow(db, caseStudies, includeDrafts ? { slug } : publishedAnd({ slug }));
  if (!row) throw AppError.notFound("Case study");

  const serviceIds = (await col(db, serviceCaseStudies).find({ caseStudyId: row.id }).toArray()).map((l) => l.serviceId as string);
  const relatedServices = serviceIds.length
    ? await findPicked(db, services, publishedAnd({ _id: { $in: serviceIds } as never }), ["name", "slug", "shortDescription"] as const)
    : [];
  // Client and testimonial are only exposed when themselves published.
  const client = row.clientId ? await findOneRow(db, clients, publishedAnd({ _id: row.clientId as never })) : null;
  const testimonial = row.testimonialId ? await findOneRow(db, testimonials, publishedAnd({ _id: row.testimonialId as never })) : null;

  const insightIds = (await col(db, insightCaseStudies).find({ caseStudyId: row.id }).toArray()).map((l) => l.insightId as string);
  const relatedInsights = insightIds.length
    ? await findPicked(db, insights, publishedAnd({ _id: { $in: insightIds } as never }), ["title", "slug", "excerpt"] as const, { sort: { publishedAt: -1 } })
    : [];

  return { ...omit(toPublic(row), "clientId", "testimonialId"), client: client ? toPublic(client) : null, testimonial: testimonial ? toPublic(testimonial) : null, relatedServices, relatedInsights };
}
