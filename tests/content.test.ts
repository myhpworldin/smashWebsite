import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, HOME_SEO } from "./test-db";
import { col, type Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { createService, getPublishedServiceBySlug, listPublishedServices, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy, getPublishedCaseStudyBySlug, updateCaseStudy } from "@/server/modules/work/work.service";
import { createInsight, getPublishedInsightBySlug, listPublishedInsights } from "@/server/modules/insights/insights.service";
import { createTeamMember, listPublishedTeam, updateTeamMember } from "@/server/modules/team/team.service";
import { createClient, listPublishedClients, updateClient } from "@/server/modules/clients/clients.service";
import { createTestimonial, listPublishedTestimonials } from "@/server/modules/testimonials/testimonials.service";
import { createCareer, getPublishedCareerBySlug } from "@/server/modules/careers/careers.service";
import { getSiteSettings, saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { getPublishedHome, saveHomePage } from "@/server/modules/home/home.service";
import { caseStudies, clients } from "@/server/db/schema";
import { whatsAppLink } from "@/lib/whatsapp";
import { DEFAULT_SITE_URL } from "@/lib/site-url";

let db: Db;

beforeEach(async () => {
  ({ db } = await createTestDb());
});

const rejects = async (p: Promise<unknown>, code: string) => {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
};

const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "body", ...extra });
const cs = (slug: string, extra = {}) => ({ title: `Case ${slug}`, slug, summary: "s", challenge: "c", ...extra });

describe("database", () => {
  it("creates the expected collections and indexes", async () => {
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    for (const t of ["services", "case_studies", "insights", "team_members", "testimonials", "clients", "careers", "site_settings", "home_page", "home_services", "home_case_studies", "home_testimonials", "home_insights", "home_team"]) {
      expect(names).toContain(t);
    }
    const idx = async (c: string) => (await col(db, c).indexes()).map((i) => i.name);
    for (const [c, i] of [["services", "services_slug_uidx"], ["case_studies", "case_studies_slug_uidx"], ["insights", "insights_slug_uidx"], ["careers", "careers_slug_uidx"], ["insights", "insights_status_published_idx"]]) {
      expect(await idx(c)).toContain(i);
    }
  });

  it("enforces slug format and publishedAt at the database level", async () => {
    await expect(col(db, "services").insertOne({ name: "a", slug: "Bad Slug", shortDescription: "d" })).rejects.toThrow();
    await expect(col(db, "services").insertOne({ name: "a", slug: "ok", shortDescription: "d", status: "published" })).rejects.toThrow();
  });
});

describe("slugs", () => {
  it("rejects invalid formats before hitting the database", async () => {
    for (const slug of ["Upper", "has space", "-lead", "trail-", "double--dash", ""]) {
      await expect(createService(db, svc(slug))).rejects.toThrow();
    }
  });

  it("prevents duplicates with a CONFLICT error", async () => {
    await createService(db, svc("seo"));
    await rejects(createService(db, svc("seo")), "CONFLICT");
  });

  it("rejects a near-duplicate slug targeting the same topic, on every slugged content type (Stage 5, Phase 2: generalized from Services-only)", async () => {
    await createService(db, svc("performance-marketing"));
    await rejects(createService(db, svc("performance-marketing-services")), "CONFLICT");

    await createCaseStudy(db, cs("acme-corp"));
    await rejects(createCaseStudy(db, cs("acme-corps")), "CONFLICT");
    // Editing a different, unrelated record's slug into a near-duplicate is caught too, not just creation.
    const other = await createCaseStudy(db, cs("other-case"));
    await rejects(updateCaseStudy(db, other.id, { slug: "acme-corps" }), "CONFLICT");

    await createInsight(db, { title: "T", slug: "growth-tip", excerpt: "e", content: "c" });
    await rejects(createInsight(db, { title: "T2", slug: "growth-tips", excerpt: "e", content: "c" }), "CONFLICT");

    await createCareer(db, { title: "Role", slug: "account-manager", summary: "s", description: "d" });
    await rejects(createCareer(db, { title: "Role 2", slug: "account-managers", summary: "s", description: "d" }), "CONFLICT");
  });

  it("does not block editing a record's own unrelated fields, or a genuinely different topic", async () => {
    const s = await createService(db, svc("performance-marketing"));
    await updateService(db, s.id, { shortDescription: "Updated" }); // no slug in the patch at all
    await createService(db, svc("website-development")); // a real, different topic
  });
});

