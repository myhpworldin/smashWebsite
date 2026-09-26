import { z } from "zod";
import { type CollectionName, careers, caseStudies, clients, enquiries, homePage, insights, services, siteSettings, SINGLETON_ID, teamMembers, testimonials } from "@/server/db/schema";
import { getRowById, listAllRows, type Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { pageMeta, pageQuerySchema, parseQuery } from "@/server/api/query";
import type { WriteController } from "@/server/api/handler";
import type { AdminRole } from "@/server/api/admin-auth";
import { createService, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy, updateCaseStudy } from "@/server/modules/work/work.service";
import { createInsight, updateInsight } from "@/server/modules/insights/insights.service";
import { createTeamMember, updateTeamMember } from "@/server/modules/team/team.service";
import { createTestimonial, updateTestimonial } from "@/server/modules/testimonials/testimonials.service";
import { createClient, updateClient } from "@/server/modules/clients/clients.service";
import { createCareer, updateCareer } from "@/server/modules/careers/careers.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { getHomeSeoReadiness } from "@/server/seo/home-readiness";

/**
 * The admin content-management API (Stage 4, Phase 2). Every controller here
 * delegates to the exact same service functions the rest of the codebase
 * already uses (seed scripts, and previously only reachable in-process) — the
 * validation, slug handling, publish gates (`assertPublishable`), and
 * relationship checks (`assertExist`) all already existed; this file is only
 * the reachable-over-HTTP wiring, gated by `adminApi` (bearer token,
 * `admin-auth.ts`). No new content-management logic was written.
 */

const parseId = (id: string | undefined): string => {
  const result = z.uuid().safeParse(id);
  if (!result.success) throw AppError.badRequest("Malformed id.");
  return result.data;
};

type Row = Record<string, unknown>;

/**
 * The one place the "editor" role's restriction is enforced (Stage 5, Phase 1):
 * an editor may create and edit content freely, but only an administrator may
 * put a record into "published". `body` is still `unknown` here (the real
 * schema parse happens inside `create`/`update`) — this only ever reads one
 * field defensively, never trusts it for anything else. Editing an already-
 * published record without touching `status` is unaffected: the patch simply
 * doesn't carry the field, so the existing status is left alone.
 */
function assertMayPublish(role: AdminRole | undefined, body: unknown) {
  const status = (body as { status?: unknown } | null)?.status;
  if (status === "published" && role === "editor") {
    throw AppError.forbidden("Content Editors cannot publish content — an Administrator must publish.");
  }
}

/**
 * One factory for the five content types that share the same shape: a collection,
 * a `create(db, input)`, and an `update(db, id, patch)`. List/get admin
 * reads never existed before this phase (`listPublished*` and
 * `getPublished*BySlug` are public-only, status-filtered) — `listAllRows`/
 * `getRowById` (both already-generic `db/helpers.ts` functions) supply them
 * without a new per-module function.
 */
function adminCrud(table: CollectionName, label: string, create: (db: Db, input: unknown) => Promise<Row>, update: (db: Db, id: string, patch: unknown) => Promise<Row>) {
  const list: WriteController = async ({ db, url }) => {
    const query = parseQuery(pageQuerySchema, url);
    const { items, total } = await listAllRows(db, table, query);
    return { data: items, meta: pageMeta(total, query.page, query.limit) };
  };
  const get: WriteController = async ({ db, params }) => ({ data: await getRowById(db, table, parseId(params.id), label) });
  const createOne: WriteController = async ({ db, body, role }) => {
    assertMayPublish(role, body);
    return { data: await create(db, body) };
  };
  const updateOne: WriteController = async ({ db, params, body, role }) => {
    assertMayPublish(role, body);
    return { data: await update(db, parseId(params.id), body) };
  };
  return { list, get, create: createOne, update: updateOne };
}

export const servicesAdmin = adminCrud(services, "Service", createService, updateService);
export const caseStudiesAdmin = adminCrud(caseStudies, "CaseStudy", createCaseStudy, updateCaseStudy);
export const insightsAdmin = adminCrud(insights, "Insight", createInsight, updateInsight);
export const teamAdmin = adminCrud(teamMembers, "TeamMember", createTeamMember, updateTeamMember);
export const testimonialsAdmin = adminCrud(testimonials, "Testimonial", createTestimonial, updateTestimonial);
export const clientsAdmin = adminCrud(clients, "Client", createClient, updateClient);
export const careersAdmin = adminCrud(careers, "Career", createCareer, updateCareer);

/**
 * Singletons: no list, no separate create — `save*` upserts (already the
 * pattern `saveSiteSettings`/`saveHomePage` use elsewhere, e.g. `seed.ts`).
 * `assertMayPublish` is a no-op for Site Settings (it has no `status` field
 * at all — always "live"); Site Settings' actual editor restriction is
 * `requireRole: "administrator"` on its route (`admin/site-settings/route.ts`),
 * since there's no per-request publish/draft distinction to gate here.
 */
function adminSingleton(table: CollectionName, label: string, save: (db: Db, input: unknown) => Promise<Row>) {
  const get: WriteController = async ({ db }) => ({ data: await getRowById(db, table, SINGLETON_ID, label) });
  const saveOne: WriteController = async ({ db, body, role }) => {
    assertMayPublish(role, body);
    return { data: await save(db, body) };
  };
  return { get, save: saveOne };
}

/**
 * Read-only visibility for website enquiries (Stage 6, Phase 3). Not CRM: no
 * status, no assignment, no create/update/delete here — a visitor's
 * submission is an immutable record (`enquiries.ts` schema comment). Before
 * this, a submitted enquiry was persisted but literally unreadable through
 * the application — not even an administrator could see it, which made the
 * whole "website enquiry storage" system a write-only black hole. This is
 * the minimum needed for the enquiry system to be operationally usable at
 * all, without building any of the paused CRM's triage/pipeline/assignment
 * behavior — administrator-only (there is no publish/draft distinction for
 * an editor role to matter here, same reasoning as Site Settings above).
 */
function adminReadOnly(table: CollectionName, label: string) {
  const list: WriteController = async ({ db, url }) => {
    const query = parseQuery(pageQuerySchema, url);
    const { items, total } = await listAllRows(db, table, query);
    return { data: items, meta: pageMeta(total, query.page, query.limit) };
  };
  const get: WriteController = async ({ db, params }) => ({ data: await getRowById(db, table, parseId(params.id), label) });
  return { list, get };
}

export const enquiriesAdmin = adminReadOnly(enquiries, "Enquiry");

export const siteSettingsAdmin = adminSingleton(siteSettings, "SiteSettings", saveSiteSettings);
const homeSingleton = adminSingleton(homePage, "Home", saveHomePage);
/** Home is returned with what its SEO still lacks, so an editor can see it without trying to publish. */
const getHomeWithReadiness: WriteController = async (ctx) => {
  const { data } = await homeSingleton.get(ctx);
  return { data: { ...(data as object), seoReadiness: await getHomeSeoReadiness(ctx.db) } };
};
export const homeAdmin = { get: getHomeWithReadiness, save: homeSingleton.save };
