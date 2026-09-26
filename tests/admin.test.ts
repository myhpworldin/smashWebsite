/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.APP_ENV = "production";
process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/none"; // required outside development; the database client is mocked
const TOKEN = "a".repeat(32);
process.env.ADMIN_API_TOKEN = TOKEN;
// getEnv() caches on first read (env.ts), so the Content Editor token must be present
// from the start, same as ADMIN_API_TOKEN above — setting it later in a test/beforeEach
// would have no effect on the already-cached env.
const EDITOR_TOKEN = "e".repeat(32);
process.env.CMS_EDITOR_API_TOKEN = EDITOR_TOKEN;

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb } from "./test-db";
import type { Db } from "@/server/db/helpers";
import { resetRateLimits } from "@/server/api/rate-limit";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";
import { GET as listServices, POST as createServiceRoute } from "@/app/api/admin/services/route";
import { GET as getService, PATCH as patchService } from "@/app/api/admin/services/[id]/route";
import { POST as createCareerRoute } from "@/app/api/admin/careers/route";
import { GET as getCareer, PATCH as patchCareer } from "@/app/api/admin/careers/[id]/route";
import { POST as createCaseStudyRoute } from "@/app/api/admin/work/route";
import { GET as getSiteSettingsAdmin, PATCH as patchSiteSettingsAdmin } from "@/app/api/admin/site-settings/route";
import { GET as getHomeAdmin, PATCH as patchHomeAdmin } from "@/app/api/admin/home/route";
import { GET as listEnquiries } from "@/app/api/admin/enquiries/route";
import { GET as getEnquiry } from "@/app/api/admin/enquiries/[id]/route";
import { POST as postContact } from "@/app/api/contact/route";
import { GET as services } from "@/app/api/services/route";
import { GET as serviceBySlug } from "@/app/api/services/[slug]/route";
import { GET as careers } from "@/app/api/careers/route";
import insightPreview from "@/app/preview/insights/[slug]/page";
import { createInsight } from "@/server/modules/insights/insights.service";
import { buildSitemap } from "@/server/seo/sitemap";
import type { SiteSeoContext } from "@/server/seo/metadata";

const ORIGIN = "https://smash.international";
const prod: SiteSeoContext = { siteUrl: ORIGIN, siteName: "SMASH", allowIndexing: true };

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  resetRateLimits();
});

type Body = { success: boolean; data?: any; meta?: any; message?: string; error?: { code: string; fields?: any } };
const call = async (
  handler: (r: Request, c?: any) => Promise<Response>,
  path: string,
  opts: { id?: string; token?: string; method?: string; body?: unknown; headers?: Record<string, string> } = {},
) => {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? TOKEN}`;
  const res = await handler(
    new Request(`http://evil.example${path}`, { method: opts.method ?? "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined }),
    { params: Promise.resolve(opts.id === undefined ? {} : { id: opts.id }) },
  );
  return { status: res.status, body: (await res.json()) as Body, res };
};

const validService = { name: "Performance Marketing", slug: "performance-marketing", shortDescription: "Short", description: "Body" };

describe("admin API authentication", () => {
  it("rejects a request with no token, and one with the wrong token", async () => {
    const noToken = await call(listServices, "/api/admin/services", { token: null as any });
    expect(noToken.status).toBe(401);
    expect(noToken.body.error?.code).toBe("UNAUTHORIZED");

    const wrongToken = await call(listServices, "/api/admin/services", { token: "b".repeat(32) });
    expect(wrongToken.status).toBe(401);
  });

  it("accepts the correct token", async () => {
    const ok = await call(listServices, "/api/admin/services");
    expect(ok.status).toBe(200);
  });

  it("500s safely (not 401/open) when ADMIN_API_TOKEN is unset", async () => {
    // getEnv() caches on first read, so proving this needs a fresh module graph — same technique next.config's own env tests use.
    const saved = process.env.ADMIN_API_TOKEN;
    delete process.env.ADMIN_API_TOKEN;
    vi.resetModules();
    try {
      const { GET: freshListServices } = await import("@/app/api/admin/services/route");
      const res = await call(freshListServices, "/api/admin/services");
      expect(res.status).toBe(500);
      expect(res.body.error?.code).toBe("INTERNAL_SERVER_ERROR");
    } finally {
      process.env.ADMIN_API_TOKEN = saved;
      vi.resetModules();
    }
  });

  it("proxy lets every method through to /api/admin/** unchecked (auth happens in the handler, not the proxy)", () => {
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      expect(proxy(new NextRequest("http://localhost/api/admin/services", { method })).status).toBe(200);
    }
  });

  it("rate limits admin requests in their own bucket", async () => {
    for (let i = 0; i < 30; i++) {
      const r = await call(listServices, "/api/admin/services", { headers: { "x-forwarded-for": "5.5.5.5" } });
      expect(r.status, `attempt ${i}`).toBe(200);
    }
    const blocked = await call(listServices, "/api/admin/services", { headers: { "x-forwarded-for": "5.5.5.5" } });
    expect(blocked.status).toBe(429);
  });
});

