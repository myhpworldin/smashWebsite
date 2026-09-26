/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb, HOME_SEO } from "./test-db";
import type { Db } from "@/server/db/helpers";
import { envSchema } from "@/server/config/env";
import { IMAGE_CACHE_SECONDS, IMAGE_WIDTHS, buildOptimizedUrl, buildSrcSet, extensionOf } from "@/lib/media";
import { altProblem, mediaSchema, mediaUrlProblem, socialImageSchema, videoSchema } from "@/server/validation/media";
import { seoSchema } from "@/server/validation/common";
import { publicizeMedia, toPublicMedia, toPublicVideo } from "@/server/media/public";
import { resolveMetadata, type SiteSeoContext } from "@/server/seo/metadata";
import { GET as service } from "@/app/api/services/[slug]/route";
import { GET as services } from "@/app/api/services/route";
import { GET as work } from "@/app/api/work/[slug]/route";
import { GET as insight } from "@/app/api/insights/[slug]/route";
import { GET as home } from "@/app/api/home/route";
import { GET as testimonials } from "@/app/api/testimonials/route";
import { GET as siteSettings } from "@/app/api/site-settings/route";
import { createService } from "@/server/modules/services/services.service";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createTestimonial } from "@/server/modules/testimonials/testimonials.service";
import { createClient } from "@/server/modules/clients/clients.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";

const img = (over: Record<string, unknown> = {}) => ({ url: "/media/team-workshop-3fa9c2d1.jpg", alt: "SMASH team reviewing a campaign report", width: 2400, height: 1350, ...over });
const problems = (input: unknown) => {
  const r = mediaSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};
const withEnv = (vars: Record<string, string | undefined>, fn: () => void) => {
  const old = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  const apply = (k: string, v: string | undefined) => (v === undefined ? delete process.env[k] : (process.env[k] = v));
  for (const [k, v] of Object.entries(vars)) apply(k, v);
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(old)) apply(k, v);
  }
};

