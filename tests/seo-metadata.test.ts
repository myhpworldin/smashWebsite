import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, HOME_SEO } from "./test-db";
import { insertRow, type Db } from "@/server/db/helpers";
import { envSchema } from "@/server/config/env";
import { seoSchema } from "@/server/validation/common";
import { homeSource, insightSource, serviceSource } from "@/server/seo/adapters";
import { formatTitle, resolveMetadata, truncateAtWord, type SeoSource, type SiteSeoContext } from "@/server/seo/metadata";
import { buildBreadcrumbs } from "@/server/seo/breadcrumbs";
import { staticPageSource } from "@/server/seo/static-pages";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, homeJsonLd, insightPageJsonLd, organizationJsonLd, serializeJsonLd, servicePageJsonLd, serviceJsonLd } from "@/server/seo/schema";
import { auditPublishedSeo, validateSeo } from "@/server/seo/validate";
import { loadSiteSeoContext } from "@/server/seo/site-context";
import { toNextMetadata } from "@/server/seo/to-next-metadata";
import { createService, getPublishedServiceBySlug, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy, getPublishedCaseStudyBySlug } from "@/server/modules/work/work.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createTeamMember } from "@/server/modules/team/team.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { services } from "@/server/db/schema";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international"; // explicit canonicals must be on the site origin

const site: SiteSeoContext = { siteUrl: "https://smash.international", siteName: "SMASH", allowIndexing: true };
const img = { url: "/img/a.png", alt: "A team reviewing a campaign report", width: 1200, height: 630 };
const base = (over: Partial<SeoSource> = {}): SeoSource => ({ path: "/services/performance-marketing", status: "published", title: "Performance Marketing", ...over });

describe("meta title", () => {
  it("uses the explicit title, else the content title, else the site default, else the site name", () => {
    expect(resolveMetadata(site, base({ seo: { metaTitle: "Paid growth, measured" } })).title).toBe("Paid growth, measured | SMASH");
    expect(resolveMetadata(site, base()).title).toBe("Performance Marketing | SMASH");
    expect(resolveMetadata({ ...site, defaultSeo: { metaTitle: "SMASH Default" } }, base({ title: " " })).title).toBe("SMASH Default");
    expect(resolveMetadata(site, base({ title: "" })).title).toBe("SMASH");
  });
  it("does not repeat the site name, and leaves Home un-suffixed", () => {
    expect(formatTitle("About SMASH", "SMASH")).toBe("About SMASH");
    expect(formatTitle("Home headline", "SMASH", true)).toBe("Home headline");
    expect(resolveMetadata(site, homeSource({ seo: { metaTitle: "Digital growth partner" } })).title).toBe("Digital growth partner");
  });
});

describe("meta description", () => {
  it("prefers explicit, then a trimmed summary, then site defaults, else none", () => {
    expect(resolveMetadata(site, base({ summary: "s", seo: { metaDescription: "Explicit" } })).description).toBe("Explicit");
    expect(resolveMetadata(site, base({ summary: "  A   short\nsummary " })).description).toBe("A short summary");
    expect(resolveMetadata({ ...site, siteDescription: "Site copy" }, base()).description).toBe("Site copy");
    expect(resolveMetadata({ ...site, defaultSeo: { metaDescription: "Default" }, siteDescription: "x" }, base()).description).toBe("Default");
    expect(resolveMetadata(site, base()).description).toBeUndefined();
  });
  it("truncates long summaries at a word boundary", () => {
    const long = "word ".repeat(80).trim();
    const out = resolveMetadata(site, base({ summary: long })).description!;
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
    expect(truncateAtWord("short")).toBe("short");
  });
});

