/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies */
/**
 * Stage 1 sign-off verification. Each block checks a stated requirement against
 * actual behaviour (real MongoDB collections, validators and indexes, real route handlers), not
 * against the implementation's own helpers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.APP_ENV = "production";
process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb, HOME_SEO } from "./test-db";
import type { Db } from "@/server/db/helpers";
import { resetRateLimits } from "@/server/api/rate-limit";
import { LIVE_STATIC_ROUTES } from "@/lib/routes";
import { GET as home } from "@/app/api/home/route";
import { GET as services } from "@/app/api/services/route";
import { GET as service } from "@/app/api/services/[slug]/route";
import { GET as work } from "@/app/api/work/route";
import { GET as workItem } from "@/app/api/work/[slug]/route";
import { GET as insights } from "@/app/api/insights/route";
import { GET as insight } from "@/app/api/insights/[slug]/route";
import { GET as testimonials } from "@/app/api/testimonials/route";
import { GET as clients } from "@/app/api/clients/route";
import { GET as siteSettings } from "@/app/api/site-settings/route";
import { createService, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { services as servicesTable } from "@/server/db/schema";
import { col, insertRow } from "@/server/db/helpers";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createTestimonial, listPublishedTestimonials, updateTestimonial } from "@/server/modules/testimonials/testimonials.service";
import { createClient } from "@/server/modules/clients/clients.service";
import { createTeamMember, listPublishedTeam } from "@/server/modules/team/team.service";
import { createCareer, getPublishedCareerBySlug, listPublishedCareers, updateCareer } from "@/server/modules/careers/careers.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { envSchema } from "@/server/config/env";
import { slugStyleWarnings, slugProblem } from "@/server/seo/slug";
import { auditSitemap } from "@/server/seo/sitemap";
import { validateSeo } from "@/server/seo/validate";
import { GET as health } from "@/app/api/health/route";
import { auditInternalLinks } from "@/server/seo/links-audit";

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  resetRateLimits();
});
afterEach(() => vi.restoreAllMocks());

type Handler = (r: Request, c?: any) => Promise<Response>;
const call = async (h: Handler, path: string, slug?: string, headers: Record<string, string> = {}) => {
  const res = await h(new Request(`http://localhost${path}`, { headers }), { params: Promise.resolve(slug === undefined ? {} : { slug }) });
  return { status: res.status, cache: res.headers.get("cache-control"), body: (await res.json()) as any };
};
const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "b", ...extra });
/** The write must be refused by the database itself with this MongoDB error code (11000 duplicate key, 121 collection validator). */
const rejectsWith = async (write: Promise<unknown>, code: number, label = "") => {
  const err = await write.then(() => null, (e: any) => e);
  expect(err, label).not.toBeNull();
  expect(err.code, label).toBe(code);
};

/* ───────────────────────── DATABASE ───────────────────────── */

