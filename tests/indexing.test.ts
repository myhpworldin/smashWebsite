import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

import { createTestDb, HOME_SEO } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { envSchema } from "@/server/config/env";
import { CONTENT_ROUTES, LIVE_STATIC_ROUTES, STATIC_ROUTES, canonicalUrl } from "@/lib/routes";
import { buildRobots, SITEMAP_PATH } from "@/server/seo/robots";
import { auditSitemap, buildSitemap, sitemapEligible, SITEMAP_MAX_URLS } from "@/server/seo/sitemap";
import { resolveMetadata, type SiteSeoContext } from "@/server/seo/metadata";
import { auditPublishedSeo } from "@/server/seo/validate";
import { serviceSource } from "@/server/seo/adapters";
import { serializeJsonLd, articleJsonLd, servicePageJsonLd, caseStudyPageJsonLd, insightPageJsonLd, homeJsonLd } from "@/server/seo/schema";
import { resolvePublicRoute } from "@/server/seo/resolve";
import { createService, updateService, getPublishedServiceBySlug } from "@/server/modules/services/services.service";
import { services } from "@/server/db/schema";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createCareer } from "@/server/modules/careers/careers.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";

const ORIGIN = "https://smash.international";
const prod: SiteSeoContext = { siteUrl: ORIGIN, siteName: "SMASH", allowIndexing: true };
const staging: SiteSeoContext = { siteUrl: ORIGIN, siteName: "SMASH", allowIndexing: false };
const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "body", ...extra });
const cs = (slug: string, extra = {}) => ({ title: `Case ${slug}`, slug, summary: "s", challenge: "c", ...extra });
const ins = (slug: string, extra = {}) => ({ title: `Post ${slug}`, slug, excerpt: "e", content: "c", ...extra });
const urls = (entries: { url: string }[]) => entries.map((e) => e.url);

/**
 * Inserts a published service directly, bypassing `createService`'s own
 * `assertNoCanonicalConflict` (Stage 5, Phase 3) — some tests below need to
 * construct an *already-conflicting* database state to prove the read-side
 * audit (`auditPublishedSeo`/`auditSitemap`) still detects it, which is
 * exactly the state the write-side guard now prevents from happening through
 * the normal API. Both are real, complementary safeguards: this simulates
 * data that predates the guard, or arrived some other way (a migration, a
 * bulk import), not a way to work around it in production.
 */
const insertServiceDirect = (db: Db, slug: string, canonicalUrl: string) =>
  insertRow(db, services, { name: `Svc ${slug}`, slug, shortDescription: "d", status: "published", publishedAt: new Date(), seo: { canonicalUrl } }, "Service");

describe("canonical URLs", () => {
  it("are one deterministic https URL on the configured origin", () => {
    const want = `${ORIGIN}/services/performance-marketing`;
    for (const path of [
      "/services/performance-marketing", "/services/performance-marketing/", "/Services/Performance-Marketing",
      "/services/performance-marketing?utm_source=google&utm_medium=cpc", "/services/performance-marketing/?ref=campaign#pricing",
      "//services//performance-marketing", "services/performance-marketing",
    ]) expect(canonicalUrl(path, ORIGIN), path).toBe(want);
    expect(canonicalUrl("/", ORIGIN)).toBe(`${ORIGIN}/`);
    expect(canonicalUrl("/insights/my-article", `${ORIGIN}/`)).toBe(`${ORIGIN}/insights/my-article`);
  });

  it("cannot be redirected off-site by a crafted path", () => {
    for (const path of ["https://evil.example/x", "//evil.example/x", "/\\evil.example", "@evil.example"]) {
      expect(new URL(canonicalUrl(path, ORIGIN)).origin, path).toBe(ORIGIN);
    }
  });

  it("resolve from the configured site URL, never from a request host", () => {
    const meta = resolveMetadata(prod, { path: "/services/x", status: "published", title: "X" });
    expect(meta.canonical).toBe(`${ORIGIN}/services/x`);
    expect(canonicalUrl.length).toBe(2); // (path, siteUrl): there is no host parameter to spoof
  });
});