describe("SEO canonical conflicts (Stage 5, Phase 3 §12: real-time, not just the audit report)", () => {
  // This file sets no NEXT_PUBLIC_SITE_URL, so getEnv() resolves the default — a canonical
  // override must be on that same origin or the input schema itself rejects it before
  // assertNoCanonicalConflict ever runs (a real bug caught here: Stage 5 Phase 3's original
  // version of these tests hardcoded https://smash.international, which is not this file's
  // actual site origin, and every one of these tests failed on that mismatch, not on the
  // real logic under test — fixed by asserting against the site's real, resolved origin).
  const on = (path: string) => `${DEFAULT_SITE_URL}${path}`;

  it("blocks publishing a service whose canonical override targets another published page", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await rejects(
      createService(db, svc("a-variant", { status: "published", seo: { canonicalUrl: on("/services/performance-marketing") } })),
      "CONFLICT",
    );
  });

  it("blocks it on update too, and across content types (a case study colliding with a service)", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    const cheeky = await createCaseStudy(db, cs("cheeky"));
    await rejects(
      updateCaseStudy(db, cheeky.id, { status: "published", seo: { canonicalUrl: on("/services/performance-marketing") } }),
      "CONFLICT",
    );
  });

  it("never blocks a page's own default (unoverridden) canonical, or a genuinely distinct override", async () => {
    await createService(db, svc("performance-marketing", { status: "published" }));
    await createService(db, svc("website-development", { status: "published" })); // no override at all
    await createService(db, svc("social-media", { status: "published", seo: { canonicalUrl: on("/services/social-media") } })); // overrides to itself
  });

  it("does not treat editing a published page's own unrelated fields as a self-conflict", async () => {
    const s = await createService(db, svc("performance-marketing", { status: "published", seo: { canonicalUrl: on("/services/performance-marketing") } }));
    await updateService(db, s.id, { shortDescription: "Updated copy" });
  });
});

describe("publishing", () => {
  it("keeps drafts out of public reads and exposes published content", async () => {
    const s = await createService(db, svc("draft-one"));
    expect((await listPublishedServices(db)).items).toHaveLength(0);
    await rejects(getPublishedServiceBySlug(db, "draft-one"), "NOT_FOUND");

    await updateService(db, s.id, { status: "published" });
    const list = (await listPublishedServices(db)).items;
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("status");
    expect((await getPublishedServiceBySlug(db, "draft-one")).publishedAt).toBeInstanceOf(Date);

    await updateService(db, s.id, { status: "draft" });
    await rejects(getPublishedServiceBySlug(db, "draft-one"), "NOT_FOUND");
  });

  it("keeps the first publishedAt across re-publication", async () => {
    const s = await createService(db, svc("stable", { status: "published" }));
    await updateService(db, s.id, { status: "draft" });
    const again = await updateService(db, s.id, { status: "published" });
    expect(again.publishedAt).toEqual(s.publishedAt);
  });

  it("filters other content types the same way", async () => {
    const t = await createTeamMember(db, { name: "A", role: "r" });
    await createClient(db, { name: "C" });
    await createTestimonial(db, { quote: "q", personName: "P" });
    await createCareer(db, { title: "T", slug: "t", summary: "s" });
    await createInsight(db, { title: "I", slug: "i", excerpt: "e", content: "c" });
    expect(await listPublishedTeam(db)).toHaveLength(0);
    expect(await listPublishedClients(db)).toHaveLength(0);
    expect(await listPublishedTestimonials(db)).toHaveLength(0);
    await rejects(getPublishedCareerBySlug(db, "t"), "NOT_FOUND");
    expect((await listPublishedInsights(db)).items).toHaveLength(0);
    await updateTeamMember(db, t.id, { status: "published" });
    expect(await listPublishedTeam(db)).toHaveLength(1);
  });

  it("does not expose the article body in insight lists", async () => {
    await createInsight(db, { title: "I", slug: "i", excerpt: "e", content: "body", status: "published" });
    expect((await listPublishedInsights(db)).items[0]).not.toHaveProperty("content");
    expect((await getPublishedInsightBySlug(db, "i")).content).toBe("body");
  });
});