describe("database: schema catalog", () => {
  it("has exactly the reviewed set of collections (any new collection must be reviewed here)", async () => {
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
    // "enquiries" (Stage 3, Phase 7) is the one addition since Stage 1 — the public contact form's write model.
    expect(names).toEqual(["careers", "case_studies", "clients", "enquiries", "home_case_studies", "home_insights", "home_page", "home_services", "home_team", "home_testimonials", "insight_case_studies", "insight_services", "insights", "redirects", "service_case_studies", "services", "site_settings", "team_members", "testimonials"]);
  });

  it("has unique slug indexes and query indexes on every public collection", async () => {
    const idx = async (c: string) => (await col(db, c).indexes()).map((i) => i.name);
    const expected: Record<string, string[]> = {
      services: ["services_slug_uidx", "services_status_order_idx"], case_studies: ["case_studies_slug_uidx", "case_studies_status_published_idx"],
      insights: ["insights_slug_uidx", "insights_status_published_idx", "insights_category_idx"], careers: ["careers_slug_uidx", "careers_status_published_idx"],
      redirects: ["redirects_from_path_uidx"], clients: ["clients_status_order_idx"], team_members: ["team_members_status_order_idx"], testimonials: ["testimonials_status_order_idx"],
    };
    for (const [c, names] of Object.entries(expected)) for (const n of names) expect(await idx(c), c).toContain(n);
  });

  it("enforces content rules in the database itself, even for direct writes", async () => {
    const docs: Record<string, (slug: string) => Record<string, unknown>> = {
      services: (slug) => ({ name: "t", slug, shortDescription: "s" }),
      case_studies: (slug) => ({ title: "t", slug, summary: "s" }),
      insights: (slug) => ({ title: "t", slug, excerpt: "e", content: "c" }),
      careers: (slug) => ({ title: "t", slug, summary: "s" }),
    };
    for (const [c, make] of Object.entries(docs)) {
      await rejectsWith(col(db, c).insertOne({ ...make("Bad Slug") }), 121, `${c}: slug format`);
      await col(db, c).insertOne({ ...make("ok-slug") });
      await rejectsWith(col(db, c).insertOne({ ...make("ok-slug") }), 11000, `${c}: duplicate slug`);
      await rejectsWith(col(db, c).insertOne({ ...make("needs-date"), status: "published" }), 121, `${c}: published requires publishedAt`);
    }
    await rejectsWith(col(db, "site_settings").insertOne({ _id: "second" as never, siteName: "x" }), 121, "site_settings singleton");
    await rejectsWith(col(db, "home_page").insertOne({ _id: "second" as never }), 121, "home_page singleton");
    await rejectsWith(col(db, "redirects").insertOne({ fromPath: "/a", toPath: "/a", statusCode: 301 }), 121, "redirect to itself");
    await rejectsWith(col(db, "redirects").insertOne({ fromPath: "/a", toPath: "/b", statusCode: 302 }), 121, "redirect status");
  });

  it("keeps every read correct after records are deleted behind the application's back (there are no foreign keys)", async () => {
    const s = await createService(db, svc("parent-service", { status: "published" }));
    const c = await createClient(db, { name: "Client", status: "published" });
    const t = await createTestimonial(db, { quote: "q", personName: "P", clientId: c.id, status: "published" });
    const a = await createTeamMember(db, { name: "A", role: "r", status: "published" });
    const cs = await createCaseStudy(db, { title: "C", slug: "child-case", summary: "s", challenge: "c", status: "published", clientId: c.id, testimonialId: t.id, relatedServiceIds: [s.id] });
    const i = await createInsight(db, { title: "I", slug: "child-post", excerpt: "e", content: "c", status: "published", authorId: a.id, relatedServiceIds: [s.id], relatedCaseStudyIds: [cs.id] });
    await saveHomePage(db, { hero: { heading: "H" }, status: "published", seo: HOME_SEO, serviceIds: [s.id], caseStudyIds: [cs.id], testimonialIds: [t.id], insightIds: [i.id] });

    for (const [collection, id] of [["services", s.id], ["clients", c.id], ["team_members", a.id], ["testimonials", t.id], ["case_studies", cs.id], ["insights", i.id]] as const) {
      await col(db, collection).deleteOne({ _id: id as never });
    }
    const body = (await home(new Request("http://localhost/api/home"), { params: Promise.resolve({}) })) ;
    expect(body.status).toBe(200); // Home survives; its lists are simply empty
    const data = (await body.json()).data;
    expect([data.services, data.selectedWork, data.testimonials, data.insights].map((x: any) => x?.items?.length ?? 0)).toEqual([0, 0, 0, 0]);
  });

  it("keeps public reads safe when a relationship is broken behind the application's back", async () => {
    const c = await createClient(db, { name: "Gone Soon", status: "published" });
    await createCaseStudy(db, { title: "C", slug: "orphaned", summary: "s", challenge: "c", status: "published", clientId: c.id });
    await col(db, "clients").deleteOne({ _id: c.id as never });
    const { status, body } = await call(workItem, "/api/work/orphaned", "orphaned");
    expect(status).toBe(200);
    expect(body.data.client).toBeNull();
  });

  it("stamps timestamps and keeps createdAt stable", async () => {
    const s = await createService(db, svc("stamped"));
    await new Promise((r) => setTimeout(r, 15));
    const u = await updateService(db, s.id, { name: "Renamed" });
    expect(u.createdAt).toEqual(s.createdAt);
    expect(u.updatedAt.getTime()).toBeGreaterThan(s.updatedAt.getTime());
  });
});

