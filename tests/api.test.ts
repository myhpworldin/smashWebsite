/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.APP_ENV = "production";
process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb, HOME_SEO } from "./test-db";
import { findRows, omit, type Db } from "@/server/db/helpers";
import { publicGet } from "@/server/api/handler";
import { RATE_LIMIT, RATE_LIMITS, checkRateLimit, resetRateLimits } from "@/server/api/rate-limit";
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
import { GET as health } from "@/app/api/health/route";
import { GET as careers } from "@/app/api/careers/route";
import { GET as career } from "@/app/api/careers/[slug]/route";
import { POST as contact } from "@/app/api/contact/route";
import { enquiries } from "@/server/db/schema";
import { createService, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createCareer, updateCareer } from "@/server/modules/careers/careers.service";
import { createTeamMember } from "@/server/modules/team/team.service";
import { createClient, updateClient } from "@/server/modules/clients/clients.service";
import { createTestimonial } from "@/server/modules/testimonials/testimonials.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { resolveMetadata } from "@/server/seo/metadata";
import { serviceSource } from "@/server/seo/adapters";
import { getPublishedServiceBySlug } from "@/server/modules/services/services.service";

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  resetRateLimits();
});
afterEach(() => vi.restoreAllMocks());

type Body = { success: boolean; data?: any; meta?: any; message?: string; error?: { code: string; details?: unknown } };
const call = async (handler: (r: Request, c?: any) => Promise<Response>, path: string, slug?: string, headers: Record<string, string> = {}) => {
  const res = await handler(new Request(`http://evil.example${path}`, { headers }), { params: Promise.resolve(slug === undefined ? {} : { slug }) });
  return { status: res.status, cache: res.headers.get("cache-control"), body: (await res.json()) as Body, res };
};
const keysDeep = (v: unknown, out = new Set<string>()): Set<string> => {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  }
  return out;
};
const INTERNAL = ["id", "status", "createdAt", "displayOrder", "clientId", "authorId", "testimonialId", "source", "hero_image"];
const noInternal = (body: unknown) => {
  const found = INTERNAL.filter((k) => keysDeep(body).has(k));
  expect(found, `internal keys leaked: ${found}`).toEqual([]);
};
const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "body", ...extra });

describe("envelope, errors and caching", () => {
  it("uses one success and one error shape, including the health endpoint", async () => {
    const h = await call(health as never, "/api/health");
    expect(h.body).toEqual({ success: true, data: { status: "ok" } });
    const nf = await call(service, "/api/services/nope", "nope");
    expect(nf.status).toBe(404);
    expect(nf.body).toEqual({ success: false, message: "The requested service was not found.", error: { code: "RESOURCE_NOT_FOUND" } });
  });

  it("caches successes briefly and never caches errors", async () => {
    await createService(db, svc("a", { status: "published" }));
    expect((await call(services, "/api/services")).cache).toBe("public, s-maxage=60, max-age=60");
    expect((await call(service, "/api/services/zzz", "zzz")).cache).toBe("no-store");
  });

  it("returns a safe 500 without internals", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const boom = publicGet(async () => {
      throw new Error("password=hunter2 at /Users/dev/db.ts");
    });
    const { status, body } = await call(boom, "/api/x");
    expect(status).toBe(500);
    expect(body).toEqual({ success: false, message: "Something went wrong.", error: { code: "INTERNAL_SERVER_ERROR" } });
    expect(JSON.stringify(body)).not.toMatch(/hunter2|Users|stack/);
  });

  it("rate limits per client with Retry-After, and recovers after the window", async () => {
    for (let i = 0; i < RATE_LIMIT.limit; i++) expect((await call(services, "/api/services", undefined, { "x-forwarded-for": "1.1.1.1" })).status).toBe(200);
    const blocked = await call(services, "/api/services", undefined, { "x-forwarded-for": "1.1.1.1" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error?.code).toBe("RATE_LIMITED");
    expect(blocked.res.headers.get("retry-after")).toBeTruthy();
    expect((await call(services, "/api/services", undefined, { "x-forwarded-for": "2.2.2.2" })).status).toBe(200);
    const t = Date.now() + RATE_LIMIT.windowMs + 1;
    expect(checkRateLimit("1.1.1.1", t).allowed).toBe(true);
  });
});

