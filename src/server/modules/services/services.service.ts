import { caseStudies, homeServices, insightServices, insights, serviceCaseStudies, services } from "@/server/db/schema";
import {
  assertExist,
  assertNoDuplicateIntent,
  col,
  countWhere,
  DEFAULT_PAGE,
  findOneRow,
  findPicked,
  findRows,
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
import { serviceInputSchema, serviceUpdateSchema, type ServiceDeliverable } from "./services.schema";

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
    cards: ((doc.deliverables ?? []) as ServiceDeliverable[]).map((d) => ({
      title: d.shortTitle ?? d.title,
      description: d.description ?? null,
      iconUrl: d.icon?.url ?? null,
      // Stage 1, Phase 1: a card links to its own page once its deliverable has one (`offering.slug`); otherwise it
      // still links to the category page as before — existing deliverables with no offering are unaffected.
      offeringSlug: d.offering?.slug ?? null,
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

/**
 * Stage 1, Phase 1 — an individual deliverable's own detail page. A deliverable is only found this way once it has
 * both a `slug` on its `offering` (the deliverable's own individual-page content) and its parent category is
 * published; the category being published does not by itself make an unslugged deliverable routable, and an
 * unpublished category makes every one of its deliverables unreachable, matching how the category page itself
 * already behaves.
 *
 * `relatedServices` are resolved from `offering.relatedServiceSlugs` against every published category's
 * deliverables, not just this offering's own category (Stage 1, Phase 4 fix — Technology's brief called for
 * cross-category relationships like Landing Pages → Meta Ads/Google Ads, which the original same-category-only
 * lookup could never resolve; Phases 2–3 never exercised this because their relationships happened to stay within
 * one category each). A slug that resolves in more than one category is treated as a data ambiguity, not
 * disambiguated silently: the first match wins, deterministically, by category `displayOrder`.
 */
export async function getPublishedServiceOffering(db: Db, categorySlug: string, offeringSlug: string) {
  const category = await findOneRow(db, services, publishedAnd({ slug: categorySlug }));
  if (!category) throw AppError.notFound("Service");
  const deliverables = (category.deliverables ?? []) as ServiceDeliverable[];
  const deliverable = deliverables.find((d) => d.offering?.slug === offeringSlug);
  if (!deliverable?.offering) throw AppError.notFound("Service");
  const offering = deliverable.offering;

  const caseIds = offering.relatedCaseStudyIds ?? [];
  const relatedCaseStudies = caseIds.length
    ? await findPicked(db, caseStudies, publishedAnd({ _id: { $in: caseIds } as never }), ["title", "slug", "summary", "heroImage"] as const)
    : [];

  const wantedSlugs = new Set(offering.relatedServiceSlugs ?? []);
  const relatedServices: { title: string; slug: string; categorySlug: string }[] = [];
  if (wantedSlugs.size) {
    const allCategories = (await findRows(db, services, isPublished(), { sort: { displayOrder: 1 } })) as (typeof category)[];
    const seen = new Set<string>();
    for (const cat of allCategories) {
      for (const d of (cat.deliverables ?? []) as ServiceDeliverable[]) {
        const slug = d.offering?.slug;
        if (!slug || slug === offeringSlug || seen.has(slug) || !wantedSlugs.has(slug)) continue;
        seen.add(slug);
        relatedServices.push({ title: d.shortTitle ?? d.title, slug, categorySlug: cat.slug });
      }
    }
  }

  return {
    category: { name: category.name, slug: category.slug },
    title: deliverable.shortTitle ?? deliverable.title,
    slug: offering.slug!,
    headline: offering.headline ?? deliverable.title,
    shortDescription: deliverable.description ?? null,
    icon: deliverable.icon ?? null,
    offering,
    relatedServices,
    relatedCaseStudies,
    updatedAt: category.updatedAt,
  };
}