/* ───────────────────────── API MATRIX ───────────────────────── */

describe("API: collection endpoints", () => {
  const collections: [string, Handler, boolean][] = [["services", services, true], ["work", work, true], ["insights", insights, true], ["testimonials", testimonials, false], ["clients", clients, false]];

  it.each(collections)("%s: empty dataset is a valid empty 200", async (name, h) => {
    const { status, body, cache } = await call(h, `/api/${name}`);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, data: [] });
    expect(cache).toContain("s-maxage");
  });

  it.each(collections.filter((c) => c[2]))("%s: pagination, bounds and invalid queries", async (name, h) => {
    const seed = { services: (n: number) => createService(db, svc(`item-${"abcdefgh"[n]}`, { status: "published" })), work: (n: number) => createCaseStudy(db, { title: `C${n}`, slug: `item-${"abcdefgh"[n]}`, summary: "s", challenge: "c", status: "published" }), insights: (n: number) => createInsight(db, { title: `I${n}`, slug: `item-${"abcdefgh"[n]}`, excerpt: "e", content: "c", status: "published" }) }[name as "services"];
    for (let n = 0; n < 5; n++) await seed(n);
    const p1 = await call(h, `/api/${name}?limit=2`);
    expect(p1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    const all = new Set<string>();
    for (const p of [1, 2, 3]) (await call(h, `/api/${name}?limit=2&page=${p}`)).body.data.forEach((x: any) => all.add(x.slug));
    expect(all.size).toBe(5);
    expect((await call(h, `/api/${name}?limit=2&page=99`)).body).toMatchObject({ data: [], meta: { page: 99, total: 5 } }); // past the end: empty, not an error
    for (const q of ["page=0", "page=-1", "page=abc", "limit=0", "limit=51", "limit=1.5", "page=1&page=2"]) {
      const r = await call(h, `/api/${name}?${q}`);
      expect([r.status, r.body.error.code], q).toEqual([422, "VALIDATION_ERROR"]);
    }
    expect((await call(h, `/api/${name}?limit=50&sort=created&status=draft&unknown=1`)).status).toBe(200);
  });
});

describe("API: slug endpoints", () => {
  const slugged: [string, Handler, (slug: string, status?: string) => Promise<unknown>][] = [
    ["services", service, (slug, status) => createService(db, svc(slug, { status }))],
    ["work", workItem, (slug, status) => createCaseStudy(db, { title: "C", slug, summary: "s", challenge: "c", status })],
    ["insights", insight, (slug, status) => createInsight(db, { title: "I", slug, excerpt: "e", content: "c", status })],
  ];

  it.each(slugged)("%s/:slug: valid, unknown, draft, id, malformed, conflicting", async (name, h, make) => {
    await make("live-page", "published");
    const draft = (await make("draft-page")) as { id: string };
    const get = (slug: string) => call(h, `/api/${name}/${slug}`, slug);

    const ok = await get("live-page");
    expect([ok.status, ok.body.success, ok.body.data.slug, ok.body.data.path]).toEqual([200, true, "live-page", `/${name}/live-page`]);
    expect(ok.body.data.seo.canonical).toBe(`https://smash.international/${name}/live-page`);

    for (const slug of ["unknown-page", "draft-page", draft.id]) {
      const r = await get(slug);
      expect([r.status, r.body.error.code, r.cache], slug).toEqual([404, "RESOURCE_NOT_FOUND", "no-store"]);
      expect(JSON.stringify(r.body)).not.toMatch(/draft|Case|Svc/); // a draft is indistinguishable from a missing page
    }
    for (const slug of ["Bad_Slug", "UPPER", "a b", "-lead", "trail-", "a--b", "x".repeat(101), "..%2f..%2fetc%2fpasswd", "'; DROP TABLE services;--"]) {
      const r = await get(slug);
      expect([r.status, r.body.error.code], slug).toEqual([400, "BAD_REQUEST"]);
    }
    await expect(make("live-page", "published")).rejects.toMatchObject({ code: "CONFLICT", status: 409 }); // duplicate is refused, existing page untouched
    expect((await get("live-page")).status).toBe(200);
  });

  it("site-settings and home: 404 before configured, then 200", async () => {
    for (const h of [home, siteSettings]) expect(await call(h, "/api/x")).toMatchObject({ status: 404, body: { success: false, error: { code: "RESOURCE_NOT_FOUND" } } });
    await saveSiteSettings(db, { siteName: "SMASH" });
    expect((await call(siteSettings, "/api/site-settings")).status).toBe(200);
  });
});