describe("home", () => {
  it("404s until published, then returns section-shaped, projected content", async () => {
    expect((await call(home, "/api/home")).status).toBe(404);
    const pub = await createService(db, svc("published-svc", { status: "published" }));
    const draft = await createService(db, svc("draft-svc"));
    const cs = await createCaseStudy(db, { title: "Case", slug: "case", summary: "s", challenge: "c", status: "published" });
    const dcs = await createCaseStudy(db, { title: "Draft case", slug: "draft-case", summary: "s" });
    const t = await createTestimonial(db, { quote: "q", personName: "P", status: "published" });
    const dt = await createTestimonial(db, { quote: "hidden", personName: "H" });
    const ins = await createInsight(db, { title: "I", slug: "i", excerpt: "e", content: "SECRET BODY", status: "published" });
    await saveHomePage(db, {
      hero: { heading: "Hero" },
      businessProof: { items: [{ label: "L", value: "V", source: "internal report" }] },
      servicesSection: { heading: "Services" },
      serviceIds: [draft.id, pub.id], caseStudyIds: [dcs.id, cs.id], testimonialIds: [dt.id, t.id], insightIds: [ins.id],
      status: "published", seo: HOME_SEO,
    });
    const { status, body, cache } = await call(home, "/api/home");
    expect(status).toBe(200);
    expect(cache).toContain("s-maxage");
    expect(Object.keys(body.data)).toEqual(expect.arrayContaining(["hero", "businessProof", "story", "services", "growthEngine", "selectedWork", "results", "whySmash", "testimonials", "technology", "insights", "cta", "seo"]));
    expect(body.data.services).toMatchObject({ heading: "Services", items: [{ name: "Svc published-svc", slug: "published-svc", path: "/services/published-svc" }] });
    expect(body.data.selectedWork.items.map((c: any) => c.slug)).toEqual(["case"]);
    expect(body.data.testimonials.items).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(/SECRET BODY|hidden|draft-svc|draft-case/);
    expect(body.data.businessProof.items[0]).toEqual({ order: 1, label: "L", value: "V", description: null, context: null, link: null }); // no `source`
    noInternal(body);
  });

  it("uses a fixed number of queries regardless of how many items are referenced", async () => {
    const count = async (n: number) => {
      const queries: string[] = [];
      const { db: d } = await createTestDb((q) => queries.push(q));
      holder.db = d;
      const ids: string[] = [];
      for (let i = 0; i < n; i++) ids.push((await createService(d, svc(`s-${n}-${i}`, { status: "published" }))).id);
      await saveHomePage(d, { status: "published", seo: HOME_SEO, hero: { heading: "H" }, serviceIds: ids });
      queries.length = 0;
      expect((await call(home, "/api/home")).status).toBe(200);
      return queries.length;
    };
    expect(await count(1)).toBe(await count(8));
  });
});

