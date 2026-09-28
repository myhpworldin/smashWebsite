/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.APP_ENV = "production";
process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb, HOME_SEO } from "./test-db";
import { col, type Db } from "@/server/db/helpers";
import { homePage } from "@/server/db/schema";
import { seedDevelopmentContent } from "@/server/db/seed";
import { importHomeDesignContent } from "@/server/db/home-design-content";
import { resetRateLimits } from "@/server/api/rate-limit";
import { resolvePublicRoute } from "@/server/seo/resolve";
import { GET as home } from "@/app/api/home/route";
import { GET as service } from "@/app/api/services/[slug]/route";
import { GET as work } from "@/app/api/work/[slug]/route";
import { GET as insight } from "@/app/api/insights/[slug]/route";
import { createService } from "@/server/modules/services/services.service";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createTestimonial } from "@/server/modules/testimonials/testimonials.service";
import { createClient } from "@/server/modules/clients/clients.service";
import { createTeamMember } from "@/server/modules/team/team.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { getHomeSeoReadiness } from "@/server/seo/home-readiness";
import { HOME_SEO as DESIGN_SEO, SITE_IDENTITY } from "@/server/db/home-design-content";

const ORIGIN = "https://smash.international";
let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  resetRateLimits();
});
afterEach(() => vi.restoreAllMocks());

const call = async (h: (r: Request, c?: any) => Promise<Response>, path: string, slug?: string) => {
  const res = await h(new Request(`http://evil.example${path}`), { params: Promise.resolve(slug ? { slug } : {}) });
  return { status: res.status, body: (await res.json()) as any };
};
const getHome = () => call(home, "/api/home");
const item = (n: number) => ({ title: `Item ${n}`, description: `Description ${n}` });
const metric = (label: string) => ({ label, value: "V", source: "internal" });
const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "b", ...extra });
const walk = (v: unknown, fn: (k: string, x: unknown) => void) => {
  if (Array.isArray(v)) v.forEach((x) => walk(x, fn));
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      fn(k, x);
      walk(x, fn);
    }
  }
};
const INTERNAL = ["id", "status", "createdAt", "displayOrder", "clientId", "authorId", "testimonialId", "source", "hero_image", "primarySearchTopic", "relatedSearchTopics", "searchIntent"];