describe("relationships", () => {
  it("links services and case studies both ways and hides drafts", async () => {
    const pub = await createCaseStudy(db, cs("pub", { status: "published" }));
    const draft = await createCaseStudy(db, cs("draft"));
    await createService(db, svc("a", { status: "published", relatedCaseStudyIds: [pub.id, draft.id] }));
    const s = await getPublishedServiceBySlug(db, "a");
    expect(s.relatedCaseStudies.map((c) => c.slug)).toEqual(["pub"]);

    const s2 = await createService(db, svc("b", { status: "published" }));
    await updateCaseStudy(db, pub.id, { relatedServiceIds: [s2.id] });
    expect((await getPublishedCaseStudyBySlug(db, "pub")).relatedServices.map((x) => x.slug)).toEqual(["b"]);
  });

  it("rejects references to content that does not exist", async () => {
    const ghost = "00000000-0000-4000-8000-000000000000";
    await rejects(createService(db, svc("x", { relatedCaseStudyIds: [ghost] })), "VALIDATION_ERROR");
    await rejects(createCaseStudy(db, cs("y", { clientId: ghost })), "VALIDATION_ERROR");
    await rejects(createInsight(db, { title: "t", slug: "z", excerpt: "e", content: "c", authorId: ghost }), "VALIDATION_ERROR");
  });

  it("only exposes a case study's client, testimonial and insight author when published", async () => {
    const c = await createClient(db, { name: "Hidden" });
    const t = await createTestimonial(db, { quote: "q", personName: "P" });
    const a = await createTeamMember(db, { name: "Auth", role: "r" });
    await createCaseStudy(db, cs("w", { status: "published", clientId: c.id, testimonialId: t.id }));
    await createInsight(db, { title: "I", slug: "i", excerpt: "e", content: "c", status: "published", authorId: a.id });

    let w = await getPublishedCaseStudyBySlug(db, "w");
    expect(w.client).toBeNull();
    expect(w.testimonial).toBeNull();
    expect((await getPublishedInsightBySlug(db, "i")).author).toBeNull();

    await updateClient(db, c.id, { status: "published" });
    await updateTeamMember(db, a.id, { status: "published" });
    w = await getPublishedCaseStudyBySlug(db, "w");
    expect(w.client?.name).toBe("Hidden");
    expect((await getPublishedInsightBySlug(db, "i")).author?.name).toBe("Auth");
  });

  it("a deleted client or case study leaves reads correct (there are no foreign keys to cascade)", async () => {
    const c = await createClient(db, { name: "C", status: "published" });
    const study = await createCaseStudy(db, cs("k", { clientId: c.id, status: "published" }));
    await createService(db, svc("s", { status: "published", relatedCaseStudyIds: [study.id] }));
    await col(db, clients).deleteOne({ _id: c.id as never });
    expect((await getPublishedCaseStudyBySlug(db, "k")).client).toBeNull();
    await col(db, caseStudies).deleteOne({ _id: study.id as never });
    expect((await getPublishedServiceBySlug(db, "s")).relatedCaseStudies).toHaveLength(0);
  });
});