describe("API: no sensitive or internal data on any endpoint, with fully populated content", () => {
  it("leaks no ids, workflow fields, editorial notes, secrets, paths or drafts", async () => {
    const author = await createTeamMember(db, { name: "Ann", role: "Editor", status: "published" });
    const c = await createClient(db, { name: "Acme", status: "published" });
    const t = await createTestimonial(db, { quote: "Great", personName: "P", clientId: c.id, status: "published" });
    const s = await createService(db, svc("performance-marketing", { status: "published", faqs: [{ question: "Q?", answer: "A" }], seo: { primarySearchTopic: "internal topic", searchIntent: "commercial" } }));
    const cs = await createCaseStudy(db, { title: "Case", slug: "acme", summary: "s", challenge: "c", status: "published", clientId: c.id, testimonialId: t.id, results: [{ label: "L", value: "V", source: "INTERNAL SOURCE NOTE" }], relatedServiceIds: [s.id] });
    const i = await createInsight(db, { title: "Post", slug: "post", excerpt: "e", content: "c", status: "published", authorId: author.id, relatedServiceIds: [s.id], relatedCaseStudyIds: [cs.id] });
    await createService(db, svc("secret-draft", { name: "TOP SECRET DRAFT" }));
    await saveSiteSettings(db, { siteName: "SMASH", contact: { email: "hello@smash.international" } });
    await saveHomePage(db, { hero: { heading: "H" }, businessProof: { items: [{ label: "P", value: "V", source: "INTERNAL SOURCE NOTE" }] }, status: "published", seo: HOME_SEO, serviceIds: [s.id], caseStudyIds: [cs.id], testimonialIds: [t.id], insightIds: [i.id] });

    const responses = await Promise.all([
      call(home, "/api/home"), call(services, "/api/services"), call(service, "/api/services/performance-marketing", "performance-marketing"),
      call(work, "/api/work"), call(workItem, "/api/work/acme", "acme"), call(insights, "/api/insights"), call(insight, "/api/insights/post", "post"),
      call(testimonials, "/api/testimonials"), call(clients, "/api/clients"), call(siteSettings, "/api/site-settings"),
    ]);
    const banned = new Set(["id", "status", "createdAt", "displayOrder", "clientId", "authorId", "testimonialId", "source", "primarySearchTopic", "relatedSearchTopics", "searchIntent", "password", "token", "secret", "stack", "sql", "query"]);
    const found = new Set<string>();
    const walk = (v: unknown) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (banned.has(k)) found.add(k); walk(x); } };
    for (const r of responses) {
      expect(r.status).toBe(200);
      walk(r.body);
      const text = JSON.stringify(r.body);
      expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(text).not.toMatch(/TOP SECRET|INTERNAL SOURCE NOTE|internal topic|MONGODB_URI|mongodb:|\/Users\/|node_modules/);
    }
    expect([...found]).toEqual([]);
  });
});

describe("API: unexpected failures", () => {
  const everyEndpoint: [string, Handler, string, string?][] = [
    ["home", home, "/api/home"], ["services", services, "/api/services"], ["services/:slug", service, "/api/services/x", "valid-slug"], ["work", work, "/api/work"],
    ["work/:slug", workItem, "/api/work/x", "valid-slug"], ["insights", insights, "/api/insights"], ["insights/:slug", insight, "/api/insights/x", "valid-slug"],
    ["testimonials", testimonials, "/api/testimonials"], ["clients", clients, "/api/clients"], ["site-settings", siteSettings, "/api/site-settings"],
  ];

  it.each(everyEndpoint)("%s: a database outage is a safe 500 with diagnostics only in the log", async (_n, h, path, slug) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    holder.db = new Proxy({}, { get: () => { throw new Error("connect ECONNREFUSED " + "postgres://" + "admin:hunter2@db.internal:5432/smash at /srv/app/db.js:41"); } });
    const r = await call(h, path, slug);
    expect([r.status, r.body]).toEqual([500, { success: false, message: "Something went wrong.", error: { code: "INTERNAL_SERVER_ERROR" } }]);
    expect(r.cache).toBe("no-store");
    const logged = error.mock.calls.map((c) => String(c[0])).join("");
    expect(logged).toContain("Unhandled error");
    expect(logged).toContain("ECONNREFUSED"); // developers can diagnose
    expect(logged).not.toContain("hunter2"); // ...without the credential being written
  });
});