describe("production origin configuration", () => {
  const parse = (env: Record<string, string>) => envSchema.safeParse({ MONGODB_URI: "mongodb://127.0.0.1:1/none", ...env });
  it("accepts only the bare https production origin", () => {
    expect(parse({ APP_ENV: "production", NEXT_PUBLIC_SITE_URL: ORIGIN }).success).toBe(true);
    expect(parse({ APP_ENV: "production", NEXT_PUBLIC_SITE_URL: `${ORIGIN}/` }).success).toBe(true);
    for (const bad of [
      "http://smash.international", "https://www.smash.international", "https://staging.smash.international", "https://preview.smash.international",
      "https://dev.smash.international", "http://localhost:3000", "https://localhost", "https://smash.international/blog", "https://smash.international/?x=1",
      "https://user:pw@smash.international",
    ]) expect(parse({ APP_ENV: "production", NEXT_PUBLIC_SITE_URL: bad }).success, bad).toBe(false);
    expect(parse({ APP_ENV: "production" }).success).toBe(false); // default localhost is refused
  });
  it("staging needs https; development may use localhost", () => {
    expect(parse({ APP_ENV: "staging", NEXT_PUBLIC_SITE_URL: "https://staging.smash.international" }).success).toBe(true);
    expect(parse({ APP_ENV: "staging", NEXT_PUBLIC_SITE_URL: ORIGIN }).success).toBe(true); // canonicals to production, noindex
    expect(parse({ APP_ENV: "staging", NEXT_PUBLIC_SITE_URL: "http://staging.smash.international" }).success).toBe(false);
    expect(parse({ APP_ENV: "development" }).success).toBe(true);
  });
});