describe("image references", () => {
  it("accepts valid images: root-relative, https, decorative, with optional metadata", () => {
    expect(problems(img())).toEqual([]);
    expect(problems(img({ url: "https://cdn.example.com/a/hero.webp", mimeType: "image/webp", caption: "Team workshop, 2025" }))).toEqual([]);
    expect(problems({ url: "/media/divider.svg", decorative: true })).toEqual([]);
    expect(problems(img({ url: "https://cdn.example.com/render?id=7", mimeType: "image/png" }))).toEqual([]); // no extension, mimeType given
  });

  it("normalises decorative images to an empty alt", () => {
    expect(mediaSchema.parse({ url: "/media/divider.svg", decorative: true, alt: "ignored words" }).alt).toBe("");
  });

  it("requires meaningful alt text and rejects generic, filename-like and keyword-stuffed values", () => {
    expect(problems(img({ alt: "" })).join()).toMatch(/alt/);
    expect(problems(img({ alt: "   " })).join()).toMatch(/alt/);
    for (const alt of ["image", "Photo", "banner", "IMG_1234", "DSC0042", "photo.jpg", "hero-final.PNG", "screenshot"]) expect(problems(img({ alt })).join(), alt).toMatch(/alt/);
    const stuffed = "best digital marketing agency, digital marketing company, digital marketing kochi, digital marketing services, best digital marketing";
    expect(altProblem(stuffed)).toMatch(/keyword/);
    expect(problems(img({ alt: stuffed })).join()).toMatch(/alt/);
    for (const alt of ["SMASH team discussing a digital marketing campaign", "Dashboard showing monthly lead volume", "Acme logo"]) expect(altProblem(alt), alt).toBeNull();
  });

  it("keeps width and height together and within sane bounds", () => {
    expect(problems(img({ height: undefined })).join()).toMatch(/both width and height/);
    expect(problems(img({ width: undefined })).join()).toMatch(/both width and height/);
    for (const bad of [0, -5, 20_000, 10.5]) expect(problems(img({ width: bad })).length, String(bad)).toBeGreaterThan(0);
    expect(problems({ url: "/media/a.jpg", alt: "A team meeting" })).toEqual([]); // both absent is allowed (warned about by the SEO audit)
  });

  it("rejects unsupported and dangerous file types, and mime/extension mismatches", () => {
    for (const url of ["/media/a.php", "/media/a.html", "/media/a.exe", "/media/a.js", "/media/a.svg.php", "/media/a.pdf"]) expect(mediaUrlProblem(url, "image"), url).toMatch(/not a supported image/);
    expect(problems(img({ mimeType: "image/png" })).join()).toMatch(/does not match/); // .jpg vs png
    expect(problems(img({ mimeType: "text/html" })).length).toBeGreaterThan(0);
    expect(problems(img({ url: "/media/noext" })).join()).toMatch(/mimeType is required/);
  });

  it("rejects unsafe URLs: schemes, traversal, protocol-relative, credentials, signed URLs", () => {
    const bad = [
      "javascript:alert(1)", "data:image/png;base64,AAAA", "file:///etc/passwd", "ftp://x.test/a.png", "//evil.example/a.png",
      "/media/../secret.png", "/media/%2e%2e/secret.png", "/media/a%2fb.png", "/media\\a.png", "/media/a b.png", "http://cdn.example.com/a.png",
      "https://user:pass@cdn.example.com/a.png", "https://cdn.example.com/a.png?X-Amz-Signature=abc", "https://cdn.example.com/a.png?token=abc&expires=1",
    ];
    for (const url of bad) expect(mediaUrlProblem(url, "image"), url).not.toBeNull();
    expect(mediaUrlProblem("https://cdn.example.com/a.png?v=3", "image")).toBeNull(); // plain version query is fine
  });

  it("production requires public https media on an approved host", () => {
    withEnv({ APP_ENV: "production", MEDIA_ALLOWED_HOSTS: "cdn.example.com,*.img.example.com" }, () => {
      for (const url of ["/media/a.png", "https://smash.international/a.png", "https://cdn.example.com/a.png", "https://eu.img.example.com/a.png"]) expect(mediaUrlProblem(url, "image"), url).toBeNull();
      expect(mediaUrlProblem("https://evil.example/a.png", "image")).toMatch(/not an approved media host/);
      expect(mediaUrlProblem("https://img.example.com.evil.example/a.png", "image")).toMatch(/not an approved/);
      expect(mediaUrlProblem("https://localhost/a.png", "image")).toMatch(/private/);
      expect(mediaUrlProblem("https://192.168.1.5/a.png", "image")).toMatch(/private/);
      expect(mediaUrlProblem("https://intranet/a.png", "image")).toMatch(/private/);
      expect(mediaUrlProblem("http://localhost:3000/a.png", "image")).toMatch(/https/);
    });
    withEnv({ APP_ENV: "production", MEDIA_ALLOWED_HOSTS: undefined }, () => {
      expect(mediaUrlProblem("https://cdn.example.com/a.png", "image")).toMatch(/not an approved/); // nothing approved yet: own site only
      expect(mediaUrlProblem("/media/a.png", "image")).toBeNull();
    });
    withEnv({ APP_ENV: undefined }, () => {
      expect(mediaUrlProblem("http://localhost:3000/a.png", "image")).toBeNull(); // development convenience
      expect(mediaUrlProblem("https://cdn.example.com/a.png", "image")).toBeNull();
    });
  });

  it("validates MEDIA_ALLOWED_HOSTS as hostnames only", () => {
    expect(envSchema.safeParse({ MEDIA_ALLOWED_HOSTS: "cdn.example.com,*.img.example.com:8443" }).success).toBe(true);
    for (const bad of ["https://cdn.example.com", "cdn.example.com/path", "cdn example.com"]) expect(envSchema.safeParse({ MEDIA_ALLOWED_HOSTS: bad }).success, bad).toBe(false);
  });
});

describe("social (OG/Twitter) images", () => {
  it("accepts raster formats and refuses SVG/AVIF", () => {
    expect(socialImageSchema.safeParse(img({ url: "/media/og.jpg", width: 1200, height: 630 })).success).toBe(true);
    for (const url of ["/media/og.svg", "/media/og.avif"]) expect(socialImageSchema.safeParse(img({ url })).success, url).toBe(false);
    expect(seoSchema.safeParse({ ogImage: img({ url: "/media/og.svg" }) }).success).toBe(false);
    expect(seoSchema.safeParse({ twitterImage: img({ url: "/media/og.png" }) }).success).toBe(true);
  });

  const site = (allowIndexing: boolean): SiteSeoContext => ({ siteUrl: "https://smash.international", siteName: "SMASH", allowIndexing });
  const page = (image: any) => ({ path: "/services/x", status: "published" as const, title: "X", image });

  it("produces absolute public URLs and never leaks a localhost/private/http image on an indexable tier", () => {
    const m = resolveMetadata(site(true), page(img({ url: "/media/og.jpg", width: 1200, height: 630 })));
    expect(m.openGraph.image).toEqual({ url: "https://smash.international/media/og.jpg", alt: "SMASH team reviewing a campaign report", width: 1200, height: 630 });
    for (const url of ["http://localhost:3000/o.png", "https://192.168.0.4/o.png", "http://cdn.example.com/o.png", "https://intranet/o.png"]) {
      expect(resolveMetadata(site(true), page(img({ url }))).openGraph.image, url).toBeUndefined();
    }
    expect(resolveMetadata(site(false), page(img({ url: "http://localhost:3000/o.png" }))).openGraph.image).toBeDefined(); // dev keeps working
  });

  it("falls back to the site default OG image when the content image is unusable", () => {
    const ctx = { ...site(true), defaultOgImage: img({ url: "/media/default-og.png" }) as any };
    expect(resolveMetadata(ctx, page(undefined)).openGraph.image?.url).toBe("https://smash.international/media/default-og.png");
  });
});