describe("canonical", () => {
  it("is built from the configured site URL and route, never a request host", () => {
    expect(resolveMetadata(site, base()).canonical).toBe("https://smash.international/services/performance-marketing");
    expect(resolveMetadata(site, base({ path: "/Services/Performance-Marketing/?utm=1" })).canonical).toBe("https://smash.international/services/performance-marketing");
    expect(resolveMetadata(site, homeSource({})).canonical).toBe("https://smash.international/");
  });
  it("accepts a same-host override and ignores a foreign or malformed one", () => {
    const c = (canonicalUrl: string) => resolveMetadata(site, base({ seo: { canonicalUrl } })).canonical;
    expect(c("https://smash.international/services/other?x=1")).toBe("https://smash.international/services/other");
    expect(c("https://evil.example/services/performance-marketing")).toBe("https://smash.international/services/performance-marketing");
    expect(c("not a url")).toBe("https://smash.international/services/performance-marketing");
  });
  it("validation flags invalid, foreign and cross-page canonicals", () => {
    const issues = (canonicalUrl: string) => validateSeo(site, base({ seo: { canonicalUrl } })).filter((i) => i.field === "canonicalUrl");
    expect(issues("https://evil.example/x")[0].level).toBe("error");
    expect(issues("nope")[0].level).toBe("error");
    expect(issues("https://smash.international/services/other")[0].level).toBe("warning");
    expect(issues("https://smash.international/services/performance-marketing")).toHaveLength(0);
  });
  it("production requires a public https site URL", () => {
    expect(envSchema.safeParse({ APP_ENV: "production" }).success).toBe(false);
    expect(envSchema.safeParse({ APP_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://smash.international" }).success).toBe(false);
    expect(envSchema.safeParse({ APP_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://smash.international", MONGODB_URI: "mongodb://127.0.0.1:1/none" }).success).toBe(true);
    expect(envSchema.safeParse({ APP_ENV: "development" }).success).toBe(true);
  });
});

describe("robots and publishing", () => {
  it("defaults to index,follow when published", () => {
    expect(resolveMetadata(site, base()).robots).toEqual({ index: true, follow: true });
  });
  it("supports noindex and nofollow independently", () => {
    expect(resolveMetadata(site, base({ seo: { robotsIndex: false } })).robots).toEqual({ index: false, follow: true });
    expect(resolveMetadata(site, base({ seo: { robotsFollow: false } })).robots).toEqual({ index: true, follow: false });
  });
  it("never indexes a draft, even when SEO says index", () => {
    expect(resolveMetadata(site, base({ status: "draft", seo: { robotsIndex: true, robotsFollow: true } })).robots).toEqual({ index: false, follow: false });
  });
  it("never indexes on non-production tiers", () => {
    expect(resolveMetadata({ ...site, allowIndexing: false }, base({ seo: { robotsIndex: true } })).robots).toEqual({ index: false, follow: false });
  });
  it("rejects malformed robots configuration", () => {
    expect(seoSchema.safeParse({ robotsIndex: "yes" }).success).toBe(false);
  });
});

describe("Open Graph and Twitter", () => {
  it("prefers the SEO image, then the content image, then the site default, then none", () => {
    const seoImg = { ...img, url: "https://cdn.example/og.png" };
    expect(resolveMetadata(site, base({ image: img, seo: { ogImage: seoImg } })).openGraph.image?.url).toBe("https://cdn.example/og.png");
    expect(resolveMetadata(site, base({ image: img })).openGraph.image?.url).toBe("https://smash.international/img/a.png");
    expect(resolveMetadata({ ...site, defaultOgImage: { ...img, url: "/default.png" } }, base()).openGraph.image?.url).toBe("https://smash.international/default.png");
    expect(resolveMetadata(site, base()).openGraph.image).toBeUndefined();
  });
  it("keeps og/twitter consistent with the page and picks a sensible card", () => {
    const m = resolveMetadata(site, base({ summary: "About the service", image: img }));
    expect(m.openGraph).toMatchObject({ title: m.title, description: "About the service", url: m.canonical, type: "website", siteName: "SMASH" });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: m.title });
    expect(resolveMetadata(site, base()).twitter.card).toBe("summary");
    const custom = resolveMetadata(site, base({ seo: { ogTitle: "OG", twitterTitle: "TW", twitterCard: "summary" }, image: img }));
    expect([custom.openGraph.title, custom.twitter.title, custom.twitter.card]).toEqual(["OG", "TW", "summary"]);
  });
  it("marks articles with dates and maps onto Next metadata", () => {
    const m = resolveMetadata(site, insightSource({ title: "T", slug: "t", excerpt: "e", publishedAt: new Date("2026-01-02T00:00:00Z"), updatedAt: new Date("2026-02-03T00:00:00Z") }));
    expect(m.openGraph.type).toBe("article");
    expect(m).toMatchObject({ publishedTime: "2026-01-02T00:00:00.000Z", modifiedTime: "2026-02-03T00:00:00.000Z" });
    const next = toNextMetadata(m);
    expect(next.title).toEqual({ absolute: "T | SMASH" });
    expect(next.alternates?.canonical).toBe("https://smash.international/insights/t");
    expect(next.robots).toEqual({ index: true, follow: true });
  });
});

describe("static pages and breadcrumbs", () => {
  it("has an SEO source for static routes and none for content routes", () => {
    expect(resolveMetadata(site, staticPageSource("/about")!).title).toBe("About | SMASH");
    expect(staticPageSource("/services/x")).toBeNull();
    expect(resolveMetadata(site, staticPageSource("/about")!).description).toBeUndefined(); // no invented copy
  });
  it("marks the Legal pages noindex until their copy is approved (Stage 4, Phase 7), unlike every other static page", () => {
    for (const path of ["/privacy-policy", "/terms", "/cookie-policy"]) {
      expect(resolveMetadata(site, staticPageSource(path)!).robots).toEqual({ index: false, follow: true });
    }
    expect(resolveMetadata(site, staticPageSource("/about")!).robots).toEqual({ index: true, follow: true });
  });
  it("follows the route hierarchy", () => {
    expect(buildBreadcrumbs("/")).toEqual([{ name: "Home", path: "/" }]);
    expect(buildBreadcrumbs("/services/performance-marketing", "Performance Marketing").map((c) => c.name)).toEqual(["Home", "Services", "Performance Marketing"]);
    expect(buildBreadcrumbs("/work/acme").map((c) => c.name)).toEqual(["Home", "Our Work", "acme"]);
    expect(buildBreadcrumbs("/about").map((c) => c.path)).toEqual(["/", "/about"]);
    expect(buildBreadcrumbs("/services/performance-marketing", "Performance Marketing").map((c) => c.path)).toEqual(["/", "/services", "/services/performance-marketing"]);
  });
});

describe("structured data", () => {
  const org = { ...site, logo: img, socialLinks: [{ platform: "x", url: "https://x.com/smash" }, { platform: "bad", url: "/internal" }], contact: { email: "hello@smash.international" } };

  it("Organization uses only stored values", () => {
    expect(organizationJsonLd(org)).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "SMASH",
      url: "https://smash.international/",
      logo: "https://smash.international/img/a.png",
      sameAs: ["https://x.com/smash"],
      contactPoint: { "@type": "ContactPoint", email: "hello@smash.international" },
    });
    expect(organizationJsonLd(site)).toEqual({ "@context": "https://schema.org", "@type": "Organization", name: "SMASH", url: "https://smash.international/" });
    expect(homeJsonLd(site)).toHaveLength(1);
  });
  it("Service has no price, rating or area fields", () => {
    const s = serviceJsonLd(site, { name: "Performance Marketing", description: "d", path: "/services/performance-marketing" })!;
    expect(serviceJsonLd(site, { name: " ", path: "/services/x" })).toBeNull();
    expect(s).toMatchObject({ "@type": "Service", url: "https://smash.international/services/performance-marketing", provider: { "@type": "Organization", name: "SMASH" } });
    for (const k of ["offers", "aggregateRating", "areaServed", "review"]) expect(s).not.toHaveProperty(k);
  });
  it("Article includes only supported fields", () => {
    expect(articleJsonLd(site, { headline: "H", path: "/insights/h" })).toBeNull(); // fail safe: no publication date, no Article
    expect(articleJsonLd(site, { headline: " ", path: "/insights/h", publishedAt: new Date() })).toBeNull();
    const a = articleJsonLd(site, { headline: "H", path: "/insights/h", publishedAt: new Date("2026-01-01T00:00:00Z") })!;
    expect(a).toMatchObject({ "@type": "Article", headline: "H", datePublished: "2026-01-01T00:00:00.000Z", dateModified: "2026-01-01T00:00:00.000Z", mainEntityOfPage: { "@id": "https://smash.international/insights/h" } });
    for (const k of ["author", "image", "description"]) expect(a).not.toHaveProperty(k);
    expect(articleJsonLd(site, { headline: "H", path: "/insights/h", authorName: "Ann", imageUrl: "/i.png", publishedAt: new Date() })).toMatchObject({ author: { name: "Ann" }, image: "https://smash.international/i.png" });
  });
  it("BreadcrumbList is positional and skipped for a lone Home crumb", () => {
    const b = breadcrumbJsonLd(site, buildBreadcrumbs("/services/x", "X"))!;
    expect((b.itemListElement as { position: number; item?: string }[]).map((i) => [i.position, i.item])).toEqual([[1, "https://smash.international/"], [2, "https://smash.international/services"], [3, "https://smash.international/services/x"]]);
    expect(breadcrumbJsonLd(site, buildBreadcrumbs("/"))).toBeNull();
  });
  it("FAQPage only when FAQs exist", () => {
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ question: "Q?", answer: "A." }])).toMatchObject({ "@type": "FAQPage", mainEntity: [{ name: "Q?", acceptedAnswer: { text: "A." } }] });
    const types = (faqs: { question: string; answer: string }[]) => servicePageJsonLd(site, { name: "N", slug: "n", shortDescription: "d", faqs }).map((x) => x["@type"]);
    expect(types([])).toEqual(["Service", "BreadcrumbList"]);
    expect(types([{ question: "Q", answer: "A" }])).toEqual(["Service", "BreadcrumbList", "FAQPage"]);
    expect(insightPageJsonLd(site, { title: "T", slug: "t", excerpt: "e", publishedAt: new Date() }).map((x) => x["@type"])).toEqual(["Article", "BreadcrumbList"]);
    expect(insightPageJsonLd(site, { title: "T", slug: "t", excerpt: "e" }).map((x) => x["@type"])).toEqual(["BreadcrumbList"]); // no date: no Article
  });
  it("serialises safely for inline scripts", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).not.toContain("</script>");
  });
});