describe("robots", () => {
  it("production: everything crawlable, sitemap advertised, no blanket disallow", () => {
    const r = buildRobots(prod);
    // /preview/ (Stage 4, Phase 2 — draft preview) is the one deliberate exception: it always
    // needs a valid admin token to render anything, so there is no reason to invite a crawler.
    expect(r).toEqual({ rules: [{ userAgent: "*", allow: "/", disallow: "/preview/" }], sitemap: `${ORIGIN}${SITEMAP_PATH}` });
    expect(JSON.stringify(r)).not.toMatch(/disallow":\s*"\/"/);
    expect(r.sitemap).toBe("https://smash.international/sitemap.xml");
  });
  it("any other tier: crawling disallowed and no sitemap advertised", () => {
    expect(buildRobots(staging)).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
  });
  it("the route handler follows the environment", async () => {
    const run = async (env: Record<string, string>) => {
      vi.resetModules();
      Object.assign(process.env, env);
      return (await import("@/app/robots")).default();
    };
    const old = { ...process.env };
    try {
      expect(await run({ APP_ENV: "production", NEXT_PUBLIC_SITE_URL: ORIGIN })).toMatchObject({ sitemap: `${ORIGIN}/sitemap.xml` });
      expect(await run({ APP_ENV: "staging", NEXT_PUBLIC_SITE_URL: "https://staging.smash.international" })).toEqual({ rules: [{ userAgent: "*", disallow: "/" }] });
    } finally {
      process.env = old;
    }
  });
});

describe("sitemap", () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await createTestDb());
  });

  it("lists only published, indexable, canonical pages on the production origin, with real dates", async () => {
    const pub = await createService(db, svc("performance-marketing", { status: "published" }));
    await createService(db, svc("draft-service"));
    await createService(db, svc("social-media-management", { status: "published", seo: { robotsIndex: false } })); // noindex
    await insertServiceDirect(db, "website-development", `${ORIGIN}/services/performance-marketing`); // canonical elsewhere
    await createCaseStudy(db, cs("acme", { status: "published" }));
    await createCaseStudy(db, cs("hidden-case"));
    await createInsight(db, ins("first-article", { status: "published" }));
    await createInsight(db, ins("draft-article"));
    await createCareer(db, { title: "Role", slug: "role", summary: "s", description: "d", status: "published" });
    await saveHomePage(db, { status: "published", seo: HOME_SEO, hero: { heading: "H" } });

    const entries = await buildSitemap(db, prod);
    expect(urls(entries)).toEqual([
      `${ORIGIN}/`, `${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/careers/role`, `${ORIGIN}/contact`, `${ORIGIN}/insights`, `${ORIGIN}/insights/first-article`,
      `${ORIGIN}/services`, `${ORIGIN}/services/performance-marketing`, `${ORIGIN}/work`, `${ORIGIN}/work/acme`,
    ]);
    expect(new Set(urls(entries)).size).toBe(entries.length);
    const noRecordBehindIt = new Set([`${ORIGIN}/services`, `${ORIGIN}/work`, `${ORIGIN}/insights`, `${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/contact`]);
    for (const e of entries) {
      const u = new URL(e.url);
      expect([u.origin, u.search, u.hash]).toEqual([ORIGIN, "", ""]);
      // The /work, /insights, /about, /careers and /contact hubs are static pages with no content record behind them, so they legitimately have no lastModified (sitemap.ts's `add(route, null)`).
      if (!noRecordBehindIt.has(e.url)) expect(e.lastModified).toBeInstanceOf(Date);
    }
    expect(entries.find((e) => e.url.endsWith("performance-marketing"))!.lastModified).toEqual(pub.updatedAt);
  });

  it("includes no unbuilt or noindex static pages, and no invented URLs", async () => {
    await saveHomePage(db, { status: "published", seo: HOME_SEO, hero: { heading: "H" } });
    const listed = urls(await buildSitemap(db, prod));
    // /work, /insights, /about, /careers, /contact and /services have page files and are correctly listed.
    // /privacy-policy, /terms and /cookie-policy (Stage 4, Phase 7) have real page files too, but stay out
    // of the sitemap because static-pages.ts marks them noindex until their legal copy is approved.
    for (const route of STATIC_ROUTES.filter((r) => r !== "/" && r !== "/work" && r !== "/insights" && r !== "/about" && r !== "/careers" && r !== "/contact" && r !== "/services")) {
      expect(listed).not.toContain(canonicalUrl(route, ORIGIN));
    }
    expect(listed).toEqual([`${ORIGIN}/`, `${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/contact`, `${ORIGIN}/insights`, `${ORIGIN}/services`, `${ORIGIN}/work`]);
  });

  it("omits Home until it is published or if it opts out", async () => {
    const staticOnly = [`${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/contact`, `${ORIGIN}/insights`, `${ORIGIN}/services`, `${ORIGIN}/work`];
    // /work, /insights, /about, /careers and /contact are live static routes independent of Home's publish state; only Home's own presence is under test here.
    expect(urls(await buildSitemap(db, prod))).toEqual(staticOnly);
    await saveHomePage(db, { hero: { heading: "H" } });
    expect(urls(await buildSitemap(db, prod))).toEqual(staticOnly);
    await saveHomePage(db, { status: "published", seo: { robotsIndex: false } });
    expect(urls(await buildSitemap(db, prod))).toEqual(staticOnly);
  });

  it("updates itself as content is published, unpublished and renamed", async () => {
    const staticOnly = [`${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/contact`, `${ORIGIN}/insights`, `${ORIGIN}/services`, `${ORIGIN}/work`];
    const s = await createService(db, svc("new-service"));
    expect(urls(await buildSitemap(db, prod))).toEqual(staticOnly);
    await updateService(db, s.id, { status: "published" });
    expect(urls(await buildSitemap(db, prod))).toEqual([`${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/contact`, `${ORIGIN}/insights`, `${ORIGIN}/services`, `${ORIGIN}/services/new-service`, `${ORIGIN}/work`]);
    await updateService(db, s.id, { slug: "renamed-service" });
    expect(urls(await buildSitemap(db, prod))).toEqual([`${ORIGIN}/about`, `${ORIGIN}/careers`, `${ORIGIN}/contact`, `${ORIGIN}/insights`, `${ORIGIN}/services`, `${ORIGIN}/services/renamed-service`, `${ORIGIN}/work`]); // old slug gone; it 301s
    expect(await resolvePublicRoute(db, "/services/new-service")).toMatchObject({ kind: "redirect", to: "/services/renamed-service" });
    await updateService(db, s.id, { status: "draft" });
    expect(urls(await buildSitemap(db, prod))).toEqual(staticOnly);
  });

  it("is empty on non-indexable tiers, so staging never advertises its URLs", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    expect(await buildSitemap(db, staging)).toEqual([]);
    expect(await buildSitemap(db, { ...staging, siteUrl: "https://staging.smash.international" })).toEqual([]);
  });

  it("never lists ids or invalid slugs, and reads only slug/updatedAt/seo", async () => {
    const s = await createService(db, svc("real-service", { status: "published" }));
    const listed = urls(await buildSitemap(db, prod)).join(" ");
    expect(listed).not.toContain(s.id);
    expect((await resolvePublicRoute(db, "/services/non-existent-service")).kind).toBe("not-found");
    expect((await resolvePublicRoute(db, "/work/non-existent-case-study")).kind).toBe("not-found");
    expect((await resolvePublicRoute(db, "/insights/non-existent-article")).kind).toBe("not-found");
    expect(SITEMAP_MAX_URLS).toBe(50_000);
  });

  it("stays consistent with page robots and canonical: eligible ⇔ index and self-canonical", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await createService(db, svc("social-media-management", { status: "published", seo: { robotsIndex: false } }));
    await insertServiceDirect(db, "website-development", `${ORIGIN}/services/performance-marketing`);
    await createCaseStudy(db, cs("acme", { status: "published", seo: { robotsFollow: false } })); // nofollow is still indexable
    const listed = new Set(urls(await buildSitemap(db, prod)));
    const { entries } = await auditPublishedSeo(db, prod);
    for (const e of entries) {
      const self = canonicalUrl(e.path, ORIGIN);
      expect(listed.has(self), e.path).toBe(e.meta.robots.index && e.meta.canonical === self);
    }
    expect(sitemapEligible(prod, "/services/x", { robotsIndex: false })).toBe(false);
    expect(sitemapEligible(prod, "/services/x", { robotsFollow: false })).toBe(true);
    expect(sitemapEligible(staging, "/services/x")).toBe(false);
  });
});

