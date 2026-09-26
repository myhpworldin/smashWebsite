import {
  SINGLETON_ID,
  caseStudies,
  homeCaseStudies,
  homeInsights,
  homePage,
  homeServices,
  homeTeam,
  homeTestimonials,
  insights,
  services,
  SPEC,
  teamMembers,
  testimonials,
} from "@/server/db/schema";
import { assertExist, assertMetricsVerified, col, findOneRow, mapDbError, omit, publishFields, replaceLinks, toPublic, toRow, type Db } from "@/server/db/helpers";
import { assertPublishable } from "@/server/validation/publish";
import { assertNoCanonicalConflict } from "@/server/seo/validate";
import { AppError } from "@/server/lib/errors";
import { ROUTES } from "@/lib/routes";
import { homeInputSchema } from "./home.schema";
import { getPublishedServiceSummariesForHome } from "@/server/modules/services/services.service";
import { getPublishedCaseStudySummariesForHome } from "@/server/modules/work/work.service";
import { getPublishedInsightSummariesForHome } from "@/server/modules/insights/insights.service";
import { getPublishedTeamForHome } from "@/server/modules/team/team.service";
import { getPublishedTestimonialsForHome } from "@/server/modules/testimonials/testimonials.service";

const REFS = [
  ["serviceIds", homeServices, services],
  ["caseStudyIds", homeCaseStudies, caseStudies],
  ["testimonialIds", homeTestimonials, testimonials],
  ["insightIds", homeInsights, insights],
  ["teamIds", homeTeam, teamMembers],
] as const;

/** Create or update the singleton Home page. Omitted fields are left untouched. */
export async function saveHomePage(db: Db, input: unknown) {
  const data = homeInputSchema.parse(input);
  const existing = await findOneRow(db, homePage, { _id: SINGLETON_ID as never });
  const nextStatus = data.status ?? existing?.status ?? "draft";
  if (nextStatus === "published") {
    assertPublishable("home", { hero: data.hero ?? existing?.hero, seo: data.seo ?? existing?.seo });
    assertMetricsVerified(data.businessProof?.items ?? existing?.businessProof?.items ?? [], "businessProof");
    assertMetricsVerified(data.results?.items ?? existing?.results?.items ?? [], "results");
    await assertNoCanonicalConflict(db, ROUTES.HOME, data.seo ?? existing?.seo);
  }
  for (const [key, , target] of REFS) await assertExist(db, target, data[key] ?? [], key);

  const sections = omit(data, "serviceIds", "caseStudyIds", "testimonialIds", "insightIds", "teamIds");
  const values = Object.fromEntries(Object.entries({ ...sections, ...publishFields(data.status, existing?.publishedAt) }).filter(([, v]) => v !== undefined));

  let row;
  try {
    // Upsert: column defaults (draft status, timestamps) apply only when the document is first created.
    const { createdAt, status } = SPEC.home_page.defaults() as { createdAt: Date; status: string };
    const doc = await col(db, homePage).findOneAndUpdate(
      { _id: SINGLETON_ID as never },
      { $set: { ...values, updatedAt: new Date() }, $setOnInsert: { createdAt, ...("status" in values ? {} : { status }) } },
      { upsert: true, returnDocument: "after" },
    );
    row = toRow(homePage, doc!);
  } catch (err) {
    return mapDbError(err, "Home page");
  }
  for (const [key, link] of REFS) {
    const ids = data[key];
    if (!ids) continue;
    await replaceLinks(db, link, "homeId", SINGLETON_ID, ids.map((refId, position) => ({ homeId: SINGLETON_ID, refId, position })));
  }
  return row;
}

/**
 * Public Home payload: only when the page is published. Referenced records
 * arrive as card-level summaries, in the editor's order, and only if they are
 * themselves published (drafts are silently skipped). Six queries in total
 * (the page document plus one ordered join per reference list), however many items are referenced.
 */
export async function getPublishedHome(db: Db) {
  const row = await findOneRow(db, homePage, { _id: SINGLETON_ID as never });
  if (!row || row.status !== "published") throw AppError.notFound("Home page");

  const [services, caseStudies, testimonials, insights, team] = await Promise.all([
    getPublishedServiceSummariesForHome(db, SINGLETON_ID),
    getPublishedCaseStudySummariesForHome(db, SINGLETON_ID),
    getPublishedTestimonialsForHome(db, SINGLETON_ID),
    getPublishedInsightSummariesForHome(db, SINGLETON_ID),
    getPublishedTeamForHome(db, SINGLETON_ID),
  ]);
  return { ...omit(toPublic(row), "id"), services, caseStudies, testimonials, insights, team };
}