describe("video references", () => {
  const video = (over: Record<string, unknown> = {}) => ({ url: "/media/intro-8d1c4be2.mp4", mimeType: "video/mp4", poster: img({ url: "/media/intro-poster.jpg" }), duration: 45, width: 1920, height: 1080, ...over });
  const vp = (input: unknown) => { const r = videoSchema.safeParse(input); return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`); };

  it("accepts a compressed video with a poster", () => {
    expect(vp(video())).toEqual([]);
    expect(vp(video({ url: "https://cdn.example.com/v.webm", mimeType: "video/webm", autoplay: true }))).toEqual([]);
    expect(vp(video({ width: 1080, height: 1920 }))).toEqual([]); // vertical 1080p
  });
  it("requires a poster and a supported, matching type; refuses 4K and over-long clips", () => {
    expect(vp(video({ poster: undefined })).join()).toMatch(/poster/);
    expect(vp(video({ poster: img({ alt: "photo" }) })).join()).toMatch(/alt/);
    expect(vp(video({ mimeType: "video/x-msvideo" })).length).toBeGreaterThan(0);
    expect(vp(video({ mimeType: "video/webm" })).join()).toMatch(/does not match/);
    for (const url of ["/media/v.avi", "/media/v.php", "/media/v.html"]) expect(vp(video({ url })).length, url).toBeGreaterThan(0);
    expect(vp(video({ width: 3840, height: 2160 })).join()).toMatch(/no 4K/);
    expect(vp(video({ duration: 601 })).length).toBeGreaterThan(0);
    expect(vp(video({ height: undefined })).join()).toMatch(/both width and height/);
  });
  it("public video: autoplay is opt-in and always muted; loading follows the hero hint", () => {
    const parsed = videoSchema.parse(video());
    expect(toPublicVideo(parsed)).toMatchObject({ autoplay: false, muted: false, loading: "lazy", poster: { loading: "lazy" } });
    expect(toPublicVideo(videoSchema.parse(video({ autoplay: true })), true)).toMatchObject({ autoplay: true, muted: true, loading: "eager", poster: { loading: "eager" } });
  });
});

describe("responsive delivery", () => {
  it("builds deterministic srcsets from configured widths, never upscaling", () => {
    const set = (width: number | undefined, over: Record<string, unknown> = {}) => buildSrcSet({ url: "/media/a.jpg", width, canOptimize: true, ...over });
    expect(set(2400)).toBe(IMAGE_WIDTHS.map((w) => `${buildOptimizedUrl("/media/a.jpg", w)} ${w}w`).join(", "));
    expect(set(1000)?.match(/\d+w/g)).toEqual(["480w", "960w"]);
    expect(set(2400)).toBe(set(2400)); // deterministic, stable URLs
    expect(set(300)).toBeUndefined(); // too small to help
    expect(set(undefined)).toBeUndefined(); // unknown width
    expect(set(2400, { mimeType: "image/svg+xml" })).toBeUndefined();
    expect(set(2400, { mimeType: "image/gif" })).toBeUndefined();
    expect(set(2400, { canOptimize: false })).toBeUndefined();
    expect(buildOptimizedUrl("/media/a b.jpg", 480)).toBe("/_next/image?url=%2Fmedia%2Fa%20b.jpg&w=480&q=75");
    expect(extensionOf("/x/y.JPG?v=1")).toBe("jpg");
  });

  it("only offers optimization for this site's files and approved media hosts", () => {
    const m = (url: string) => mediaSchema.parse(img({ url }));
    expect(toPublicMedia(m("/media/a.jpg")).srcSet).toBeTruthy();
    expect(toPublicMedia(m("https://cdn.example.com/a.jpg")).srcSet).toBeUndefined();
    withEnv({ MEDIA_ALLOWED_HOSTS: "cdn.example.com,*.img.example.com" }, () => {
      expect(toPublicMedia(m("https://cdn.example.com/a.jpg")).srcSet).toContain("url=https%3A%2F%2Fcdn.example.com%2Fa.jpg");
      expect(toPublicMedia(m("https://eu.img.example.com/a.jpg")).srcSet).toBeTruthy();
      expect(toPublicMedia(m("https://other.example.com/a.jpg")).srcSet).toBeUndefined();
    });
  });

  it("projects a stable public shape with derived format and loading hints", () => {
    const pub = toPublicMedia(mediaSchema.parse(img({ caption: "Workshop" })), true);
    expect(pub).toMatchObject({ url: "/media/team-workshop-3fa9c2d1.jpg", alt: "SMASH team reviewing a campaign report", width: 2400, height: 1350, mimeType: "image/jpeg", format: "jpeg", caption: "Workshop", loading: "eager" });
    expect(Object.keys(pub).sort()).toEqual(["alt", "caption", "format", "height", "loading", "mimeType", "srcSet", "url", "width"]);
    const deco = toPublicMedia(mediaSchema.parse({ url: "/media/d.svg", decorative: true }));
    expect(deco).toMatchObject({ alt: "", decorative: true, loading: "lazy", format: "svg" });
    expect(deco).not.toHaveProperty("width"); // unknown dimensions are omitted, not guessed
  });

  it("configures the optimizer for AVIF/WebP, the shared widths, long caching and hashed-file immutability", async () => {
    vi.resetModules();
    process.env.MEDIA_ALLOWED_HOSTS = "cdn.example.com,*.img.example.com:8443";
    const cfg = (await import("../next.config")).default;
    delete process.env.MEDIA_ALLOWED_HOSTS;
    expect(cfg.images).toMatchObject({ formats: ["image/avif", "image/webp"], deviceSizes: [...IMAGE_WIDTHS], minimumCacheTTL: IMAGE_CACHE_SECONDS, dangerouslyAllowSVG: false });
    expect(cfg.images?.remotePatterns).toEqual([
      { protocol: "https", hostname: "cdn.example.com", port: "" },
      { protocol: "https", hostname: "**.img.example.com", port: "8443" },
    ]);
    const rules = await cfg.headers!();
    const media = rules.filter((r) => r.source.startsWith("/media/"));
    expect(media.map((r) => r.headers[0].value)).toEqual(["public, max-age=86400, stale-while-revalidate=604800", "public, max-age=31536000, immutable"]);
  });
});

describe("public API media contract", () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await createTestDb());
    holder.db = db;
  });
  afterEach(() => vi.restoreAllMocks());

  const call = async (h: (r: Request, c?: any) => Promise<Response>, path: string, slug?: string) => {
    const res = await h(new Request(`http://localhost${path}`), { params: Promise.resolve(slug ? { slug } : {}) });
    return { status: res.status, body: (await res.json()) as any };
  };

  it("projects embedded media everywhere and marks only the hero as eager", async () => {
    const logo = img({ url: "/media/tool-logo.png", alt: "Google Ads logo", width: 200, height: 200 });
    await createService(db, {
      name: "S", slug: "seo-service", shortDescription: "d", description: "body", status: "published",
      hero: { heading: "H", media: img(), video: { url: "/media/v.mp4", mimeType: "video/mp4", poster: img({ url: "/media/p.jpg" }) } },
      tools: [{ name: "Ads", logo }],
      deliverables: [{ title: "T", icon: img({ url: "/media/i.png", alt: "Report icon", width: 64, height: 64 }) }],
    });
    const { body } = await call(service, "/api/services/seo-service", "seo-service");
    const d = body.data;
    expect(d.hero.image).toMatchObject({ loading: "eager", format: "jpeg" });
    expect(d.hero.video).toMatchObject({ loading: "eager", muted: false, autoplay: false, poster: { loading: "eager" } });
    expect(d.tools[0].logo).toMatchObject({ loading: "lazy", alt: "Google Ads logo" });
    expect(d.tools[0].logo).not.toHaveProperty("srcSet"); // 200px wide: no larger variants to offer
    expect(d.deliverables[0].icon.loading).toBe("lazy");
    expect(d.hero.image.srcSet).toContain("/_next/image?url=");
  });

  it("does not project the SEO block (preview metadata stays as generated)", async () => {
    await createService(db, { name: "S", slug: "with-og", shortDescription: "d", description: "b", status: "published", seo: { ogImage: img({ url: "/media/og.jpg", width: 1200, height: 630 }) } });
    const { body } = await call(service, "/api/services/with-og", "with-og");
    expect(body.data.seo.openGraph.image).toEqual({ url: "https://smash.international/media/og.jpg", alt: "SMASH team reviewing a campaign report", width: 1200, height: 630 });
  });

  it("lists, case studies, insights, testimonials, home and settings all use the contract", async () => {
    const photo = img({ url: "/media/avatar.jpg", alt: "Ann Lee, marketing director", width: 800, height: 800 });
    const c = await createClient(db, { name: "Acme", status: "published", logo: img({ url: "/media/acme.png", alt: "Acme logo", width: 400, height: 100 }) });
    await createTestimonial(db, { quote: "q", personName: "Ann", photo, status: "published" });
    await createService(db, { name: "S", slug: "svc", shortDescription: "d", description: "b", status: "published", hero: { heading: "H", media: img() } });
    await createCaseStudy(db, { title: "C", slug: "case", summary: "s", challenge: "c", status: "published", clientId: c.id, heroImage: img(), media: [img({ url: "/media/g1.jpg" }), img({ url: "/media/g2.jpg" })] });
    await createInsight(db, { title: "I", slug: "post", excerpt: "e", content: "b", status: "published", featuredImage: img() });
    await saveSiteSettings(db, { siteName: "SMASH", logo: img({ url: "/media/logo.png", alt: "SMASH logo", width: 300, height: 80 }), favicon: img({ url: "/favicon.png", alt: "SMASH icon", width: 64, height: 64 }) });
    await saveHomePage(db, { status: "published", seo: HOME_SEO, hero: { heading: "H", media: img() }, story: { media: img({ url: "/media/story.jpg" }) } });

    expect((await call(work, "/api/work/case", "case")).body.data).toMatchObject({ heroImage: { loading: "eager" }, media: [{ loading: "lazy" }, { loading: "lazy" }], client: { logo: { loading: "lazy", format: "png" } } });
    expect((await call(insight, "/api/insights/post", "post")).body.data.image.loading).toBe("eager");
    expect((await call(services, "/api/services")).body.data[0].image).toMatchObject({ loading: "lazy", format: "jpeg" });
    expect((await call(testimonials, "/api/testimonials")).body.data[0].photo.loading).toBe("lazy");
    expect((await call(siteSettings, "/api/site-settings")).body.data.logo).toMatchObject({ format: "png", loading: "lazy" });
    const h = (await call(home, "/api/home")).body.data;
    expect(h.hero.image.loading).toBe("eager");
    expect(h.story.image.loading).toBe("lazy");
  });

  it("exposes no filesystem paths, storage internals or credentials in any media response", async () => {
    await createService(db, { name: "S", slug: "safe", shortDescription: "d", description: "b", status: "published", hero: { heading: "H", media: img() } });
    const text = JSON.stringify([(await call(service, "/api/services/safe", "safe")).body, (await call(services, "/api/services")).body]);
    expect(text).not.toMatch(/\/Users\/|[A-Z]:\\\\|file:\/\/|localhost|bucket|s3\.|secret|token|signature|credential/i);
    const keys = new Set<string>();
    const walk = (v: unknown) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } };
    walk(JSON.parse(text));
    expect([...keys].filter((k) => /storage|provider|bucket|path$|filename|originalUrl|fileSize/i.test(k) && k !== "path")).toEqual([]);
  });

  it("writes refuse bad media at the content boundary", async () => {
    const bad = (media: unknown) => createService(db, { name: "S", slug: "bad-media", shortDescription: "d", hero: { heading: "H", media } });
    await expect(bad({ url: "/media/a.php", alt: "A team meeting" })).rejects.toThrow();
    await expect(bad({ url: "/media/a.jpg", alt: "photo" })).rejects.toThrow();
    await expect(bad({ url: "http://cdn.example.com/a.jpg", alt: "A team meeting" })).rejects.toThrow();
    await expect(createClient(db, { name: "C", logo: { url: "/media/../etc/x.png", alt: "Company logo" } })).rejects.toThrow();
  });

  it("publicizeMedia leaves non-media data untouched", () => {
    const input = { cta: { label: "Go", target: "/contact" }, when: new Date("2026-01-01"), n: 3, list: [{ url: "/x", note: "no alt" }] };
    expect(publicizeMedia(input)).toEqual(input);
  });
});