describe("sitemap and canonical audit", () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await createTestDb());
  });

  it("finds nothing wrong with a generated sitemap", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await createCaseStudy(db, cs("acme", { status: "published" }));
    await createInsight(db, ins("first-article", { status: "published" }));
    await saveHomePage(db, { status: "published", seo: HOME_SEO, hero: { heading: "H" } });
    await saveSiteSettings(db, { siteName: "SMASH" });
    const { entries, issues } = await auditSitemap(db, prod);
    expect(entries).toHaveLength(10); // Home, service, case study, insight, and the /work, /insights, /about, /careers, /contact, /services hubs
    expect(issues).toEqual([]);
  });

  it("detects every class of sitemap defect", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await createService(db, svc("social-media-management", { status: "published", seo: { robotsIndex: false } }));
    await createService(db, svc("draft-one"));
    const bad = [
      { url: `${ORIGIN}/services/performance-marketing` }, { url: `${ORIGIN}/services/performance-marketing` }, // duplicate
      { url: `${ORIGIN}/services/performance-marketing?utm_source=x` }, { url: `${ORIGIN}/services/performance-marketing#top` },
      { url: `http://smash.international/services/performance-marketing` }, { url: `https://staging.smash.international/services/performance-marketing` },
      { url: `${ORIGIN}/Services/Performance-Marketing/` }, { url: `${ORIGIN}/services/draft-one` }, { url: `${ORIGIN}/services/non-existent-service` },
      { url: `${ORIGIN}/about` }, { url: `${ORIGIN}/services/social-media-management` },
    ];
    const text = (await auditSitemap(db, prod, bad)).issues.map((i) => i.problem).join("\n");
    for (const expected of ["duplicate URL", "query string or fragment", "not https", "not on the site origin", "not in canonical form", "does not resolve to a live page", "noindex but listed"]) {
      expect(text, expected).toContain(expected);
    }
  });

  it("flags a canonical that points at a page that does not exist, but not one that does", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await insertServiceDirect(db, "good-canonical", `${ORIGIN}/services/performance-marketing`);
    await createService(db, svc("ghost-canonical", { status: "published", seo: { canonicalUrl: `${ORIGIN}/services/does-not-exist` } })); // no clash: nothing else resolves to this canonical
    const { issues } = await auditSitemap(db, prod);
    expect(issues.map((i) => i.problem).filter((p) => p.includes("canonical")).join("\n")).toContain("/services/does-not-exist");
    expect(issues.filter((i) => i.problem.includes("good-canonical") || i.url.includes("good-canonical"))).toEqual([]);
  });

  it("reports duplicate canonical URLs across pages", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await insertServiceDirect(db, "a-variant", `${ORIGIN}/services/performance-marketing`);
    const { conflicts } = await auditPublishedSeo(db, prod);
    expect(conflicts.find((c) => c.kind === "canonical")?.paths.sort()).toEqual(["/services/a-variant", "/services/performance-marketing"]);
  });
});