/** Everything the Home page can show, fully populated. */
async function fullHome(extra: Record<string, unknown> = {}) {
  const s1 = await createService(db, svc("performance-marketing", { status: "published", deliverables: [{ title: "Meta Ads" }, { title: "Google Ads", description: "d" }] }));
  const s2 = await createService(db, svc("social-media-management", { status: "published" }));
  const client = await createClient(db, { name: "Acme", status: "published" });
  const c1 = await createCaseStudy(db, { title: "Acme Retail", slug: "acme-retail", summary: "sum", challenge: "c", industry: "Retail", clientId: client.id, results: [{ label: "Leads", value: "V", description: "d", source: "internal report" }], heroImage: { url: "/media/acme.jpg", alt: "Acme dashboard showing lead volume", width: 1600, height: 900 }, status: "published", relatedServiceIds: [s1.id] });
  const t1 = await createTestimonial(db, { quote: "Q", personName: "Ann", personRole: "CMO", companyName: "Acme", status: "published" });
  const author = await createTeamMember(db, { name: "Bob", role: "Editor", status: "published" });
  const i1 = await createInsight(db, { title: "Measuring", slug: "measuring-paid-media", excerpt: "e", content: "c", category: "Analytics", authorId: author.id, status: "published", featuredImage: { url: "/media/m.jpg", alt: "Chart of monthly results", width: 1200, height: 675 } });
  const m1 = await createTeamMember(db, { name: "Cara", role: "Founder", group: "Founders", photo: { url: "/media/cara.jpg", alt: "Portrait of Cara", width: 290, height: 298 }, status: "published" });
  const m2 = await createTeamMember(db, { name: "Dev", role: "Designer", status: "published" });
  await saveSiteSettings(db, { siteName: "SMASH", siteDescription: "Site description" });
  await saveHomePage(db, {
    hero: { label: "Eyebrow", heading: "The one heading", supportingCopy: "Supporting text", ctas: [{ label: "Talk to us", target: "/contact" }, { label: "See services", target: "/services/performance-marketing" }], media: { url: "/media/hero.jpg", alt: "SMASH team reviewing a campaign report", width: 2400, height: 1350 } },
    businessProof: { heading: "Proof", items: [metric("Proof A"), metric("Proof B")] },
    story: { eyebrow: "Story", heading: "Our story", description: "d", points: [item(1), item(2)], media: { url: "/media/story.jpg", alt: "Studio wall with campaign boards" }, cta: { label: "About", target: "/about" } },
    servicesSection: { heading: "Services", cta: { label: "All services", target: "/services" } }, growthEngine: { heading: "Engine", steps: [item(1), item(2), item(3)] },
    selectedWorkSection: { heading: "Work" }, results: { heading: "Results", items: [metric("Result A")] }, whySmash: { heading: "Why", items: [item(1)] },
    testimonialsSection: { heading: "Kind words" }, technology: { heading: "Tech", items: [{ name: "Platform A", url: "https://platform-a.example" }, { name: "Platform B" }] },
    insightsSection: { heading: "Insights" },
    bannerCta: { heading: "Banner", cta: { label: "Go", target: "/contact" }, media: { url: "/media/banner.jpg", alt: "Team at work", width: 1320, height: 496 } },
    industries: { heading: "Sectors", items: [{ name: "Retail" }, { name: "Education" }] },
    ourStory: { heading: "Our story too", lead: "The lead", description: "One.\nTwo.", media: { url: "/media/os.jpg", decorative: true }, cta: { label: "About", target: "/about" } },
    teamSection: { heading: "The team" },
    cta: { eyebrow: "Next", heading: "Start", description: "d", cta: { label: "Contact", target: "/contact" }, secondaryCta: { label: "Book", target: "https://cal.example/smash" } },
    serviceIds: [s2.id, s1.id], caseStudyIds: [c1.id], testimonialIds: [t1.id], insightIds: [i1.id], teamIds: [m2.id, m1.id], status: "published", seo: HOME_SEO, ...extra,
  });
  return { s1, s2, c1, i1 };
}