describe("validation warnings", () => {
  it("reports errors and guidance without blocking", () => {
    const issues = validateSeo(site, base({ title: "", seo: undefined }));
    expect(issues.find((i) => i.field === "metaTitle")?.level).toBe("error");
    const w = validateSeo(site, base({ summary: "Too short", seo: { ogImage: { url: "/a.png", alt: "image" }, primarySearchTopic: "social media management", relatedSearchTopics: ["Social Media Management", "x", "X"] } }));
    const fields = w.map((i) => `${i.level}:${i.field}`);
    expect(fields).toEqual(expect.arrayContaining(["warning:metaDescription", "warning:ogImage", "warning:primarySearchTopic", "warning:relatedSearchTopics"]));
    expect(w.filter((i) => i.level === "error")).toHaveLength(0);
  });
  it("accepts an aligned topic and a well-formed page", () => {
    const long = "Performance marketing that ties spend to outcomes your team can measure, with reporting you can act on.";
    const ok = validateSeo(site, base({ summary: long, image: img, seo: { primarySearchTopic: "performance marketing", searchIntent: "commercial" } }));
    expect(ok).toEqual([]);
  });
  it("flags conflicting robots/canonical, draft index, and non-indexable tiers", () => {
    const f = (s: SeoSource, ctx = site) => validateSeo(ctx, s).map((i) => i.field);
    expect(f(base({ seo: { robotsIndex: false, canonicalUrl: "https://smash.international/services/performance-marketing", primarySearchTopic: "performance marketing" } }))).toContain("robots");
    expect(f(base({ status: "draft", seo: { robotsIndex: true } }))).toContain("robotsIndex");
    expect(f(base(), { ...site, allowIndexing: false })).toContain("robots");
  });
});