describe("route integrity", () => {
  const appDir = join(process.cwd(), "src/app");
  const routeToFile = (route: string) => join(appDir, route === "/" ? "" : route, "page.tsx");

  it("LIVE_STATIC_ROUTES matches the static pages that actually exist", () => {
    for (const route of STATIC_ROUTES) {
      expect(LIVE_STATIC_ROUTES.includes(route), `${route}: registry says ${LIVE_STATIC_ROUTES.includes(route)}, page file ${existsSync(routeToFile(route))}`).toBe(existsSync(routeToFile(route)));
    }
    expect(LIVE_STATIC_ROUTES.every((r) => STATIC_ROUTES.includes(r))).toBe(true);
  });

  it("every content route has a slug page, and no public page or API route is id-based", () => {
    for (const { prefix } of Object.values(CONTENT_ROUTES)) expect(existsSync(join(appDir, prefix, "[slug]", "page.tsx")), prefix).toBe(true);
    // /api/admin/** is the one deliberate exception (Stage 4, Phase 2): an authenticated admin CRUD API
    // addresses records by database id, same as any conventional admin API — the rule this guards against
    // (guessable, unstable, SEO-hostile ids) doesn't apply to a non-crawlable, bearer-token-gated JSON API,
    // and several admin content types (TeamMember, Testimonial, Client) have no slug at all to use instead.
    const dirsExceptAdminApi = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const full = join(d, n);
        if (full === join(appDir, "api", "admin")) return [];
        return statSync(full).isDirectory() ? [n, ...dirsExceptAdminApi(full)] : [];
      });
    expect(dirsExceptAdminApi(appDir).filter((n) => /^\[\.{0,3}(id|.*Id)\]$/.test(n))).toEqual([]);
  });

  it("sitemap.xml and robots.txt routes exist", () => {
    expect(existsSync(join(appDir, "sitemap.ts"))).toBe(true);
    expect(existsSync(join(appDir, "robots.ts"))).toBe(true);
  });

  it("has no hardcoded production host in application code", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
    const offenders = walk(join(process.cwd(), "src")).filter((f) => /smash\.international/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("noindex headers", () => {
  afterEach(() => {
    delete process.env.APP_ENV;
  });
  it("marks every non-production response noindex, never production, and always marks the API", async () => {
    vi.resetModules();
    delete process.env.APP_ENV;
    const dev = (await import("../next.config")).default;
    const rules = await dev.headers!();
    const get = (source: string, key: string) => rules.filter((r) => r.source === source).flatMap((r) => r.headers).find((h) => h.key === key)?.value;
    expect(get("/:path*", "X-Robots-Tag")).toBe("noindex, nofollow");
    expect(get("/api/:path*", "X-Robots-Tag")).toBe("noindex, nofollow");

    vi.resetModules();
    process.env.APP_ENV = "production";
    const prodRules = await (await import("../next.config")).default.headers!();
    expect(prodRules.filter((r) => r.source === "/:path*").flatMap((r) => r.headers).find((h) => h.key === "X-Robots-Tag")).toBeUndefined();
    expect(prodRules.some((r) => r.source === "/api/:path*")).toBe(true);
  });
});

describe("structured data", () => {
  const LINE_SEP = String.fromCharCode(0x2028); // written as code so no editor or tool rewrites it
  const withMedia = { ...prod, logo: { url: "/media/logo.png", alt: "SMASH logo" } };
  it("serialises safely for inline scripts", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script><!-- x " + LINE_SEP + " y" });
    expect(out).not.toMatch(new RegExp("</script|<!--|" + LINE_SEP));
    expect(JSON.parse(out).name).toContain("</script>"); // still round-trips
  });
  it("Service uses the page's own content and canonical URL", () => {
    const [service, ...rest] = servicePageJsonLd(prod, { name: "Performance Marketing", slug: "performance-marketing", shortDescription: "About it" });
    expect(service).toMatchObject({ "@type": "Service", name: "Performance Marketing", url: `${ORIGIN}/services/performance-marketing`, description: "About it" });
    expect(rest.map((x) => x["@type"])).toEqual(["BreadcrumbList"]);
  });
  it("breadcrumbs and FAQs are emitted only when the page renders them", () => {
    const faqs = [{ question: "Q?", answer: "A." }];
    const types = (breadcrumbs: boolean, f: typeof faqs) => servicePageJsonLd(prod, { name: "N", slug: "n", shortDescription: "d", faqs: f }, { breadcrumbs }).map((x) => x["@type"]);
    expect(types(false, [])).toEqual(["Service"]);
    expect(types(false, faqs)).toEqual(["Service", "FAQPage"]);
    expect(types(true, faqs)).toEqual(["Service", "BreadcrumbList", "FAQPage"]);
    expect(caseStudyPageJsonLd(prod, { title: "C", slug: "c" }, { breadcrumbs: false })).toEqual([]);
    expect(insightPageJsonLd(prod, { title: "T", slug: "t", excerpt: "e", publishedAt: new Date() }, { breadcrumbs: false }).map((x) => x["@type"])).toEqual(["Article"]);
  });
  it("Article fails safe without a date, and uses real author, image and canonical URL", () => {
    expect(articleJsonLd(prod, { headline: "H", path: "/insights/h" })).toBeNull();
    const a = articleJsonLd(prod, { headline: "H", path: "/insights/h", authorName: "Ann", imageUrl: "/media/a.jpg", publishedAt: new Date("2026-01-01"), updatedAt: new Date("2026-02-01") })!;
    expect(a).toMatchObject({ author: { name: "Ann" }, image: `${ORIGIN}/media/a.jpg`, mainEntityOfPage: { "@id": `${ORIGIN}/insights/h` }, datePublished: "2026-01-01T00:00:00.000Z", dateModified: "2026-02-01T00:00:00.000Z" });
  });
  it("Organization contains only stored data, and no LocalBusiness or invented claims exist", () => {
    const [org] = homeJsonLd(withMedia);
    expect(Object.keys(org).sort()).toEqual(["@context", "@type", "logo", "name", "url"]);
    expect(JSON.stringify(org)).not.toMatch(/LocalBusiness|address|telephone|aggregateRating|award|employee/i);
  });
  it("service pages are built from the record, not a shared object", async () => {
    const { db } = await createTestDb();
    await createService(db, svc("performance-marketing", { status: "published" }));
    await createService(db, svc("social-media-management", { status: "published", shortDescription: "Different" }));
    const a = await getPublishedServiceBySlug(db, "performance-marketing");
    const b = await getPublishedServiceBySlug(db, "social-media-management");
    expect(servicePageJsonLd(prod, a)[0]).not.toEqual(servicePageJsonLd(prod, b)[0]);
    expect(resolveMetadata(prod, serviceSource(a)).canonical).toBe(`${ORIGIN}/services/performance-marketing`);
  });
});
