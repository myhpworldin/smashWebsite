import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./test-db";
import type { Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { ROUTES, TOP_LEVEL_SEGMENTS, canonicalUrl, normalizePathname } from "@/lib/routes";
import { generateSlug, intentKey, slugProblem, slugify } from "@/server/seo/slug";
import { parseContentPath, resolvePublicRoute } from "@/server/seo/resolve";
import { createService, getPublishedServiceBySlug, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy, updateCaseStudy } from "@/server/modules/work/work.service";
import { createInsight, updateInsight } from "@/server/modules/insights/insights.service";

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
});

const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "body", ...extra });
const insight = (slug: string, extra = {}) => ({ title: "T", slug, excerpt: "e", content: "c", ...extra });
const code = async (p: Promise<unknown>) => ((await p.then(() => null, (e: unknown) => e)) as AppError | null)?.code;

describe("slugify", () => {
  it.each([
    ["Performance Marketing", "performance-marketing"],
    ["  Social   Media Management ", "social-media-management"],
    ["Website Development", "website-development"],
    ["Café & Bar: Ünïcode!", "cafe-and-bar-unicode"],
    ["Don't Stop -- Believing", "dont-stop-believing"],
    ["marketing marketing tips", "marketing-tips"],
    ["snake_case and camelCase", "snake-case-and-camelcase"],
  ])("%s -> %s", (input, out) => expect(slugify(input)).toBe(out));

  it("is deterministic and returns empty for unusable input", () => {
    expect(slugify("A B")).toBe(slugify("A B"));
    for (const v of ["", "   ", "!!!", "---"]) expect(slugify(v)).toBe("");
    expect(() => generateSlug("!!!")).toThrow();
  });

  it("cuts long titles at a word boundary without dropping words mid-way", () => {
    const slug = slugify("How to plan a measurable paid media strategy for a growing consumer brand this year");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.startsWith("how-to-plan-a-measurable-paid-media")).toBe(true);
    expect(slug.endsWith("-")).toBe(false);
    expect("how-to-plan-a-measurable-paid-media-strategy-for-a-growing-consumer-brand-this-year").toContain(slug);
  });
});

describe("slug rules", () => {
  it("accepts semantic slugs", () => {
    for (const s of ["performance-marketing", "crm-automation", "a1"]) expect(slugProblem(s)).toBeNull();
  });
  it("rejects malformed, reserved and identifier-like slugs", () => {
    for (const s of ["", "Upper", "under_score", "a b", "a--b", "-a", "a-", "123", "service-1", "page-123", "3f2504e0-4f89-41d3-9a0c-0305e82c3301", "about", "api", "services"]) {
      expect(slugProblem(s), s).not.toBeNull();
    }
    expect(TOP_LEVEL_SEGMENTS).toEqual(expect.arrayContaining(["about", "services", "work", "insights", "careers", "contact", "api"]));
  });
  it("is enforced on create", async () => {
    expect(await code(createService(db, svc("about")))).toBeUndefined(); // ZodError, not AppError
    await expect(createService(db, svc("about"))).rejects.toThrow(/reserved/);
  });
});

describe("uniqueness", () => {
  it("is per content type: same slug allowed across types, not within one", async () => {
    await createService(db, svc("branding"));
    await createInsight(db, insight("branding"));
    await createCaseStudy(db, { title: "C", slug: "branding", summary: "s" });
    expect(await code(createInsight(db, insight("branding")))).toBe("CONFLICT");
    expect(await code(createCaseStudy(db, { title: "C2", slug: "branding", summary: "s" }))).toBe("CONFLICT");
  });

  it("rejects a service targeting the same intent as an existing one", async () => {
    await createService(db, svc("performance-marketing"));
    expect(await code(createService(db, svc("performance-marketing-services")))).toBe("CONFLICT");
    expect(await code(createService(db, svc("performance-marketings")))).toBe("CONFLICT");
    await createService(db, svc("social-media-management"));
    expect(intentKey("performance-marketing-services")).toBe(intentKey("performance-marketing"));
  });

  it("a duplicate publish attempt on the same slug conflicts", async () => {
    await createService(db, svc("seo", { status: "published" }));
    expect(await code(createService(db, svc("seo", { status: "published" })))).toBe("CONFLICT");
  });
});