describe("Home data contract", () => {
  it("has one stable, semantic key per section, always present", async () => {
    await fullHome();
    const { status, body } = await getHome();
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const d = body.data;
    expect(Object.keys(d)).toEqual(["seo", "hero", "businessProof", "story", "services", "growthEngine", "selectedWork", "results", "whySmash", "testimonials", "technology", "insights", "bannerCta", "industries", "ourStory", "team", "cta", "links", "publishedAt", "updatedAt"]);
    expect(Object.keys(d.hero)).toEqual(["eyebrow", "heading", "supportingText", "primaryCta", "secondaryCta", "image", "video"]);
    expect(Object.keys(d.businessProof)).toEqual(["eyebrow", "heading", "description", "cta", "items"]);
    expect(Object.keys(d.businessProof.items[0])).toEqual(["order", "label", "value", "description", "context", "link"]);
    expect(Object.keys(d.story)).toEqual(["eyebrow", "heading", "description", "cta", "supportingPoints", "image", "video"]);
    expect(Object.keys(d.bannerCta)).toEqual(["heading", "description", "image", "primaryCta", "secondaryCta"]);
    expect(Object.keys(d.industries)).toEqual(["eyebrow", "heading", "description", "cta", "items"]);
    expect(Object.keys(d.ourStory)).toEqual(["eyebrow", "heading", "description", "cta", "lead", "image", "video", "supportingPoints"]);
    expect(Object.keys(d.team.items[0])).toEqual(["order", "name", "role", "group", "shortBio", "photo"]);
    expect(Object.keys(d.growthEngine.steps[0])).toEqual(["order", "title", "description", "icon"]);
    expect(Object.keys(d.whySmash)).toEqual(["eyebrow", "heading", "description", "cta", "reasons"]);
    expect(Object.keys(d.technology.items[0])).toEqual(["order", "name", "logo", "description", "url"]);
    expect(Object.keys(d.cta)).toEqual(["eyebrow", "heading", "description", "primaryCta", "secondaryCta"]);
    expect(Object.keys(d.services.items[0])).toEqual(["name", "slug", "path", "shortDescription", "image", "highlights"]);
    expect(Object.keys(d.selectedWork.items[0])).toEqual(["title", "slug", "path", "summary", "industry", "image", "client", "keyResult", "publishedAt"]);
    expect(Object.keys(d.testimonials.items[0])).toEqual(["quote", "personName", "personRole", "companyName", "photo"]);
    expect(Object.keys(d.insights.items[0])).toEqual(["title", "slug", "path", "excerpt", "image", "category", "tags", "author", "publishedAt", "updatedAt"]);
  });

  it("carries the Home-only sections (banner, industries, our story, team) and section CTAs", async () => {
    await fullHome();
    const d = (await getHome()).body.data;
    expect(d.bannerCta).toMatchObject({ heading: "Banner", primaryCta: { target: "/contact" }, image: { alt: "Team at work", width: 1320 }, secondaryCta: null });
    expect(d.industries.items).toEqual([{ order: 1, name: "Retail" }, { order: 2, name: "Education" }]);
    expect(d.ourStory).toMatchObject({ heading: "Our story too", lead: "The lead", description: "One.\nTwo.", cta: { target: "/about" }, image: { alt: "", decorative: true } });
    expect(d.team.heading).toBe("The team");
    expect(d.team.items.map((m: any) => [m.order, m.name, m.group])).toEqual([[1, "Dev", null], [2, "Cara", "Founders"]]); // editor's order
    expect(d.team.items[1].photo).toMatchObject({ alt: "Portrait of Cara", width: 290, height: 298 });
    expect(d.services.cta).toEqual({ label: "All services", target: "/services", external: false });
    expect(d.services.items.find((s: any) => s.slug === "performance-marketing").highlights).toEqual(["Meta Ads", "Google Ads"]);
    expect(d.services.items.find((s: any) => s.slug === "social-media-management").highlights).toEqual([]);
    expect(d.selectedWork.cta).toBeNull();
  });

  it("carries real content for all twelve sections", async () => {
    await fullHome();
    const d = (await getHome()).body.data;
    expect(d.hero).toMatchObject({ heading: "The one heading", eyebrow: "Eyebrow", supportingText: "Supporting text", primaryCta: { label: "Talk to us", target: "/contact", external: false }, secondaryCta: { target: "/services/performance-marketing", external: false }, image: { alt: "SMASH team reviewing a campaign report", width: 2400, height: 1350, loading: "eager" }, video: null });
    expect(d.businessProof.items.map((m: any) => [m.order, m.label])).toEqual([[1, "Proof A"], [2, "Proof B"]]);
    expect(d.story).toMatchObject({ heading: "Our story", supportingPoints: [{ order: 1, title: "Item 1" }, { order: 2 }], cta: { target: "/about" }, image: { loading: "lazy" } });
    expect(d.services.items.map((s: any) => s.slug)).toEqual(["social-media-management", "performance-marketing"]); // editor's order
    expect(d.growthEngine.steps.map((s: any) => s.order)).toEqual([1, 2, 3]);
    expect(d.selectedWork.items[0]).toMatchObject({ title: "Acme Retail", industry: "Retail", client: { name: "Acme" }, image: { alt: "Acme dashboard showing lead volume" }, keyResult: { label: "Leads", value: "V", description: "d" } });
    expect(d.results.items).toHaveLength(1);
    expect(d.whySmash.reasons).toHaveLength(1);
    expect(d.testimonials.items[0]).toMatchObject({ quote: "Q", personName: "Ann", personRole: "CMO", companyName: "Acme" });
    expect(d.technology.items).toMatchObject([{ order: 1, name: "Platform A", url: "https://platform-a.example" }, { order: 2, name: "Platform B", url: null }]);
    expect(d.insights.items[0]).toMatchObject({ title: "Measuring", category: "Analytics", author: { name: "Bob" }, image: { alt: "Chart of monthly results" } });
    expect(d.cta).toMatchObject({ eyebrow: "Next", heading: "Start", primaryCta: { target: "/contact", external: false }, secondaryCta: { target: "https://cal.example/smash", external: true } });
  });

  it("exposes canonical internal destinations and flags which are not built yet", async () => {
    await fullHome();
    const { links } = (await getHome()).body.data;
    // /work, /insights, /about and /contact (Stage 3, Phases 5–7) and /services (Stage 3 Services page) all have page files, so every link is correctly `available: true`.
    expect(links).toEqual({ services: { path: "/services", available: true }, work: { path: "/work", available: true }, insights: { path: "/insights", available: true }, about: { path: "/about", available: true }, contact: { path: "/contact", available: true } });
  });
});