describe("admin content management", () => {
  it("creates a draft, lists it, reads it by id — none of that is visible on the public API", async () => {
    const created = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: validService });
    expect(created.status).toBe(200);
    expect(created.body.data.status).toBe("draft");
    const id = created.body.data.id;

    const listed = await call(listServices, "/api/admin/services");
    expect(listed.body.data.map((s: any) => s.id)).toContain(id);
    expect(listed.body.meta).toMatchObject({ total: 1 });

    const got = await call(getService, "/api/admin/services/x", { id });
    expect(got.body.data).toMatchObject({ id, slug: "performance-marketing", status: "draft" });

    // Not reachable publicly while a draft.
    const publicRes = await services(new Request("http://evil.example/api/services"));
    expect(publicRes.status).toBe(200);
    expect((await publicRes.json()).data).toEqual([]);
  });

  it("rejects invalid content with field-level detail, and creates nothing", async () => {
    const res = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: { name: "", slug: "Bad Slug!" } });
    expect(res.status).toBe(422);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error?.fields ?? {}).length).toBeGreaterThan(0);
    expect((await call(listServices, "/api/admin/services")).body.meta.total).toBe(0);
  });

  it("rejects a duplicate slug", async () => {
    await call(createServiceRoute, "/api/admin/services", { method: "POST", body: validService });
    const dup = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: { ...validService, name: "Different name" } });
    expect(dup.status).toBe(409);
    expect(dup.body.error?.code).toBe("CONFLICT");
  });

  it("edits an existing record without disturbing its id or slug", async () => {
    const created = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: validService });
    const id = created.body.data.id;
    const edited = await call(patchService, "/api/admin/services/x", { id, method: "PATCH", body: { shortDescription: "Updated short description" } });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ id, slug: "performance-marketing", shortDescription: "Updated short description" });
  });

  it("blocks a relationship to a non-existent record", async () => {
    const res = await call(createCaseStudyRoute, "/api/admin/work", {
      method: "POST",
      body: { title: "Case", slug: "case", summary: "s", challenge: "c", relatedServiceIds: ["00000000-0000-0000-0000-000000000000"] },
    });
    expect(res.status).toBe(422);
  });

  it("publishes valid content, which then appears on the public API and in the sitemap", async () => {
    const created = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: validService });
    const id = created.body.data.id;

    const published = await call(patchService, "/api/admin/services/x", { id, method: "PATCH", body: { status: "published" } });
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe("published");
    expect(published.body.data.publishedAt).toBeTruthy();

    const publicOne = await serviceBySlug(new Request("http://evil.example/api/services/performance-marketing"), { params: Promise.resolve({ slug: "performance-marketing" }) });
    expect(publicOne.status).toBe(200);

    expect((await buildSitemap(db, prod)).map((e) => e.url)).toContain(`${ORIGIN}/services/performance-marketing`);
  });

  it("blocks publishing content that still contains Lorem Ipsum placeholder text", async () => {
    const created = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: { ...validService, description: "Lorem ipsum dolor sit amet." } });
    const id = created.body.data.id;
    const publish = await call(patchService, "/api/admin/services/x", { id, method: "PATCH", body: { status: "published" } });
    expect(publish.status).toBe(422);
    expect(publish.body.error?.fields).toHaveProperty("content");
  });

  it("blocks publishing incomplete content (publish validation), leaving it a draft", async () => {
    const created = await call(createCareerRoute, "/api/admin/careers", { method: "POST", body: { title: "Role", slug: "role", summary: "s" } }); // no description
    const id = created.body.data.id;
    const publish = await call(patchCareer, "/api/admin/careers/x", { id, method: "PATCH", body: { status: "published" } });
    expect(publish.status).toBe(422);
    const stillDraft = await call(getCareer, "/api/admin/careers/x", { id });
    expect(stillDraft.body.data.status).toBe("draft");
  });

  it("unpublishing removes content from the public API and the sitemap", async () => {
    const created = await call(createCareerRoute, "/api/admin/careers", { method: "POST", body: { title: "Role", slug: "role", summary: "s", description: "d" } });
    const id = created.body.data.id;
    await call(patchCareer, "/api/admin/careers/x", { id, method: "PATCH", body: { status: "published" } });
    expect((await buildSitemap(db, prod)).map((e) => e.url)).toContain(`${ORIGIN}/careers/role`);

    await call(patchCareer, "/api/admin/careers/x", { id, method: "PATCH", body: { status: "draft" } });
    expect((await buildSitemap(db, prod)).map((e) => e.url)).not.toContain(`${ORIGIN}/careers/role`);
    const publicList = await (await careers(new Request("http://evil.example/api/careers"))).json();
    expect(publicList.data).toEqual([]);
  });

  it("admin body parsing rejects malformed JSON as a plain 400", async () => {
    const res = await createServiceRoute(new Request("http://evil.example/api/admin/services", { method: "POST", headers: { authorization: `Bearer ${TOKEN}` }, body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });
});

describe("role separation (Stage 5, Phase 1: Content Editor vs Administrator)", () => {
  it("lets an editor create and edit drafts, but not publish them", async () => {
    const created = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: validService, token: EDITOR_TOKEN });
    expect(created.status).toBe(200);
    expect(created.body.data.status).toBe("draft");
    const id = created.body.data.id;

    const edited = await call(patchService, "/api/admin/services/x", { id, method: "PATCH", body: { shortDescription: "Edited by an editor" }, token: EDITOR_TOKEN });
    expect(edited.status).toBe(200);
    expect(edited.body.data.shortDescription).toBe("Edited by an editor");

    const publishAttempt = await call(patchService, "/api/admin/services/x", { id, method: "PATCH", body: { status: "published" }, token: EDITOR_TOKEN });
    expect(publishAttempt.status).toBe(403);
    expect(publishAttempt.body.error?.code).toBe("FORBIDDEN");
    expect((await call(getService, "/api/admin/services/x", { id })).body.data.status).toBe("draft"); // still a draft — the rejected request changed nothing

    // An administrator can publish exactly the same draft an editor created.
    const published = await call(patchService, "/api/admin/services/x", { id, method: "PATCH", body: { status: "published" } });
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe("published");
  });

  it("rejects an editor creating content as already-published", async () => {
    const res = await call(createServiceRoute, "/api/admin/services", { method: "POST", body: { ...validService, status: "published" }, token: EDITOR_TOKEN });
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe("FORBIDDEN");
  });

  it("lets an editor read (but not write) content — reads aren't publish actions", async () => {
    await call(createServiceRoute, "/api/admin/services", { method: "POST", body: validService });
    const listed = await call(listServices, "/api/admin/services", { token: EDITOR_TOKEN });
    expect(listed.status).toBe(200);
  });

  it("blocks an editor from Site Settings entirely, both reading and writing", async () => {
    const read = await call(getSiteSettingsAdmin, "/api/admin/site-settings", { token: EDITOR_TOKEN });
    expect(read.status).toBe(403);
    expect(read.body.error?.code).toBe("FORBIDDEN");

    const write = await call(patchSiteSettingsAdmin, "/api/admin/site-settings", { method: "PATCH", body: { siteName: "New name" }, token: EDITOR_TOKEN });
    expect(write.status).toBe(403);
  });

  it("still lets an administrator use Site Settings", async () => {
    const write = await call(patchSiteSettingsAdmin, "/api/admin/site-settings", { method: "PATCH", body: { siteName: "SMASH" } });
    expect(write.status).toBe(200);
    const read = await call(getSiteSettingsAdmin, "/api/admin/site-settings");
    expect(read.status).toBe(200);
  });

  it("rejects an unrecognized token even when an editor token is configured", async () => {
    const res = await call(listServices, "/api/admin/services", { token: "z".repeat(32) });
    expect(res.status).toBe(401);
  });

  it("env validation: CMS_EDITOR_API_TOKEN requires ADMIN_API_TOKEN, and the two must differ", async () => {
    const { envSchema } = await import("@/server/config/env");
    const base = { APP_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };
    expect(envSchema.safeParse({ ...base, CMS_EDITOR_API_TOKEN: EDITOR_TOKEN }).success).toBe(false); // no ADMIN_API_TOKEN at all
    expect(envSchema.safeParse({ ...base, ADMIN_API_TOKEN: TOKEN, CMS_EDITOR_API_TOKEN: TOKEN }).success).toBe(false); // identical tokens defeat the separation
    expect(envSchema.safeParse({ ...base, ADMIN_API_TOKEN: TOKEN, CMS_EDITOR_API_TOKEN: EDITOR_TOKEN }).success).toBe(true);
  });

  it("leaving CMS_EDITOR_API_TOKEN unset keeps only the Administrator role (Phase 2's original behavior)", async () => {
    delete process.env.CMS_EDITOR_API_TOKEN;
    vi.resetModules();
    try {
      const { POST: freshCreateService } = await import("@/app/api/admin/services/route");
      const res = await call(freshCreateService, "/api/admin/services", { method: "POST", body: validService, token: EDITOR_TOKEN });
      expect(res.status).toBe(401); // that token means nothing without CMS_EDITOR_API_TOKEN configured
    } finally {
      process.env.CMS_EDITOR_API_TOKEN = EDITOR_TOKEN;
      vi.resetModules();
    }
  });
});