/* ───────────────────────── INTERNAL FUNCTIONS WITHOUT AN HTTP SURFACE ───────────────────────── */

describe("internal content functions that no endpoint covers yet", () => {
  it("careers: create, edit, publish, list, read by slug, unpublish", async () => {
    const career = await createCareer(db, { title: "Designer", slug: "designer", summary: "s", description: "d" });
    expect(await listPublishedCareers(db)).toEqual([]);
    await expect(getPublishedCareerBySlug(db, "designer")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await updateCareer(db, career.id, { status: "published", location: "Remote", employmentType: "full-time" });
    expect((await listPublishedCareers(db)).map((c) => c.slug)).toEqual(["designer"]);
    expect(await getPublishedCareerBySlug(db, "designer")).toMatchObject({ location: "Remote", employmentType: "full-time" });
    await updateCareer(db, career.id, { status: "draft" });
    expect(await listPublishedCareers(db)).toEqual([]);
    await expect(updateCareer(db, "00000000-0000-4000-8000-000000000000", { title: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("testimonials and team: edit, publish and hide; unknown client refused", async () => {
    const t = await createTestimonial(db, { quote: "q", personName: "P" });
    await updateTestimonial(db, t.id, { status: "published", personRole: "CEO" });
    expect(await listPublishedTestimonials(db)).toMatchObject([{ personRole: "CEO" }]);
    await expect(updateTestimonial(db, t.id, { clientId: "00000000-0000-4000-8000-000000000000" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await createTeamMember(db, { name: "Hidden", role: "r" });
    expect(await listPublishedTeam(db)).toEqual([]);
  });
});

/* ───────────────────────── RATE LIMITING AVAILABILITY ───────────────────────── */

describe("rate limiting does not lock out legitimate visitors", () => {
  it("requests with no client address are not pooled into one shared bucket", async () => {
    await createService(db, svc("busy-page", { status: "published" }));
    const codes = new Set<number>();
    for (let i = 0; i < 200; i++) codes.add((await call(services, "/api/services")).status); // no x-forwarded-for
    expect([...codes]).toEqual([200]);
  });
});

/* ───────────────────────── SEO ROUTE / SLUG QUALITY ───────────────────────── */

describe("SEO: route and slug quality", () => {
  it("accepts the approved service routes and natural article slugs without warnings", () => {
    for (const slug of ["performance-marketing", "social-media-management", "website-development", "crm-automation", "measuring-paid-media-results", "how-to-plan-a-paid-media-strategy"]) {
      expect([slugProblem(slug), slugStyleWarnings(slug)], slug).toEqual([null, []]);
    }
  });

  it("flags slugs written for search engines rather than people, and only warns", () => {
    const stuffed = "best-top-leading-digital-marketing-agency-services";
    expect(slugProblem(stuffed)).toBeNull(); // still a valid slug: editorial warning, not a block
    expect(slugStyleWarnings(stuffed).join(" ")).toMatch(/promotional filler \(best, top, leading\)/);
    expect(slugStyleWarnings("digital-marketing-agency-digital-marketing-company").join(" ")).toMatch(/repeats "digital", "marketing"/);
    expect(slugStyleWarnings("a-very-long-slug-with-far-too-many-words-in-it").join(" ")).toMatch(/words/);
    const issues = validateSeo({ siteUrl: "https://smash.international", siteName: "SMASH", allowIndexing: true }, { path: `/services/${stuffed}`, status: "published", title: "T" });
    expect(issues.filter((i) => i.field === "slug").length).toBeGreaterThan(0);
  });

  it("never accepts id-style, query-style or traversal slugs at all", () => {
    for (const slug of ["123", "service-1", "3f2504e0-4f89-41d3-9a0c-0305e82c3301", "a?id=1", "../x", "Perf Marketing"]) expect(slugProblem(slug), slug).not.toBeNull();
  });

  it("route, title and page identity agree for every content type (one source of truth)", async () => {
    const { resolveMetadata } = await import("@/server/seo/metadata");
    const { serviceSource, caseStudySource, insightSource, careerSource } = await import("@/server/seo/adapters");
    const site = { siteUrl: "https://smash.international", siteName: "SMASH", allowIndexing: true };
    const cases = [
      [serviceSource({ name: "Performance Marketing", slug: "performance-marketing", shortDescription: "d" }), "Performance Marketing", "/services/performance-marketing"],
      [caseStudySource({ title: "Acme Retail", slug: "acme-retail", summary: "s" }), "Acme Retail", "/work/acme-retail"],
      [insightSource({ title: "Measuring paid media", slug: "measuring-paid-media", excerpt: "e" }), "Measuring paid media", "/insights/measuring-paid-media"],
      [careerSource({ title: "Designer", slug: "designer", summary: "s" }), "Designer", "/careers/designer"],
    ] as const;
    for (const [source, title, path] of cases) {
      const m = resolveMetadata(site, source);
      expect([m.title, m.canonical]).toEqual([`${title} | SMASH`, `https://smash.international${path}`]);
    }
  });
});

describe("SEO: canonical integrity", () => {
  const site = { siteUrl: "https://smash.international", siteName: "SMASH", allowIndexing: true };
  const own = (path: string) => `https://smash.international${path}`;

  it("flags a canonical that points at a draft page, a missing page, a chain and a loop", async () => {
    await createService(db, svc("real-page", { status: "published" }));
    await createService(db, svc("draft-target"));
    await createService(db, svc("to-draft", { status: "published", seo: { canonicalUrl: own("/services/draft-target") } }));
    await createService(db, svc("to-missing", { status: "published", seo: { canonicalUrl: own("/services/not-a-page") } }));
    // Inserted directly: it deliberately collides with real-page's own canonical, which
    // createService's real-time guard (Stage 5, Phase 3) now refuses — this test is
    // specifically about the read-side chain/loop audit catching it regardless.
    await insertRow(db, servicesTable, { name: "Svc hop-two", slug: "hop-two", shortDescription: "d", status: "published", publishedAt: new Date(), seo: { canonicalUrl: own("/services/real-page") } }, "Service");
    await createService(db, svc("hop-one", { status: "published", seo: { canonicalUrl: own("/services/hop-two") } }));
    await createService(db, svc("loop-a", { status: "published", seo: { canonicalUrl: own("/services/loop-b") } }));
    await createService(db, svc("loop-b", { status: "published", seo: { canonicalUrl: own("/services/loop-a") } }));
    const text = (await auditSitemap(db, site)).issues.map((i) => `${i.url} :: ${i.problem}`).join("\n");
    expect(text).toMatch(/\/services\/to-draft :: canonical .* does not exist/);
    expect(text).toMatch(/\/services\/to-missing :: canonical .* does not exist/);
    expect(text).toMatch(/\/services\/hop-one :: canonical chain/);
    expect(text).toMatch(/\/services\/loop-a :: canonical chain/);
    expect(text).toMatch(/\/services\/loop-b :: canonical chain/);
    expect(text).not.toMatch(/hop-two ::|real-page ::/); // a canonical that is itself canonical is fine
  });
});

/* ───────────────────────── ENVIRONMENT ───────────────────────── */

describe("environment configuration", () => {
  const ok = { MONGODB_URI: "mongodb://127.0.0.1:1/none", NEXT_PUBLIC_SITE_URL: "https://smash.international" };
  it("fails fast, naming the variable, when a serving tier has no database", () => {
    expect(envSchema.safeParse({ APP_ENV: "development" }).success).toBe(true);
    for (const tier of ["staging", "production"]) {
      const r = envSchema.safeParse({ APP_ENV: tier, NEXT_PUBLIC_SITE_URL: ok.NEXT_PUBLIC_SITE_URL });
      expect(r.success, tier).toBe(false);
      expect(!r.success && r.error.issues.map((i) => i.path.join("."))).toEqual(["MONGODB_URI"]);
      expect(envSchema.safeParse({ APP_ENV: tier, ...ok }).success, tier).toBe(true);
    }
  });
  it("rejects unknown tiers, log levels and malformed values instead of guessing", () => {
    for (const bad of [{ APP_ENV: "prod" }, { LOG_LEVEL: "verbose" }, { NEXT_PUBLIC_SITE_URL: "not a url" }, { MEDIA_ALLOWED_HOSTS: "https://cdn.example" }]) {
      expect(envSchema.safeParse({ ...ok, ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });
  it("health check reports a bad configuration as a safe 500 and a good one as 200, never disclosing values", async () => {
    expect((await call(health as never, "/api/health")).body).toEqual({ success: true, data: { status: "ok" } });
    const saved = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
    const { GET: freshHealth } = await import("@/app/api/health/route");
    const r = await freshHealth();
    process.env.MONGODB_URI = saved;
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ success: false, message: "Something went wrong.", error: { code: "INTERNAL_SERVER_ERROR" } });
    expect(String(error.mock.calls[0]?.[0])).toContain("Invalid environment configuration: MONGODB_URI"); // the operator is told which variable
  });
});

/* ───────────────────────── INTERNAL LINKS ───────────────────────── */

/** Every defined static route now has a page, so the "not built yet" branch is exercised by temporarily un-listing /services. */
const withServicesUnbuilt = async (run: () => Promise<void>) => {
  const live = LIVE_STATIC_ROUTES as string[];
  const at = live.indexOf("/services");
  live.splice(at, 1);
  try {
    await run();
  } finally {
    live.splice(at, 0, "/services");
  }
};

describe("internal links entered by editors", () => {
  it("checks service CTAs too, and ignores drafts and external links", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    // /services is un-listed from the live routes for this test (see withServicesUnbuilt) to exercise the "not built yet" check.
    await createService(db, svc("with-cta", { status: "published", cta: { label: "Go", target: "/services" } }));
    await createService(db, svc("healthy-cta", { status: "published", cta: { label: "Go", target: "/services/performance-marketing" } }));
    await createService(db, svc("external-cta", { status: "published", cta: { label: "Book", target: "https://cal.example/book" } }));
    await createService(db, svc("draft-cta", { cta: { label: "Go", target: "/services/nowhere-page" } })); // draft: not public, not audited
    await withServicesUnbuilt(async () => {
      expect(await auditInternalLinks(db)).toEqual([{ source: "service:with-cta.cta", target: "/services", problem: "page is not built yet (it returns 404)" }]);
    });
  });

  it("checks every Home link source", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    const renamed = await createService(db, svc("old-name", { status: "published" }));
    await updateService(db, renamed.id, { slug: "new-name" });
    await createService(db, svc("draft-service"));
    // /services is the "not built yet" fixture here too (see the previous test's comment).
    await saveHomePage(db, {
      hero: { heading: "H", ctas: [{ label: "A", target: "/services/performance-marketing" }, { label: "B", target: "/services" }] },
      story: { cta: { label: "S", target: "/services" } },
      cta: { heading: "C", cta: { label: "P", target: "/services/old-name" }, secondaryCta: { label: "S", target: "https://cal.example/book" } },
      results: { items: [{ label: "R", value: "V", source: "s", link: "/services/draft-service" }] },
      status: "published", seo: HOME_SEO,
    });
    let issues: Awaited<ReturnType<typeof auditInternalLinks>> = [];
    await withServicesUnbuilt(async () => {
      issues = await auditInternalLinks(db);
    });
    expect(issues.map((i) => `${i.source} -> ${i.target}: ${i.problem}`)).toEqual([
      "home.hero.ctas[1] -> /services: page is not built yet (it returns 404)",
      "home.story.cta -> /services: page is not built yet (it returns 404)",
      "home.cta.primary -> /services/old-name: points at an old URL; use /services/new-name",
      "home.results[0].link -> /services/draft-service: no published page exists at this URL",
    ]);
  });
});