describe("audit against the database", () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await createTestDb());
  });

  const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "body", ...extra });

  it("audits only published pages, marks noindex, and reports duplicates", async () => {
    const author = await createTeamMember(db, { name: "Ann", role: "r", status: "published" });
    await createService(db, svc("performance-marketing", { status: "published", seo: { metaTitle: "Same title", primarySearchTopic: "performance marketing" } }));
    await createService(db, svc("social-media-management", { status: "published", seo: { metaTitle: "Same title", metaDescription: "Dup", robotsIndex: false } }));
    await createService(db, svc("website-development"));
    await createCaseStudy(db, { title: "C", slug: "acme", summary: "s", challenge: "c", status: "published", seo: { metaDescription: "Dup" } });
    await createInsight(db, { title: "I", slug: "i", excerpt: "e", content: "c", authorId: author.id, status: "published" });
    await saveHomePage(db, { status: "published", seo: HOME_SEO, hero: { heading: "H" } });

    const ctx = await loadSiteSeoContext(db, { siteUrl: "https://smash.international", allowIndexing: true });
    expect(ctx.siteName).toBe("smash.international"); // no settings row: host name, not an invented brand

    const { entries, conflicts } = await auditPublishedSeo(db, ctx);
    const paths = entries.map((e) => e.path).sort();
    expect(paths).toEqual(["/", "/insights/i", "/services/performance-marketing", "/services/social-media-management", "/work/acme"]);
    expect(entries.find((e) => e.path === "/services/social-media-management")!.indexable).toBe(false);
    expect(entries.filter((e) => e.indexable)).toHaveLength(4);
    expect(conflicts.map((c) => `${c.kind}:${c.value}`).sort()).toEqual(["metaDescription:Dup", "metaTitle:Same title | smash.international"]);
  });

  it("detects duplicate canonical overrides", async () => {
    // Inserted directly, bypassing createService's own real-time canonical-conflict
    // guard (Stage 5, Phase 3, assertNoCanonicalConflict) — this test proves the
    // read-side audit still catches a conflict however it got into the database
    // (e.g. data predating the guard), which is a distinct, complementary safeguard.
    const own = "https://smash.international/services/a";
    await createService(db, svc("a", { status: "published" }));
    await insertRow(db, services, { name: "Svc b", slug: "b", shortDescription: "d", status: "published", publishedAt: new Date(), seo: { canonicalUrl: own } }, "Service");
    const ctx = await loadSiteSeoContext(db, { siteUrl: "https://smash.international", allowIndexing: true });
    const { conflicts } = await auditPublishedSeo(db, ctx);
    expect(conflicts.find((c) => c.kind === "canonical")?.paths.sort()).toEqual(["/services/a", "/services/b"]);
  });

  it("uses SiteSettings for defaults, and publishing controls indexability", async () => {
    await saveSiteSettings(db, { siteName: "SMASH", siteDescription: "Site copy", defaultOgImage: img });
    const s = await createService(db, svc("seo-audit", { seo: { robotsIndex: true } }));
    const ctx = await loadSiteSeoContext(db, { siteUrl: "https://smash.international", allowIndexing: true });
    expect(ctx.siteName).toBe("SMASH");
    expect((await auditPublishedSeo(db, ctx)).entries).toHaveLength(0); // draft: not audited or indexable

    await updateService(db, s.id, { status: "published" });
    const pub = await getPublishedServiceBySlug(db, "seo-audit");
    const m = resolveMetadata(ctx, serviceSource(pub));
    expect(m).toMatchObject({ title: "Svc seo-audit | SMASH", description: "d", robots: { index: true, follow: true } });
    expect(m.openGraph.image?.url).toBe("https://smash.international/img/a.png"); // site default OG image
  });

  it("exposes related insights for internal linking, published only", async () => {
    const s = await createService(db, svc("linking", { status: "published" }));
    const c = await createCaseStudy(db, { title: "C", slug: "linked", summary: "s", challenge: "c", status: "published", relatedServiceIds: [s.id] });
    await createInsight(db, { title: "Pub", slug: "pub", excerpt: "e", content: "c", status: "published", relatedServiceIds: [s.id], relatedCaseStudyIds: [c.id] });
    await createInsight(db, { title: "Draft", slug: "draft", excerpt: "e", content: "c", relatedServiceIds: [s.id], relatedCaseStudyIds: [c.id] });
    expect((await getPublishedServiceBySlug(db, "linking")).relatedInsights.map((i) => i.slug)).toEqual(["pub"]);
    expect((await getPublishedCaseStudyBySlug(db, "linked")).relatedInsights.map((i) => i.slug)).toEqual(["pub"]);
  });
});