describe("validation", () => {
  it("requires media alt text and a valid url", async () => {
    await expect(createClient(db, { name: "C", logo: { url: "https://x.test/a.png", alt: "" } })).rejects.toThrow();
    await expect(createClient(db, { name: "C", logo: { url: "javascript:alert(1)", alt: "x" } })).rejects.toThrow();
    await createClient(db, { name: "C", logo: { url: "/logo.png", alt: "Logo", width: 10, height: 10 } });
  });

  it("requires a verification source on metrics before publishing", async () => {
    const results = [{ label: "Leads", value: "TBD" }];
    await rejects(createCaseStudy(db, cs("m", { status: "published", results })), "VALIDATION_ERROR");
    const draft = await createCaseStudy(db, cs("m", { results }));
    await rejects(updateCaseStudy(db, draft.id, { status: "published" }), "VALIDATION_ERROR");
    await updateCaseStudy(db, draft.id, { status: "published", results: [{ ...results[0], source: "Client report" }] });
  });

  it("rejects unknown ids on update", async () => {
    await rejects(updateService(db, "00000000-0000-4000-8000-000000000000", { name: "x" }), "NOT_FOUND");
  });

  it("rejects a duplicate FAQ question on a service, case-insensitively, but allows genuinely distinct ones", async () => {
    const dup = [{ question: "How long does onboarding take?", answer: "a" }, { question: "how long does onboarding take?", answer: "b" }];
    await expect(createService(db, svc("faq-dup", { faqs: dup }))).rejects.toThrow();
    const ok = [{ question: "How long does onboarding take?", answer: "a" }, { question: "What does it cost?", answer: "b" }];
    await createService(db, svc("faq-ok", { faqs: ok }));
  });
});

describe("site settings and home", () => {
  it("keeps a single settings row and merges updates", async () => {
    await rejects(getSiteSettings(db), "NOT_FOUND");
    await saveSiteSettings(db, { siteName: "S" });
    await saveSiteSettings(db, { siteDescription: "D" });
    const s = await getSiteSettings(db);
    expect(s).toMatchObject({ siteName: "S", siteDescription: "D" });
    expect(await col(db, "site_settings").countDocuments()).toBe(1);
  });

  it("stores a WhatsApp contact number (Stage 6, Phase 4)", async () => {
    await saveSiteSettings(db, { siteName: "S", contact: { email: "hi@smash.test", whatsapp: "+91 98765 43210" } });
    const s = await getSiteSettings(db);
    expect(s.contact).toMatchObject({ email: "hi@smash.test", whatsapp: "+91 98765 43210" });
  });

  it("references records in order, skips drafts, and hides an unpublished page", async () => {
    const a = await createService(db, svc("a", { status: "published" }));
    const b = await createService(db, svc("b", { status: "published" }));
    const d = await createService(db, svc("d"));
    await saveHomePage(db, { hero: { heading: "H" }, serviceIds: [b.id, d.id, a.id] });
    await rejects(getPublishedHome(db), "NOT_FOUND");

    await saveHomePage(db, { status: "published", seo: HOME_SEO });
    const home = await getPublishedHome(db);
    expect(home.services.map((s) => s.slug)).toEqual(["b", "a"]);
    expect(home.hero?.heading).toBe("H");
    expect(home).not.toHaveProperty("status");
    expect(await col(db, "home_page").countDocuments()).toBe(1);
  });

  it("requires sources on Home metrics before publishing and validates refs", async () => {
    await rejects(saveHomePage(db, { status: "published", seo: HOME_SEO, businessProof: { items: [{ label: "x", value: "y" }] } }), "VALIDATION_ERROR");
    await rejects(saveHomePage(db, { caseStudyIds: ["00000000-0000-4000-8000-000000000000"] }), "VALIDATION_ERROR");
  });
});

describe("development seed", () => {
  it("produces a publishable, fully marked sample Home", async () => {
    const { seedDevelopmentContent } = await import("@/server/db/seed");
    await seedDevelopmentContent(db);
    const home = await getPublishedHome(db);
    expect(home.services).toHaveLength(1);
    expect(JSON.stringify(home)).toContain("[SAMPLE]");
  });
});

describe("WhatsApp click-to-chat link (Stage 6, Phase 4)", () => {
  it("builds a wa.me link with only digits from the stored number, and an encoded pre-filled message", () => {
    const link = whatsAppLink("+91 98765 43210");
    const url = new URL(link);
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/919876543210");
    expect(url.searchParams.get("text")).toBe("Hi SMASH, I'd like to talk about growing my business.");
  });

  it("strips every non-digit character regardless of format", () => {
    expect(new URL(whatsAppLink("(91) 98765-43210")).pathname).toBe("/919876543210");
    expect(new URL(whatsAppLink("091 98765 43210")).pathname).toBe("/0919876543210");
  });
});
