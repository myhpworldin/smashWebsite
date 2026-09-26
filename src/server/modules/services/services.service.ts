import { caseStudies, homeServices, insightServices, insights, serviceCaseStudies, services } from "@/server/db/schema";
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
  isPublished,
  offsetOf,
  pick,
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
import type { Document } from "mongodb";
import { recordPathChange } from "@/server/seo/redirects";
import { serviceInputSchema, serviceUpdateSchema } from "./services.schema";

const links = (serviceId: string, ids: string[]) => ids.map((caseStudyId) => ({ serviceId, caseStudyId }));

export async function createService(db: Db, input: unknown) {
  const { relatedCaseStudyIds, ...data } = serviceInputSchema.parse(input);
  await assertExist(db, caseStudies, relatedCaseStudyIds ?? [], "relatedCaseStudyIds");
  if (data.status === "published") {
    assertPublishable("service", data);
    await assertNoCanonicalConflict(db, ROUTES.SERVICE(data.slug), data.seo);
  }
  await assertNoDuplicateIntent(db, services, data.slug, "service");
  const row = await insertRow(db, services, { ...data, ...publishFields(data.status) }, "Service");
  if (relatedCaseStudyIds?.length) await replaceLinks(db, serviceCaseStudies, "serviceId", row.id, links(row.id, relatedCaseStudyIds));
  return row;
}

export async function updateService(db: Db, id: string, patch: unknown) {
  const { relatedCaseStudyIds, ...data } = serviceUpdateSchema.parse(patch);
  const existing = await getRowById(db, services, id, "Service");
  const merged = { ...existing, ...data };
  if (merged.status === "published") {
    assertPublishable("service", merged);
    await assertNoCanonicalConflict(db, ROUTES.SERVICE(merged.slug), merged.seo);
  }
  await assertExist(db, caseStudies, relatedCaseStudyIds ?? [], "relatedCaseStudyIds");
  const slugChanged = !!data.slug && data.slug !== existing.slug;
  if (slugChanged) await assertNoDuplicateIntent(db, services, data.slug!, "service", id);
  const row = await updateRow(db, services, id, { ...data, ...publishFields(data.status, existing.publishedAt) }, "Service");
  if (slugChanged && existing.publishedAt) await recordPathChange(db, ROUTES.SERVICE(existing.slug), ROUTES.SERVICE(data.slug!));
  if (relatedCaseStudyIds) await replaceLinks(db, serviceCaseStudies, "serviceId", id, links(id, relatedCaseStudyIds));
  return row;
}

/** Card-level projection: no long-form fields are read from the database. */
const serviceSummary = (doc: Document) => {
  const { id, name, slug, shortDescription } = pick(doc, ["name", "slug", "shortDescription"] as const);
  return { id, name, slug, shortDescription, image: doc.hero?.media ?? null };
};
const SUMMARY_FIELDS = { name: 1, slug: 1, shortDescription: 1, "hero.media": 1 };

export async function listPublishedServices(db: Db, page: PageParams = DEFAULT_PAGE) {
  const where = isPublished();
  const [docs, total] = await Promise.all([
    col(db, services).find(where, { projection: SUMMARY_FIELDS }).sort({ displayOrder: 1, name: 1, slug: 1 }).skip(offsetOf(page)).limit(page.limit).toArray(),
    countWhere(db, services, where),
  ]);
  return { items: docs.map(serviceSummary), total };
}

/** The Services page: every published service in display order with the offerings (deliverables) its cards show. */
export async function listPublishedServiceCatalogue(db: Db) {
  const docs = await col(db, services).find(isPublished(), { projection: { name: 1, slug: 1, "hero.label": 1, deliverables: 1 } }).sort({ displayOrder: 1, name: 1, slug: 1 }).toArray();
  return docs.map((doc) => ({
    name: doc.name as string,
    slug: doc.slug as string,
    eyebrow: (doc.hero?.label as string | undefined) ?? null,
    cards: ((doc.deliverables ?? []) as { title: string; shortTitle?: string; description?: string; icon?: { url: string } }[]).map((d) => ({
      title: d.shortTitle ?? d.title,
      description: d.description ?? null,
      iconUrl: d.icon?.url ?? null,
    })),
  }));
}

/** The services a Home page references, in the editor's order, published ones only. One query. */
export async function getPublishedServiceSummariesForHome(db: Db, homeId: string) {
  const docs = await col(db, homeServices).aggregate([...homeRefStages(services, homeId), { $project: { ...SUMMARY_FIELDS, "deliverables.title": 1 } }]).toArray();
  // `highlights`: the service's deliverable titles, the short list a Home card shows under the name.
  return docs.map((doc) => ({ ...serviceSummary(doc), highlights: ((doc.deliverables ?? []) as { title: string }[]).map((d) => d.title) }));
}

/** `includeDrafts`: preview only (Stage 4, Phase 2 — `server/api/preview.ts`), never the public path. */
export async function getPublishedServiceBySlug(db: Db, slug: string, { includeDrafts = false }: { includeDrafts?: boolean } = {}) {
  const row = await findOneRow(db, services, includeDrafts ? { slug } : publishedAnd({ slug }));
  if (!row) throw AppError.notFound("Service");
  const caseIds = (await col(db, serviceCaseStudies).find({ serviceId: row.id }).toArray()).map((l) => l.caseStudyId as string);
  const related = caseIds.length ? await findPicked(db, caseStudies, publishedAnd({ _id: { $in: caseIds } as never }), ["title", "slug", "summary", "heroImage"] as const) : [];
  const insightIds = (await col(db, insightServices).find({ serviceId: row.id }).toArray()).map((l) => l.insightId as string);
  const relatedInsights = insightIds.length
    ? await findPicked(db, insights, publishedAnd({ _id: { $in: insightIds } as never }), ["title", "slug", "excerpt"] as const, { sort: { publishedAt: -1 } })
    : [];
  return { ...toPublic(row), relatedCaseStudies: related, relatedInsights };
}