describe("website enquiries — admin read-back (Stage 6, Phase 3)", () => {
  const submit = (body: unknown) =>
    postContact(new Request("http://evil.example/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

  it("lets an administrator list and read submitted enquiries, but never create/update/delete them", async () => {
    await submit({ name: "Ada Lovelace", phone: "+91 98765 43210", location: "Mumbai", email: "ada@example.com", message: "Interested in working together." });

    const list = await call(listEnquiries, "/api/admin/enquiries");
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com" });
    const id = list.body.data[0].id;

    const got = await call(getEnquiry, "/api/admin/enquiries/x", { id });
    expect(got.status).toBe(200);
    expect(got.body.data).toMatchObject({ name: "Ada Lovelace" });

    // No write methods exist on this resource at all — it's a read-only view of an immutable submission.
    const routeModule = await import("@/app/api/admin/enquiries/route");
    const idRouteModule = await import("@/app/api/admin/enquiries/[id]/route");
    expect(Object.keys(routeModule).filter((k) => k !== "dynamic")).toEqual(["GET"]);
    expect(Object.keys(idRouteModule).filter((k) => k !== "dynamic")).toEqual(["GET"]);
  });

  it("blocks a Content Editor from enquiries, same as Site Settings — this is visitor personal data, not website content", async () => {
    await submit({ name: "Bob", email: "bob@example.com", message: "A question about pricing." });
    const list = await call(listEnquiries, "/api/admin/enquiries", { token: EDITOR_TOKEN });
    expect(list.status).toBe(403);
  });

  it("rejects an unrecognized token, same as every other admin route", async () => {
    const res = await call(listEnquiries, "/api/admin/enquiries", { token: "z".repeat(32) });
    expect(res.status).toBe(401);
  });
});

describe("draft preview", () => {
  it("renders a draft via a valid token, and refuses (the same way as an unknown page) with a missing or wrong one", async () => {
    await createInsight(db, { title: "Draft Post", slug: "draft-post", excerpt: "e", content: "Body content.", status: "draft" });

    await expect(insightPreview({ params: Promise.resolve({ slug: "draft-post" }), searchParams: Promise.resolve({ token: TOKEN }) })).resolves.toBeTruthy();

    // next/navigation's notFound() throws a special NEXT_HTTP_ERROR_FALLBACK;404-digest error — a real, distinct throw, not a silent pass-through.
    await expect(insightPreview({ params: Promise.resolve({ slug: "draft-post" }), searchParams: Promise.resolve({}) })).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK") });
    await expect(insightPreview({ params: Promise.resolve({ slug: "draft-post" }), searchParams: Promise.resolve({ token: "wrong".repeat(8) }) })).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK") });
  });

  it("also accepts the Content Editor's token — previewing a draft is a read, not a publish action", async () => {
    await createInsight(db, { title: "Editor Draft", slug: "editor-draft", excerpt: "e", content: "Body content.", status: "draft" });
    await expect(insightPreview({ params: Promise.resolve({ slug: "editor-draft" }), searchParams: Promise.resolve({ token: EDITOR_TOKEN }) })).resolves.toBeTruthy();
  });
});

describe("admin Home SEO", () => {
  it("rejects publishing an indexable Home without SEO with a message per missing field, then accepts it and reports readiness", async () => {
    const bad = await call(patchHomeAdmin, "/api/admin/home", { method: "PATCH", body: { hero: { heading: "H" }, status: "published" } });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error!.fields)).toEqual(["seo.metaTitle", "seo.metaDescription"]);
    expect(JSON.stringify(bad.body)).not.toMatch(/mongo|stack|at .*\.ts/i);

    const draft = await call(patchHomeAdmin, "/api/admin/home", { method: "PATCH", body: { hero: { heading: "H" }, status: "draft" } });
    expect(draft.status).toBe(200);
    const read = await call(getHomeAdmin, "/api/admin/home");
    expect(read.body.data.seoReadiness).toMatchObject({ indexable: true, required: [expect.stringContaining("SEO title"), expect.stringContaining("SEO description")] });

    const ok = await call(patchHomeAdmin, "/api/admin/home", { method: "PATCH", body: { status: "published", seo: { metaTitle: "T", metaDescription: "D" } } });
    expect(ok.status).toBe(200);
    expect((await call(getHomeAdmin, "/api/admin/home")).body.data.seoReadiness.required).toEqual([]);
  });
});