describe("optional and missing content", () => {
  it("404s until published, and a minimal Home (hero only) is a valid 200 with every other section null", async () => {
    expect((await getHome()).status).toBe(404);
    await saveHomePage(db, { hero: { heading: "Only a hero" }, status: "published", seo: HOME_SEO });
    const d = (await getHome()).body.data;
    expect(d.hero).toMatchObject({ heading: "Only a hero", eyebrow: null, supportingText: null, primaryCta: null, secondaryCta: null, image: null, video: null });
    for (const k of ["businessProof", "story", "services", "growthEngine", "selectedWork", "results", "whySmash", "testimonials", "technology", "insights", "bannerCta", "industries", "ourStory", "team", "cta"]) expect(d[k], k).toBeNull();
    expect(d.seo.canonical).toBe(`${ORIGIN}/`);
  });

  it("nulls a referenced section whose items are all unpublished, even if it has a heading", async () => {
    const draft = await createService(db, svc("draft-service"));
    await saveHomePage(db, { hero: { heading: "H" }, servicesSection: { heading: "Services" }, serviceIds: [draft.id], status: "published", seo: HOME_SEO });
    expect((await getHome()).body.data.services).toBeNull();
  });

  it("cannot publish Home without a hero heading", async () => {
    await expect(saveHomePage(db, { status: "published", seo: HOME_SEO })).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { hero: expect.any(String) } });
  });

  it("does not let invalid stored section content corrupt the response", async () => {
    await fullHome();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await col(db, homePage).updateOne({ _id: "default" }, { $set: { hero: { heading: 123 }, technology: { items: "nope" }, cta: { heading: "x" } } });
    const { status, body } = await getHome();
    expect(status).toBe(200);
    expect([body.data.hero, body.data.technology, body.data.cta]).toEqual([null, null, null]);
    expect(body.data.story.heading).toBe("Our story"); // untouched sections survive
    expect(body.data.services.items).toHaveLength(2);
    const logged = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("Home section ignored");
    expect(logged).toContain('"section":"hero"');
    expect(logged).not.toContain("123"); // section names and field paths only, never content
  });
});

describe("published content only, in editor order", () => {
  it("skips draft services, case studies, testimonials and insights and leaks none of their content", async () => {
    const { s1, c1, i1 } = await fullHome();
    const dsvc = await createService(db, svc("secret-draft-service", { name: "SECRET DRAFT SERVICE" }));
    const dcs = await createCaseStudy(db, { title: "SECRET DRAFT CASE", slug: "secret-draft-case", summary: "s", challenge: "c" });
    const dt = await createTestimonial(db, { quote: "SECRET DRAFT QUOTE", personName: "P" });
    const di = await createInsight(db, { title: "SECRET DRAFT POST", slug: "secret-draft-post", excerpt: "e", content: "c" });
    const dm = await createTeamMember(db, { name: "SECRET DRAFT PERSON", role: "R" });
    await saveHomePage(db, { serviceIds: [dsvc.id, s1.id], caseStudyIds: [dcs.id, c1.id], testimonialIds: [dt.id], insightIds: [di.id, i1.id], teamIds: [dm.id] });
    const { body } = await getHome();
    expect(JSON.stringify(body)).not.toMatch(/SECRET DRAFT|secret-draft/);
    expect(body.data.services.items.map((s: any) => s.slug)).toEqual(["performance-marketing"]);
    expect(body.data.testimonials).toBeNull(); // only a draft was referenced
    expect(body.data.insights.items.map((i: any) => i.slug)).toEqual(["measuring-paid-media"]);
    expect(body.data.team).toBeNull(); // only a draft member was referenced
  });

  it("stops showing a service the moment it is unpublished", async () => {
    const { s2 } = await fullHome();
    const { updateService } = await import("@/server/modules/services/services.service");
    await updateService(db, s2.id, { status: "draft" });
    expect((await getHome()).body.data.services.items.map((s: any) => s.slug)).toEqual(["performance-marketing"]);
  });
});