describe("stability and redirects", () => {
  it("does not change the slug when the title changes", async () => {
    const s = await createService(db, svc("performance-marketing", { status: "published" }));
    await updateService(db, s.id, { name: "Performance Marketing Services for Growth-Focused Brands" });
    expect((await getPublishedServiceBySlug(db, "performance-marketing")).name).toContain("Growth-Focused");
    expect((await resolvePublicRoute(db, "/services/performance-marketing")).kind).toBe("content");
  });

  it("records a 301 when a published slug is changed, and keeps redirects flat", async () => {
    const s = await createService(db, svc("paid-ads", { status: "published" }));
    await updateService(db, s.id, { slug: "paid-media" });
    expect(await resolvePublicRoute(db, "/services/paid-ads")).toEqual({ kind: "redirect", to: "/services/paid-media", status: 301 });

    await updateService(db, s.id, { slug: "paid-social" });
    expect(await resolvePublicRoute(db, "/services/paid-ads")).toMatchObject({ kind: "redirect", to: "/services/paid-social" });
    expect(await resolvePublicRoute(db, "/services/paid-media")).toMatchObject({ kind: "redirect", to: "/services/paid-social" });

    await updateService(db, s.id, { slug: "paid-ads" }); // moving back removes the loop
    expect((await resolvePublicRoute(db, "/services/paid-ads")).kind).toBe("content");
    expect(await resolvePublicRoute(db, "/services/paid-social")).toMatchObject({ kind: "redirect", to: "/services/paid-ads" });
  });

  it("records no redirect for never-published content", async () => {
    const s = await createService(db, svc("draft-old"));
    await updateService(db, s.id, { slug: "draft-new" });
    expect((await resolvePublicRoute(db, "/services/draft-old")).kind).toBe("not-found");
  });

  it("covers case studies and insights", async () => {
    const c = await createCaseStudy(db, { title: "C", slug: "acme", summary: "s", challenge: "c", status: "published" });
    await updateCaseStudy(db, c.id, { slug: "acme-retail" });
    expect(await resolvePublicRoute(db, "/work/acme")).toMatchObject({ kind: "redirect", to: "/work/acme-retail" });
    const i = await createInsight(db, insight("old-topic", { status: "published" }));
    await updateInsight(db, i.id, { slug: "new-topic" });
    expect(await resolvePublicRoute(db, "/insights/old-topic")).toMatchObject({ kind: "redirect", to: "/insights/new-topic" });
  });
});

describe("route resolution", () => {
  it("resolves published service, case study and insight slugs; 404s unknown ones", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await createCaseStudy(db, { title: "C", slug: "acme", summary: "s", challenge: "c", status: "published" });
    await createInsight(db, insight("first-article", { status: "published" }));

    expect(await resolvePublicRoute(db, ROUTES.SERVICE("performance-marketing"))).toEqual({ kind: "content", type: "service", slug: "performance-marketing", canonicalPath: "/services/performance-marketing" });
    expect(await resolvePublicRoute(db, ROUTES.CASE_STUDY("acme"))).toMatchObject({ kind: "content", type: "caseStudy" });
    expect(await resolvePublicRoute(db, ROUTES.INSIGHT("first-article"))).toMatchObject({ kind: "content", type: "insight" });

    for (const p of ["/services/non-existent-service", "/work/non-existent-client", "/insights/non-existent-article"]) {
      expect((await resolvePublicRoute(db, p)).kind).toBe("not-found");
    }
  });

  it("does not resolve drafts, across types, or by id", async () => {
    const s = await createService(db, svc("hidden"));
    expect((await resolvePublicRoute(db, "/services/hidden")).kind).toBe("not-found");
    expect((await resolvePublicRoute(db, `/services/${s.id}`)).kind).toBe("not-found");
    await updateService(db, s.id, { status: "published" });
    expect((await resolvePublicRoute(db, "/services/hidden")).kind).toBe("content");
    expect((await resolvePublicRoute(db, "/work/hidden")).kind).toBe("not-found");
    await updateService(db, s.id, { status: "draft" });
    expect((await resolvePublicRoute(db, "/services/hidden")).kind).toBe("not-found");
  });

  it("recognises static routes and rejects invalid patterns", async () => {
    for (const p of ["/", "/about", "/services", "/work", "/insights", "/careers", "/contact"]) {
      expect((await resolvePublicRoute(db, p)).kind).toBe("static");
    }
    for (const p of ["/nope", "/services/a/b", "/about/team", "/api/health"]) {
      expect((await resolvePublicRoute(db, p)).kind, p).toBe("not-found");
    }
    expect(parseContentPath("/services/a/b")).toBeNull();
  });

  it("normalises case, trailing slashes and query strings before resolving", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    for (const p of ["/Services/Performance-Marketing", "/services/performance-marketing/", "/services/performance-marketing?utm=x", "//services//performance-marketing"]) {
      expect((await resolvePublicRoute(db, p)).kind, p).toBe("content");
    }
  });
});

describe("URL normalisation", () => {
  it("applies the documented policy", () => {
    expect(normalizePathname("/Services/")).toBe("/services");
    expect(normalizePathname("/services?x=1#top")).toBe("/services");
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("")).toBe("/");
    expect(normalizePathname("services//a/")).toBe("/services/a");
  });
  it("builds canonical URLs on the primary host without query or trailing slash", () => {
    expect(canonicalUrl("/Services/Performance-Marketing/?x=1", "https://smash.international/")).toBe("https://smash.international/services/performance-marketing");
    expect(canonicalUrl("/", "https://smash.international")).toBe("https://smash.international/");
  });
  it("route helpers produce the documented patterns", () => {
    expect([ROUTES.SERVICE("a"), ROUTES.CASE_STUDY("b"), ROUTES.INSIGHT("c"), ROUTES.CAREER("d")]).toEqual(["/services/a", "/work/b", "/insights/c", "/careers/d"]);
  });
});