describe("services", () => {
  it("lists published services in display order with pagination metadata", async () => {
    await createService(db, svc("b", { status: "published", displayOrder: 2 }));
    await createService(db, svc("a", { status: "published", displayOrder: 1 }));
    await createService(db, svc("c", { status: "published", displayOrder: 3 }));
    await createService(db, svc("hidden"));
    const all = await call(services, "/api/services");
    expect(all.body.data.map((s: any) => s.slug)).toEqual(["a", "b", "c"]);
    expect(all.body.meta).toEqual({ page: 1, limit: 12, total: 3, totalPages: 1 });
    const p2 = await call(services, "/api/services?page=2&limit=2");
    expect(p2.body.data.map((s: any) => s.slug)).toEqual(["c"]);
    expect(p2.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    noInternal(all.body);
    expect(Object.keys(all.body.data[0]).sort()).toEqual(["image", "name", "path", "shortDescription", "slug"]);
  });

  it("rejects bad pagination with 422 and no unlimited page size", async () => {
    for (const q of ["page=0", "limit=0", "limit=51", "limit=1000000", "page=abc", "limit=-1"]) {
      const r = await call(services, `/api/services?${q}`);
      expect([r.status, r.body.error?.code], q).toEqual([422, "VALIDATION_ERROR"]);
    }
  });

  it("returns a detail record with SEO, related references and no internals", async () => {
    const cs = await createCaseStudy(db, { title: "Case", slug: "case", summary: "sum", challenge: "c", status: "published" });
    const draftCs = await createCaseStudy(db, { title: "Draft", slug: "dcase", summary: "x" });
    const s = await createService(db, svc("performance-marketing", {
      status: "published", description: "long", faqs: [{ question: "Q?", answer: "A" }], relatedCaseStudyIds: [cs.id, draftCs.id],
      seo: { metaTitle: "Custom title", primarySearchTopic: "performance marketing" },
    }));
    await createInsight(db, { title: "Art", slug: "art", excerpt: "e", content: "c", status: "published", relatedServiceIds: [s.id] });
    const { status, body } = await call(service, "/api/services/performance-marketing", "performance-marketing", { host: "evil.example" });
    expect(status).toBe(200);
    expect(body.data).toMatchObject({ slug: "performance-marketing", path: "/services/performance-marketing", faqs: [{ question: "Q?", answer: "A" }] });
    expect(body.data.relatedCaseStudies).toEqual([{ title: "Case", slug: "case", path: "/work/case", summary: "sum", image: null }]);
    expect(body.data.relatedInsights).toEqual([{ title: "Art", slug: "art", path: "/insights/art", excerpt: "e" }]);
    expect(body.data.seo.title).toBe("Custom title | smash.international");
    expect(body.data.seo.canonical).toBe("https://smash.international/services/performance-marketing"); // configured host, not the request's
    expect(body.data.seo.robots).toEqual({ index: true, follow: true });
    expect(keysDeep(body.data.seo).has("primarySearchTopic")).toBe(false); // editorial notes stay internal
    noInternal(body);
    // API SEO equals the page-metadata source of truth
    const m = resolveMetadata({ siteUrl: "https://smash.international", siteName: "smash.international", allowIndexing: true }, serviceSource(await getPublishedServiceBySlug(db, "performance-marketing")));
    expect(body.data.seo).toEqual(JSON.parse(JSON.stringify(omit(m, "path"))));
  });

  it("404s for unknown, draft, renamed and id-style slugs; 400 for malformed ones", async () => {
    const s = await createService(db, svc("draft-one"));
    for (const slug of ["nonexistent", "draft-one", s.id]) expect((await call(service, `/api/services/${slug}`, slug)).status, slug).toBe(404);
    for (const slug of ["Bad Slug", "UPPER", "a--b", "x".repeat(101)]) {
      const r = await call(service, "/api/services/x", slug);
      expect([r.status, r.body.error?.code], slug).toEqual([400, "BAD_REQUEST"]);
    }
    await updateService(db, s.id, { status: "published" });
    expect((await call(service, "/api/services/draft-one", "draft-one")).status).toBe(200);
    await updateService(db, s.id, { slug: "renamed" });
    expect((await call(service, "/api/services/draft-one", "draft-one")).status).toBe(404); // no silent redirect in the API
    expect((await call(service, "/api/services/renamed", "renamed")).status).toBe(200);
  });

  it("stops serving a service as soon as it is unpublished", async () => {
    const s = await createService(db, svc("gone", { status: "published" }));
    expect((await call(service, "/api/services/gone", "gone")).status).toBe(200);
    await updateService(db, s.id, { status: "draft" });
    expect((await call(service, "/api/services/gone", "gone")).status).toBe(404);
    expect((await call(services, "/api/services")).body.data).toHaveLength(0);
  });
});

describe("work", () => {
  it("lists and details published case studies with visibility-aware relations", async () => {
    const hiddenClient = await createClient(db, { name: "Hidden Co" });
    const shownClient = await createClient(db, { name: "Shown Co", status: "published" });
    const t = await createTestimonial(db, { quote: "Great", personName: "Ann", status: "published" });
    const s = await createService(db, svc("svc", { status: "published" }));
    await createCaseStudy(db, { title: "One", slug: "one", summary: "s", challenge: "c", status: "published", clientId: hiddenClient.id, results: [{ label: "R", value: "V", source: "internal" }], relatedServiceIds: [s.id], testimonialId: t.id });
    await createCaseStudy(db, { title: "Two", slug: "two", summary: "s", challenge: "c", status: "published", clientId: shownClient.id });
    await createCaseStudy(db, { title: "Draft", slug: "draft", summary: "s" });

    const list = await call(work, "/api/work");
    expect(list.body.data.map((c: any) => [c.slug, c.client?.name ?? null]).sort()).toEqual([["one", null], ["two", "Shown Co"]]);
    expect(list.body.meta.total).toBe(2);
    noInternal(list.body);

    const one = await call(workItem, "/api/work/one", "one");
    expect(one.body.data).toMatchObject({ path: "/work/one", client: null, testimonial: { quote: "Great" }, relatedServices: [{ slug: "svc", path: "/services/svc" }], results: [{ label: "R", value: "V" }] });
    expect(one.body.data.seo.canonical).toBe("https://smash.international/work/one");
    noInternal(one.body);
    expect((await call(workItem, "/api/work/draft", "draft")).status).toBe(404);
    expect((await call(workItem, "/api/work/missing", "missing")).body.error?.code).toBe("RESOURCE_NOT_FOUND");
  });
});

describe("insights", () => {
  it("paginates, filters by category, and keeps the body out of lists", async () => {
    const author = await createTeamMember(db, { name: "Ann", role: "Editor", status: "published" });
    for (const [i, name] of ["alpha", "bravo", "charlie", "delta", "echo"].entries()) {
      await createInsight(db, { title: `Post ${name}`, slug: `post-${name}`, excerpt: "e", content: "BODY", category: i % 2 ? "ads" : "seo", authorId: author.id, status: "published" });
    }
    await createInsight(db, { title: "Draft", slug: "draft", excerpt: "e", content: "c" });

    const p1 = await call(insights, "/api/insights?limit=2");
    expect(p1.body.data).toHaveLength(2);
    expect(p1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    const p3 = await call(insights, "/api/insights?limit=2&page=3");
    expect(p3.body.data).toHaveLength(1);
    const seen = new Set([...(await call(insights, "/api/insights?limit=2&page=2")).body.data, ...p1.body.data, ...p3.body.data].map((i: any) => i.slug));
    expect(seen.size).toBe(5); // stable, non-overlapping pages
    expect((await call(insights, "/api/insights?category=seo")).body.meta).toMatchObject({ total: 3, category: "seo" });
    expect((await call(insights, "/api/insights?category=nothing")).body.data).toEqual([]);
    expect(JSON.stringify(p1.body)).not.toContain("BODY");
    expect(p1.body.data[0].author).toEqual({ name: "Ann", role: "Editor" });
    noInternal(p1.body);
  });

  it("returns article detail with SEO article dates, author and related links", async () => {
    const author = await createTeamMember(db, { name: "Ann", role: "Editor", status: "published" });
    const s = await createService(db, svc("svc", { status: "published" }));
    const c = await createCaseStudy(db, { title: "C", slug: "c", summary: "s", challenge: "c", status: "published" });
    await createInsight(db, { title: "Article", slug: "article", excerpt: "e", content: "BODY", authorId: author.id, status: "published", relatedServiceIds: [s.id], relatedCaseStudyIds: [c.id], tags: ["a"] });
    const { body } = await call(insight, "/api/insights/article", "article");
    expect(body.data).toMatchObject({ slug: "article", path: "/insights/article", content: "BODY", tags: ["a"], author: { name: "Ann" }, relatedServices: [{ slug: "svc", path: "/services/svc" }], relatedCaseStudies: [{ slug: "c", path: "/work/c" }] });
    expect(body.data.seo.openGraph.type).toBe("article");
    expect(body.data.seo.modifiedTime).toBeTruthy();
    noInternal(body);
    expect((await call(insight, "/api/insights/draft", "draft")).status).toBe(404);
  });

  it("hides an unpublished author", async () => {
    const author = await createTeamMember(db, { name: "Secret Author", role: "r" });
    await createInsight(db, { title: "A", slug: "a", excerpt: "e", content: "c", authorId: author.id, status: "published" });
    expect((await call(insight, "/api/insights/a", "a")).body.data.author).toBeNull();
    expect(JSON.stringify((await call(insights, "/api/insights")).body)).not.toContain("Secret Author");
  });
});

describe("careers", () => {
  it("returns published career postings as a compact list, newest first", async () => {
    await createCareer(db, { title: "Draft Role", slug: "draft-role", summary: "s" });
    await createCareer(db, { title: "Analyst", slug: "analyst", summary: "sum", description: "desc", location: "Remote", department: "Growth", workMode: "hybrid", employmentType: "full-time", status: "published" });
    const { body } = await call(careers, "/api/careers");
    expect(body.data).toEqual([{ title: "Analyst", slug: "analyst", path: "/careers/analyst", summary: "sum", location: "Remote", department: "Growth", workMode: "hybrid", employmentType: "full-time", publishedAt: expect.any(String) }]);
    await expect(createCareer(db, { title: "Bad", slug: "bad-role", summary: "s", workMode: "anywhere" })).rejects.toThrow();
    expect(body.meta).toEqual({ total: 1 });
    noInternal(body);
  });

  it("returns a full career detail with seo, and 404s for unknown, draft and id-style slugs", async () => {
    const c = await createCareer(db, {
      title: "Analyst", slug: "analyst", summary: "sum", description: "desc", requirements: ["R1"], responsibilities: ["Resp1"],
      location: "Remote", employmentType: "full-time", status: "published",
    });
    const { body } = await call(career, "/api/careers/analyst", "analyst");
    expect(body.data).toMatchObject({ title: "Analyst", slug: "analyst", path: "/careers/analyst", requirements: ["R1"], responsibilities: ["Resp1"] });
    expect(body.data.seo.canonical).toBe("https://smash.international/careers/analyst");
    noInternal(body);
    for (const slug of ["nonexistent", c.id]) expect((await call(career, `/api/careers/${slug}`, slug)).status, slug).toBe(404);
    await updateCareer(db, c.id, { status: "draft" });
    expect((await call(career, "/api/careers/analyst", "analyst")).status).toBe(404);
    expect((await call(careers, "/api/careers")).body.data).toHaveLength(0);
  });
});

describe("testimonials, clients, site settings", () => {
  it("returns published testimonials with public fields only", async () => {
    const c = await createClient(db, { name: "C" });
    await createTestimonial(db, { quote: "Shown", personName: "A", personRole: "CEO", companyName: "Co", clientId: c.id, status: "published", displayOrder: 2 });
    await createTestimonial(db, { quote: "Shown first", personName: "B", status: "published", displayOrder: 1 });
    await createTestimonial(db, { quote: "Hidden", personName: "C" });
    const { body } = await call(testimonials, "/api/testimonials");
    expect(body.data.map((t: any) => t.quote)).toEqual(["Shown first", "Shown"]);
    expect(Object.keys(body.data[1]).sort()).toEqual(["companyName", "personName", "personRole", "photo", "quote"]);
    noInternal(body);
  });

  it("returns published clients with public fields only, in order", async () => {
    const draft = await createClient(db, { name: "Draft Co" });
    await createClient(db, { name: "B Co", status: "published", displayOrder: 2 });
    await createClient(db, { name: "A Co", website: "https://a.example", status: "published", displayOrder: 1 });
    const { body } = await call(clients, "/api/clients");
    expect(body.data.map((c: any) => c.name)).toEqual(["A Co", "B Co"]);
    expect(Object.keys(body.data[0]).sort()).toEqual(["description", "industry", "logo", "name", "website"]);
    await updateClient(db, draft.id, { status: "published" });
    expect((await call(clients, "/api/clients")).body.data).toHaveLength(3);
    noInternal(body);
  });

  it("returns site settings only, 404 before they exist", async () => {
    expect((await call(siteSettings, "/api/site-settings")).status).toBe(404);
    await saveSiteSettings(db, { siteName: "SMASH", contact: { email: "hello@smash.international" }, socialLinks: [{ platform: "x", url: "https://x.com/s" }] });
    const { body } = await call(siteSettings, "/api/site-settings");
    expect(Object.keys(body.data).sort()).toEqual(["contact", "defaultCta", "defaultOgImage", "defaultSeo", "favicon", "logo", "siteDescription", "siteName", "socialLinks", "updatedAt"]);
    expect(body.data.contact.email).toBe("hello@smash.international");
    expect(JSON.stringify(body)).not.toMatch(/MONGODB_URI|CMS_API_TOKEN|password/i);
    expect(body.data).not.toHaveProperty("id");
  });
});

describe("contact enquiries (Stage 3, Phase 7)", () => {
  const post = async (path: string, json: unknown, headers: Record<string, string> = {}) => {
    const res = await contact(new Request(`http://evil.example${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(json) }));
    return { status: res.status, body: (await res.json()) as Body, res };
  };
  const valid = { name: "Ada Lovelace", phone: "+91 98765 43210", location: "Mumbai, India" };

  it("persists a real submission, never echoes the data back, and is never cached", async () => {
    const { status, body, res } = await post("/api/contact", { ...valid, email: "ada@example.com", message: "We'd like to talk about a project." });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { received: true } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    const rows = await findRows(db, enquiries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ada Lovelace", phone: "+919876543210", phoneKey: "9876543210", location: "Mumbai, India", email: "ada@example.com", serviceOfInterest: null, submissionCount: 1 });
  });

  it("needs only name, phone and location; every other field is optional", async () => {
    expect((await post("/api/contact", valid)).status).toBe(200);
    expect((await findRows(db, enquiries))[0]).toMatchObject({ email: null, message: null, companyName: null, website: null, monthlyBudget: null, primaryGoal: null });
  });

  it("accepts the strategy-request fields and a service matching a real, published service", async () => {
    await createService(db, { name: "Performance Marketing", slug: "performance-marketing", shortDescription: "d", description: "d", status: "published" });
    const full = { ...valid, companyName: "Daily Bugle", website: "dailybugle.com", monthlyBudget: "₹50,000/-", primaryGoal: "Generate more leads", serviceOfInterest: "Performance Marketing" };
    expect((await post("/api/contact", full)).status).toBe(200);
    expect((await findRows(db, enquiries))[0]).toMatchObject({ ...full, phone: "+919876543210" });
  });

  it("merges repeat enquiries from the same phone number into one record instead of adding documents", async () => {
    await post("/api/contact", { ...valid, message: "First question", email: "ada@example.com" });
    // Same person, number typed differently, new details.
    expect((await post("/api/contact", { name: "Ada L.", phone: "98765-43210", location: "Pune", message: "Second question", monthlyBudget: "₹80,000" })).status).toBe(200);
    const rows = await findRows(db, enquiries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ada L.", location: "Pune", email: "ada@example.com", message: "Second question", monthlyBudget: "₹80,000", submissionCount: 2 });
    expect(rows[0].submissions.map((x) => x.message)).toEqual(["First question", "Second question"]);
    // A different number is a different record.
    await post("/api/contact", { ...valid, phone: "+91 91234 56789" });
    expect(await findRows(db, enquiries)).toHaveLength(2);
  });

  it("keeps one record when the same number submits concurrently", async () => {
    await Promise.all([1, 2, 3, 4].map((i) => post("/api/contact", { ...valid, message: `m${i}` }, { "x-forwarded-for": `1.1.1.${i}` })));
    const rows = await findRows(db, enquiries);
    expect(rows).toHaveLength(1);
    expect(rows[0].submissionCount).toBe(4);
  });

  it("rejects a serviceOfInterest that does not match any real, published service (Stage 6, Phase 3)", async () => {
    const { status, body } = await post("/api/contact", { ...valid, serviceOfInterest: "Something Made Up" });
    expect(status).toBe(422);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
    expect(await findRows(db, enquiries)).toHaveLength(0);

    // A real but still-draft service doesn't count either — it was never actually offered in the form's dropdown.
    await createService(db, { name: "Unpublished Service", slug: "unpublished-service", shortDescription: "d" });
    expect((await post("/api/contact", { ...valid, serviceOfInterest: "Unpublished Service" })).status).toBe(422);
  });

  it("rejects invalid input with a plain-language message per field, and persists nothing", async () => {
    const bad = { name: "A1!", phone: "12ab", location: "", email: "not-an-email", website: "javascript:alert(1)", monthlyBudget: "lots", primaryGoal: "Something else" };
    const { status, body } = await post("/api/contact", bad);
    expect(status).toBe(422);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
    expect((body.error as any).fields).toEqual({
      name: "Full name can only contain letters, spaces, apostrophes, hyphens and full stops.",
      phone: "Please enter a valid mobile number, e.g. +91 98765 43210.",
      location: "Please enter your location.",
      email: "Please enter a valid email address, e.g. peter@dailybugle.com.",
      website: "Please enter a valid website or Instagram link, e.g. dailybugle.com.",
      monthlyBudget: "Please enter your budget as an amount, e.g. ₹50,000.",
      primaryGoal: "Please choose one of the listed goals.",
    });
    expect((await post("/api/contact", {})).body.error).toMatchObject({ fields: { name: "Please enter your full name.", phone: "Please enter your mobile number.", location: "Please enter your location." } });
    expect(await findRows(db, enquiries)).toHaveLength(0);
  });

  it("rejects malformed JSON as a plain 400, not a raw parser error", async () => {
    const res = await contact(new Request("http://evil.example/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });

  it("silently drops a submission with a filled honeypot — accepted, but never stored", async () => {
    const { status, body } = await post("/api/contact", { ...valid, honeypot: "http://spam.example" });
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { received: true } }); // identical to a real success — no signal is given to the bot
    expect(await findRows(db, enquiries)).toHaveLength(0);
  });

  it("rate limits writes separately from reads, at the tighter publicWrite limit", async () => {
    for (let i = 0; i < RATE_LIMITS.publicWrite.limit; i++) {
      expect((await post("/api/contact", valid, { "x-forwarded-for": "9.9.9.9" })).status).toBe(200);
    }
    const blocked = await post("/api/contact", valid, { "x-forwarded-for": "9.9.9.9" });
    expect(blocked.status).toBe(429);
    // The same client can still read — write and read buckets are keyed separately (clientKey's `scope`).
    expect((await call(services, "/api/services", undefined, { "x-forwarded-for": "9.9.9.9" })).status).toBe(200);
  });
});