describe("canonical links and slugs", () => {
  it("every Home card links to the same canonical, resolvable, slug-based URL as its own page", async () => {
    await fullHome();
    const d = (await getHome()).body.data;
    const cards: [string, any[], (slug: string) => string, typeof service][] = [
      ["services", d.services.items, (s) => `/services/${s}`, service],
      ["work", d.selectedWork.items, (s) => `/work/${s}`, work],
      ["insights", d.insights.items, (s) => `/insights/${s}`, insight],
    ];
    const seen = new Set<string>();
    for (const [name, items, path, detail] of cards) {
      expect(items.length, name).toBeGreaterThan(0);
      for (const c of items) {
        expect(c.path, name).toBe(path(c.slug));
        expect(seen.has(c.path), `duplicate ${c.path}`).toBe(false);
        seen.add(c.path);
        expect((await resolvePublicRoute(db, c.path)).kind, c.path).toBe("content");
        const kind = name === "services" ? "services" : name === "work" ? "work" : "insights";
        const res = await call(detail, `/api/${kind}/${c.slug}`, c.slug);
        expect(res.body.data.path).toBe(c.path); // Home and the page agree: no Home-specific URL
        expect(res.body.data.seo.canonical).toBe(`${ORIGIN}${c.path}`);
      }
    }
  });

  it("contains no database ids, query-style URLs or internal fields anywhere", async () => {
    await fullHome();
    const { body } = await getHome();
    expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const leaked = new Set<string>();
    const paths: string[] = [];
    walk(body, (k, x) => { if (INTERNAL.includes(k)) leaked.add(k); if ((k === "path" || k === "target") && typeof x === "string" && x.startsWith("/")) paths.push(x); });
    expect([...leaked]).toEqual([]);
    for (const p of paths) expect(p, p).not.toMatch(/[?#]|\/[0-9]+$|\/(service|service-details)\//);
    expect(paths.length).toBeGreaterThan(6);
  });

  it("never returns secrets or configuration", async () => {
    await fullHome();
    expect(JSON.stringify((await getHome()).body)).not.toMatch(/MONGODB_URI|CMS_API|password|secret|token|mongodb:/i);
  });
});

describe("Home SEO", () => {
  it("has one canonical origin URL, Open Graph data with the hero image and alt, and index/follow", async () => {
    await fullHome({ seo: { metaTitle: "SMASH: digital marketing partner", metaDescription: "What SMASH does and who it does it for.", primarySearchTopic: "digital marketing agency" } });
    const { seo } = (await getHome()).body.data;
    expect(seo.canonical).toBe(`${ORIGIN}/`);
    expect(seo.title).toBe("SMASH: digital marketing partner");
    expect(seo.description).toBe("What SMASH does and who it does it for.");
    expect(seo.robots).toEqual({ index: true, follow: true });
    expect(seo.openGraph).toMatchObject({ title: "SMASH: digital marketing partner", url: `${ORIGIN}/`, type: "website", image: { url: `${ORIGIN}/media/hero.jpg`, alt: "SMASH team reviewing a campaign report", width: 2400, height: 1350 } });
    expect(seo.twitter.card).toBe("summary_large_image");
    expect(JSON.stringify(seo)).not.toContain("primarySearchTopic"); // editorial notes stay internal
  });

  it("is unaffected by query or tracking parameters, and by a spoofed host", async () => {
    await fullHome();
    const a = (await getHome()).body.data.seo.canonical;
    const res = await home(new Request("http://evil.example/api/home?utm_source=x&ref=y", { headers: { host: "evil.example", "x-forwarded-host": "evil.example" } }), { params: Promise.resolve({}) });
    expect(((await res.json()) as any).data.seo.canonical).toBe(a);
    expect(a).toBe(`${ORIGIN}/`);
  });

  it("falls back to the site defaults when Home has no SEO of its own", async () => {
    await saveSiteSettings(db, { siteName: "SMASH", siteDescription: "Site default description", defaultSeo: { metaTitle: "SMASH" } });
    // A Home that opts out of indexing needs no SEO of its own; it then shows the site-wide defaults.
    await saveHomePage(db, { hero: { heading: "H" }, status: "published", seo: { robotsIndex: false } });
    expect((await getHome()).body.data.seo).toMatchObject({ title: "SMASH", description: "Site default description", canonical: `${ORIGIN}/`, robots: { index: false } });
  });
});

describe("call-to-action validation", () => {
  const hero = (target: string) => ({ heading: "H", ctas: [{ label: "Go", target }] });
  it("accepts canonical internal routes and https URLs", async () => {
    for (const t of ["/contact", "/about", "/services", "/services/performance-marketing", "/work/acme-retail", "/insights/measuring-paid-media", "https://cal.example/book"]) {
      await saveHomePage(db, { hero: hero(t) });
    }
  });
  it("rejects http, other schemes, unknown/query/id/uppercase paths, and credentials", async () => {
    for (const t of ["http://cal.example/book", "javascript:alert(1)", "mailto:a@b.co", "//evil.example", "/nope", "/service/123", "/services?id=123", "/services/", "/Contact", "/contact#form", "/services/123", "/services/about", "https://user:pw@cal.example/x", "not a url"]) {
      await expect(saveHomePage(db, { hero: hero(t) }), t).rejects.toThrow();
    }
  });
  it("allows at most a primary and a secondary hero action", async () => {
    const ctas = [1, 2, 3].map((n) => ({ label: `A${n}`, target: "/contact" }));
    await expect(saveHomePage(db, { hero: { heading: "H", ctas } })).rejects.toThrow();
    await expect(saveHomePage(db, { technology: { items: [{ name: "P", url: "http://insecure.example" }] } })).rejects.toThrow();
  });
});

describe("efficiency", () => {
  it("uses a fixed, small number of queries however many items are referenced", async () => {
    const count = async (n: number) => {
      const queries: string[] = [];
      const t = await createTestDb((q) => queries.push(q));
      holder.db = t.db;
      const ids = { s: [] as string[], c: [] as string[], t: [] as string[], i: [] as string[] };
      for (let k = 0; k < n; k++) {
        ids.s.push((await createService(t.db, svc(`svc-${n}-${k}`, { status: "published" }))).id);
        ids.c.push((await createCaseStudy(t.db, { title: `C${k}`, slug: `case-${n}-${k}`, summary: "s", challenge: "c", status: "published" })).id);
        ids.t.push((await createTestimonial(t.db, { quote: "q", personName: "P", status: "published" })).id);
        ids.i.push((await createInsight(t.db, { title: `I${k}`, slug: `post-${n}-${k}`, excerpt: "e", content: "c", status: "published" })).id);
      }
      await saveHomePage(t.db, { hero: { heading: "H" }, status: "published", seo: HOME_SEO, serviceIds: ids.s, caseStudyIds: ids.c, testimonialIds: ids.t, insightIds: ids.i });
      queries.length = 0;
      expect((await getHome()).status).toBe(200);
      return queries.length;
    };
    const small = await count(1);
    expect(await count(8)).toBe(small);
    expect(small).toBeLessThanOrEqual(7); // home row + 5 reference joins + site settings
  });
});

describe("development sample content", () => {
  it("fills every Home section with clearly marked placeholders and no invented claims", async () => {
    await seedDevelopmentContent(db);
    const d = (await getHome()).body.data;
    for (const k of ["hero", "businessProof", "story", "services", "growthEngine", "selectedWork", "results", "whySmash", "testimonials", "technology", "insights", "bannerCta", "industries", "ourStory", "team", "cta"]) expect(d[k], k).not.toBeNull();
    const texts: string[] = [];
    walk(d, (k, x) => { if (typeof x === "string" && !["path", "target", "slug", "url", "canonical", "publishedAt", "updatedAt", "loading", "format", "type", "card", "siteName", "publishedTime", "modifiedTime", "alt", "mimeType"].includes(k) && !x.startsWith("/") && !x.startsWith("http")) texts.push(x); });
    expect(texts.filter((t) => !t.startsWith("[SAMPLE]") && !/^(\[SAMPLE\]|SAMPLE)/.test(t) && !t.includes("[SAMPLE]") && !/^\d{4}-/.test(t))).toEqual([]);
    for (const m of [...d.businessProof.items, ...d.results.items]) expect(m.value).toBe("[SAMPLE]");
  });
});

describe("Figma design import", () => {
  it("loads the approved homepage copy so every rendered section has content, and never overwrites an existing Home", async () => {
    await importHomeDesignContent(db);
    const d = (await getHome()).body.data;
    for (const k of ["hero", "businessProof", "bannerCta", "story", "services", "growthEngine", "selectedWork", "industries", "ourStory", "team", "cta", "whySmash"]) expect(d[k], k).not.toBeNull();
    expect(d.hero.heading).toBe("We Built Business Before we built an agency");
    expect(d.whySmash.reasons).toHaveLength(3);
    expect(d.businessProof.items).toHaveLength(3);
    expect(d.services.items.map((s: any) => s.slug)).toEqual(["growth", "social-and-creative", "technology", "customer-engagement"]);
    expect(d.services.items.every((s: any) => s.highlights.length >= 4)).toBe(true);
    expect(d.selectedWork.items.map((c: any) => c.path)).toEqual(["/work/core", "/work/mobile-garage"]);
    expect(d.industries.items).toHaveLength(10);
    expect(d.growthEngine.steps).toHaveLength(6);
    expect(d.team.items.map((m: any) => m.group)).toEqual([...Array(3).fill("Founders & Partners"), ...Array(4).fill("Team Members")]);
    expect(JSON.stringify(d)).not.toContain("Approved Figma homepage design"); // the verification note is internal
    await expect(importHomeDesignContent(db)).rejects.toThrow(/already exists/);
  });

  it("rejects a Home that references an unknown team member", async () => {
    await expect(saveHomePage(db, { hero: { heading: "H" }, teamIds: ["00000000-0000-4000-8000-000000000000"] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("Home SEO publishing rules", () => {
  const publish = (seo?: Record<string, unknown>) => saveHomePage(db, { hero: { heading: "H" }, status: "published", ...(seo ? { seo } : {}) });
  const missing = async (seo?: Record<string, unknown>) => {
    try {
      await publish(seo);
    } catch (err: any) {
      return Object.keys(err.fields ?? {}).sort();
    }
    return [];
  };

  it("publishes an indexable Home that has its own SEO title and description", async () => {
    await publish(HOME_SEO);
    expect((await getHome()).status).toBe(200);
  });

  it("rejects an indexable Home missing the title, the description, or both, naming each field", async () => {
    expect(await missing()).toEqual(["seo.metaDescription", "seo.metaTitle"]);
    expect(await missing({ metaDescription: "d" })).toEqual(["seo.metaTitle"]);
    expect(await missing({ metaTitle: "t" })).toEqual(["seo.metaDescription"]);
    await expect(publish({ metaTitle: "   ", metaDescription: "d" })).rejects.toBeTruthy(); // a blank title is refused by the schema itself
    await expect(publish({ metaDescription: "d" })).rejects.toMatchObject({ fields: { "seo.metaTitle": "SEO title is required to publish an indexable Home page." } });
    expect((await getHome()).status).toBe(404); // nothing was published
  });

  it("does not use the site-wide default in place of the Home's own SEO when publishing", async () => {
    await saveSiteSettings(db, { siteName: "SMASH", siteDescription: "Site description", defaultSeo: { metaTitle: "Default", metaDescription: "Default description" } });
    expect(await missing()).toEqual(["seo.metaDescription", "seo.metaTitle"]);
  });

  it("does not block a Home that is marked not to be indexed, and drafts are never blocked", async () => {
    expect(await missing({ robotsIndex: false })).toEqual([]);
    await saveHomePage(db, { hero: { heading: "H" }, seo: { metaTitle: "only a title" }, status: "draft" });
    expect(await getHomeSeoReadiness(db)).toMatchObject({ indexable: true, required: ["SEO description is required to publish an indexable Home page."] });
  });

  it("accepts the Home URL as an explicit canonical (query string ignored) and refuses another page or another site", async () => {
    expect(await missing({ ...HOME_SEO, canonicalUrl: `${ORIGIN}/` })).toEqual([]);
    await saveHomePage(db, { seo: { ...HOME_SEO, canonicalUrl: `${ORIGIN}/?utm_source=x&ref=y` } });
    expect((await getHome()).body.data.seo.canonical).toBe(`${ORIGIN}/`);
    expect(await missing({ ...HOME_SEO, canonicalUrl: `${ORIGIN}/services/performance-marketing` })).toEqual(["seo.canonicalUrl"]);
    await expect(saveHomePage(db, { seo: { ...HOME_SEO, canonicalUrl: "https://evil.example/" } })).rejects.toBeTruthy(); // off-site: refused by the schema
  });

  it("renders the Home SEO into the generated metadata: title, description, canonical, Open Graph and Twitter", async () => {
    await saveSiteSettings(db, SITE_IDENTITY);
    await saveHomePage(db, { hero: { heading: "H", media: { url: "/media/main-banner.png", alt: "", decorative: true, width: 2880, height: 1768 } }, status: "published", seo: DESIGN_SEO });
    const { seo } = (await getHome()).body.data;
    expect(seo.title).toBe(DESIGN_SEO.metaTitle);
    expect(seo.description).toBe(DESIGN_SEO.metaDescription);
    expect(seo.canonical).toBe(`${ORIGIN}/`);
    expect(seo.robots).toEqual({ index: true, follow: true });
    expect(seo.openGraph).toMatchObject({ title: DESIGN_SEO.metaTitle, description: DESIGN_SEO.metaDescription, url: `${ORIGIN}/`, siteName: "SMASH International", image: { url: `${ORIGIN}/media/main-banner.png` } });
    expect(seo.twitter).toMatchObject({ card: "summary_large_image", title: DESIGN_SEO.metaTitle, description: DESIGN_SEO.metaDescription });
    expect(JSON.stringify(seo)).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it("keeps the approved SEO copy free of unsupported claims and within search-result lengths", () => {
    expect(DESIGN_SEO.metaTitle.length).toBeLessThanOrEqual(65);
    expect(DESIGN_SEO.metaDescription.length).toBeGreaterThanOrEqual(70);
    expect(DESIGN_SEO.metaDescription.length).toBeLessThanOrEqual(160);
    expect(`${DESIGN_SEO.metaTitle} ${DESIGN_SEO.metaDescription}`).not.toMatch(/\b(best|top|leading|no\.? ?1|number one|award|rated|guarantee|\d)/i);
    expect(DESIGN_SEO.metaTitle).toContain(SITE_IDENTITY.siteName); // the Home title is not suffixed with the site name
  });

  it("reports what the Home SEO still lacks, without blocking", async () => {
    await publish(HOME_SEO);
    const r = await getHomeSeoReadiness(db);
    expect(r.required).toEqual([]);
    expect(r.recommended.join(" ")).toMatch(/Site Settings are not saved/);
    expect(r.recommended.join(" ")).toMatch(/No social preview image/);
    await saveSiteSettings(db, { siteName: "SMASH", siteDescription: "d" });
    await saveHomePage(db, { hero: { heading: "H", media: { url: "/media/h.jpg", alt: "Alt text", width: 100, height: 100 } }, seo: { ...HOME_SEO, metaTitle: "x".repeat(80) } });
    const after = (await getHomeSeoReadiness(db)).recommended.join(" ");
    expect(after).not.toMatch(/Site Settings|social preview/);
    expect(after).toMatch(/80 characters/);
  });

  it("imports the Home SEO and the site identity, and never overwrites Site Settings an editor already saved", async () => {
    await saveSiteSettings(db, { siteName: "Editor Chosen Name" });
    await importHomeDesignContent(db);
    const { getSiteSettings } = await import("@/server/modules/site-settings/site-settings.service");
    expect((await getSiteSettings(db)).siteName).toBe("Editor Chosen Name");
    expect((await getHome()).body.data.seo.title).toBe(DESIGN_SEO.metaTitle);
  });

  it("a fresh import fills the site identity", async () => {
    await importHomeDesignContent(db);
    const { getSiteSettings } = await import("@/server/modules/site-settings/site-settings.service");
    expect(await getSiteSettings(db)).toMatchObject(SITE_IDENTITY);
    expect((await getHome()).body.data.seo.openGraph.siteName).toBe("SMASH International");
  });
});
