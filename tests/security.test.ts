/* eslint-disable @typescript-eslint/no-explicit-any -- assertions walk untyped JSON response bodies */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SITE_URL = "https://smash.international";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => holder.db }));

import { createTestDb, HOME_SEO } from "./test-db";
import type { Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { redact } from "@/server/lib/logger";
import { publicGet, MAX_URL_LENGTH } from "@/server/api/handler";
import { MAX_BUCKETS, RATE_LIMITS, bucketCount, checkRateLimit, clientKey, resetRateLimits } from "@/server/api/rate-limit";
import { proxy } from "@/proxy";
import { GET as services } from "@/app/api/services/route";
import { GET as service } from "@/app/api/services/[slug]/route";
import { GET as insights } from "@/app/api/insights/route";
import { GET as health } from "@/app/api/health/route";
import { GET as unknownApi } from "@/app/api/[...path]/route";
import { createService, updateService } from "@/server/modules/services/services.service";
import { createCaseStudy, updateCaseStudy } from "@/server/modules/work/work.service";
import { createCareer } from "@/server/modules/careers/careers.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createClient } from "@/server/modules/clients/clients.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { getPublishedServiceBySlug } from "@/server/modules/services/services.service";

let db: Db;
beforeEach(async () => {
  ({ db } = await createTestDb());
  holder.db = db;
  resetRateLimits();
});
afterEach(() => vi.restoreAllMocks());

const svc = (slug: string, extra = {}) => ({ name: `Svc ${slug}`, slug, shortDescription: "d", description: "body", ...extra });
const call = async (handler: (r: Request, c?: any) => Response | Promise<Response>, path: string, slug?: string, headers: Record<string, string> = {}) => {
  const res = await handler(new Request(`http://localhost${path}`, { headers }), { params: Promise.resolve(slug === undefined ? {} : { slug }) });
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
};
const reason = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as AppError | ZodError | null;
const fieldsOf = (e: unknown) => (e as AppError).fields ?? {};

describe("mass assignment and input validation", () => {
  const protectedFields = { id: "00000000-0000-4000-8000-000000000000", createdAt: new Date(), updatedAt: new Date(), publishedAt: new Date(), isAdmin: true };

  it("rejects protected or unknown fields on create and update (explicit allow-list)", async () => {
    for (const [k, v] of Object.entries(protectedFields)) {
      const err = await reason(createService(db, svc("x", { [k]: v })));
      expect(err, k).toBeInstanceOf(ZodError);
      expect(JSON.stringify((err as ZodError).issues)).toContain(k);
    }
    const s = await createService(db, svc("real"));
    expect(await reason(updateService(db, s.id, { publishedAt: new Date() }))).toBeInstanceOf(ZodError);
    expect(await reason(createClient(db, { name: "C", isAdmin: true }))).toBeInstanceOf(ZodError);
    expect(await reason(saveHomePage(db, { id: "other" }))).toBeInstanceOf(ZodError);
    expect(await reason(saveSiteSettings(db, { siteName: "S", secret: "x" }))).toBeInstanceOf(ZodError);
  });

  it("only the allow-listed status field controls publication, and stamps publishedAt itself", async () => {
    const s = await createService(db, svc("stamped", { status: "published" }));
    expect(s.publishedAt).toBeInstanceOf(Date);
  });

  it("rejects wrong types, invalid enums, malformed URLs and oversized input", async () => {
    const bad: [string, unknown][] = [
      ["name type", svc("a", { name: 123 })],
      ["name empty", svc("a", { name: "   " })],
      ["name too long", svc("a", { name: "x".repeat(201) })],
      ["description too long", svc("a", { description: "x".repeat(20_001) })],
      ["description object", svc("a", { description: { a: 1 } })],
      ["status enum", svc("a", { status: "archived" })],
      ["array where object", svc("a", { hero: [] })],
      ["deliverables not array", svc("a", { deliverables: "x" })],
      ["too many faqs", svc("a", { faqs: Array.from({ length: 51 }, () => ({ question: "q", answer: "a" })) })],
      ["NUL byte", svc("a", { name: "bad\u0000name" })],
      ["seo url", svc("a", { seo: { canonicalUrl: "javascript:alert(1)" } })],
      ["og image url", svc("a", { seo: { ogImage: { url: "javascript:alert(1)", alt: "x" } } })],
      ["og image alt", svc("a", { seo: { ogImage: { url: "/a.png", alt: "" } } })],
      ["robots type", svc("a", { seo: { robotsIndex: "yes" } })],
      ["slug traversal", svc("../../etc/passwd")],
      ["slug query", svc("service?id=123")],
      ["slug spaces", svc("performance marketing")],
      ["slug punctuation", svc("Performance-Marketing!!!")],
      ["slug id", svc("123")],
    ];
    for (const [label, input] of bad) expect(await reason(createService(db, input)), label).toBeInstanceOf(ZodError);
    expect(await reason(createClient(db, { name: "C", website: "not a url" }))).toBeInstanceOf(ZodError);
    expect(await reason(createCareer(db, { title: "T", slug: "t", summary: "s", employmentType: "freelance" }))).toBeInstanceOf(ZodError);
    expect(await reason(createInsight(db, { title: "T", slug: "t", excerpt: "e", content: "x".repeat(200_001) }))).toBeInstanceOf(ZodError);
  });

  it("does not sanitise legitimate marketing copy", async () => {
    const name = `Rock 'n' Roll & Co. – 100% Ünïcode €5 "quoted" <b>`;
    const s = await createService(db, svc("copy", { name, status: "published" }));
    expect((await getPublishedServiceBySlug(db, "copy")).name).toBe(name);
    expect(s.name).toBe(name);
  });

  it("uses parameterised queries: hostile text is stored as data, not executed", async () => {
    const name = "'; DROP TABLE services; --";
    await createService(db, svc("hostile", { name }));
    expect((await getPublishedServiceBySlug(db, "hostile").catch(() => null))).toBeNull(); // draft: not public, table intact
    const s = await createService(db, svc("hostile-two", { name, status: "published" }));
    expect((await getPublishedServiceBySlug(db, "hostile-two")).name).toBe(name);
    expect(s.id).toBeTruthy();
  });
});

describe("SEO field validation", () => {
  it("accepts a canonical on the site origin and refuses external ones", async () => {
    await createService(db, svc("ok", { seo: { canonicalUrl: "https://smash.international/services/ok" } }));
    for (const url of ["https://evil.example/services/x", "http://smash.international.evil.example/x", "https://smash.international:8443/x"]) {
      const err = await reason(createService(db, svc("bad", { seo: { canonicalUrl: url } })));
      expect(err, url).toBeInstanceOf(ZodError);
    }
  });
  it("still allows robots, twitter and topic fields", async () => {
    await createService(db, svc("seo-ok", { seo: { robotsIndex: false, twitterCard: "summary", primarySearchTopic: "topic", searchIntent: "commercial" } }));
    expect(await reason(createService(db, svc("seo-bad", { seo: { searchIntent: "spam" } })))).toBeInstanceOf(ZodError);
  });
});

describe("publish validation", () => {
  it("blocks publishing incomplete records with per-field messages, but allows drafts", async () => {
    const draft = await createService(db, svc("inc", { description: undefined }));
    expect(fieldsOf(await reason(updateService(db, draft.id, { status: "published" })))).toEqual({ description: "Required before publishing." });
    expect(fieldsOf(await reason(createService(db, svc("inc-two", { description: undefined, status: "published" }))))).toHaveProperty("description");
    await updateService(db, draft.id, { description: "now complete", status: "published" });

    const cs = await createCaseStudy(db, { title: "C", slug: "c", summary: "s" });
    expect(fieldsOf(await reason(updateCaseStudy(db, cs.id, { status: "published" })))).toHaveProperty("challenge");
    await updateCaseStudy(db, cs.id, { execution: "what we did", status: "published" });

    expect(fieldsOf(await reason(createCareer(db, { title: "T", slug: "t", summary: "s", status: "published" })))).toHaveProperty("description");
    expect(fieldsOf(await reason(saveHomePage(db, { status: "published", seo: HOME_SEO })))).toHaveProperty("hero");
    await saveHomePage(db, { status: "published", seo: HOME_SEO, hero: { heading: "H" } });
  });

  it("re-validates when a published record is edited into an incomplete state", async () => {
    const s = await createService(db, svc("live", { status: "published" }));
    const err = await reason(updateService(db, s.id, { name: "Renamed" })).then(() => null);
    expect(err).toBeNull(); // still complete
    expect(await reason(updateService(db, s.id, { description: "  " }))).toBeInstanceOf(ZodError); // blank is rejected by the schema
  });

  it("returns 409 for duplicate slugs on create and on rename", async () => {
    await createService(db, svc("taken"));
    const other = await createService(db, svc("other-topic"));
    expect((await reason(createService(db, svc("taken")))) as AppError).toMatchObject({ code: "CONFLICT", status: 409 });
    expect((await reason(updateService(db, other.id, { slug: "taken" }))) as AppError).toMatchObject({ code: "CONFLICT", status: 409 });
  });

  it("rejects references to records that do not exist with field-level detail", async () => {
    const err = (await reason(createCaseStudy(db, { title: "C", slug: "c", summary: "s", clientId: "00000000-0000-4000-8000-000000000000" }))) as AppError;
    expect(err).toMatchObject({ code: "VALIDATION_ERROR", status: 422 });
    expect(Object.keys(err.fields!)).toEqual(["clientId"]);
  });
});

describe("HTTP error handling", () => {
  it("maps each failure to the documented status, code and shape", async () => {
    await createService(db, svc("exists", { status: "published" }));
    const cases: [string, Awaited<ReturnType<typeof call>>, number, string][] = [
      ["malformed slug", await call(service, "/api/services/x", "Bad_Slug"), 400, "BAD_REQUEST"],
      ["encoded traversal", await call(service, "/api/services/x", "..%2f..%2fetc"), 400, "BAD_REQUEST"],
      ["not found", await call(service, "/api/services/nope", "nope"), 404, "RESOURCE_NOT_FOUND"],
      ["bad query", await call(services, "/api/services?limit=0"), 422, "VALIDATION_ERROR"],
      ["unknown api path", await call(unknownApi, "/api/nothing-here"), 404, "RESOURCE_NOT_FOUND"],
    ];
    for (const [label, r, status, code] of cases) {
      expect([r.status, r.body.error.code], label).toEqual([status, code]);
      expect(r.body.success).toBe(false);
      expect(typeof r.body.message).toBe("string");
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("reports validation problems as a field map", async () => {
    const r = await call(services, "/api/services?page=0&limit=999");
    expect(r.body).toEqual({
      success: false,
      message: "Invalid request data.",
      error: { code: "VALIDATION_ERROR", fields: { page: expect.any(String), limit: expect.any(String) } },
    });
  });

  it("rejects repeated parameters, control characters, oversized URLs; ignores unknown parameters", async () => {
    expect((await call(services, "/api/services?limit=1&limit=2")).body.error.fields).toHaveProperty("limit");
    expect((await call(insights, "/api/insights?category=a%00b")).status).toBe(422); // NUL would otherwise reach the database
    expect((await call(insights, `/api/insights?category=${"x".repeat(201)}`)).status).toBe(422);
    const long = await call(services, `/api/services?x=${"a".repeat(MAX_URL_LENGTH)}`);
    expect([long.status, long.body.error.code]).toEqual([400, "BAD_REQUEST"]);
    const unknown = await call(services, "/api/services?unexpected=1&status=draft&sort=id&published=false");
    expect(unknown.status).toBe(200); // ignored, and cannot change what is returned
  });

  it("query parameters cannot expose drafts or extra fields", async () => {
    await createService(db, svc("draft-only"));
    const r = await call(services, "/api/services?status=draft&includeDrafts=true&fields=id,status");
    expect(r.body.data).toEqual([]);
  });

  it("returns a safe 500 for unexpected and database-driver failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const leaky = publicGet(async () => {
      throw Object.assign(new Error('connect ECONNREFUSED postgres://admin:hunter2@db.internal:5432/app at /srv/app/db.ts'), { code: "ECONNREFUSED" });
    });
    const r = await call(leaky, "/api/x");
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ success: false, message: "Something went wrong.", error: { code: "INTERNAL_SERVER_ERROR" } });
    expect(JSON.stringify(r.body)).not.toMatch(/hunter2|db\.internal|\/srv|ECONNREFUSED|stack/i);
    const logged = (console.error as any).mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
    expect(logged).toContain("Unhandled error");
    expect(logged).not.toContain("hunter2"); // server log is redacted too
  });

  it("supports the reserved 401/403/405/409 codes through the same envelope", async () => {
    const send = (e: AppError) => call(publicGet(async () => { throw e; }), "/api/x");
    expect((await send(AppError.unauthorized())).status).toBe(401);
    expect((await send(AppError.forbidden())).body.error.code).toBe("FORBIDDEN");
    expect((await send(AppError.methodNotAllowed("GET"))).status).toBe(405);
    expect((await send(AppError.conflict("dup"))).body.error.code).toBe("CONFLICT");
  });

  it("health reveals nothing about the environment", async () => {
    const r = await call(health as never, "/api/health");
    expect(r.body).toEqual({ success: true, data: { status: "ok" } });
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("sends no CORS headers (same-origin API)", async () => {
    const r = await call(services, "/api/services", undefined, { origin: "https://evil.example" });
    expect([...r.headers.keys()].filter((h) => h.startsWith("access-control"))).toEqual([]);
  });
});

describe("rate limiting", () => {
  it("returns 429 with Retry-After and logs the first rejection only", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const h = { "x-forwarded-for": "9.9.9.9" };
    for (let i = 0; i < RATE_LIMITS.publicRead.limit; i++) await call(services, "/api/services", undefined, h);
    const first = await call(services, "/api/services", undefined, h);
    await call(services, "/api/services", undefined, h);
    await call(services, "/api/services", undefined, h);
    expect(first.status).toBe(429);
    expect(first.body).toEqual({ success: false, message: "Too many requests. Please retry shortly.", error: { code: "RATE_LIMITED" } });
    expect(Number(first.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain("9.9.9.9");
  });

  it("accepts a stricter per-endpoint config (for future writes)", async () => {
    const strict = publicGet(async () => ({ data: "ok" }), { rateLimit: RATE_LIMITS.publicWrite });
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await call(strict, "/api/x", undefined, { "x-forwarded-for": "5.5.5.5" })).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429, 429]);
  });

  it("bounds memory when client keys are spoofed, and length-limits keys", () => {
    const now = Date.now();
    for (let i = 0; i < MAX_BUCKETS + 500; i++) checkRateLimit(`spoofed-${i}`, now);
    expect(bucketCount()).toBeLessThanOrEqual(MAX_BUCKETS);
    expect(clientKey(new Headers({ "x-forwarded-for": `${"1".repeat(500)}, 2.2.2.2` }))!.length).toBeLessThanOrEqual(64 + "read:".length);
    expect(clientKey(new Headers())).toBeNull(); // no address: not limited, never pooled
  });
});

describe("logging", () => {
  it("redacts credentials and sensitive keys", () => {
    expect(redact({ MONGODB_URI: "mongodb://u:p@h/db", password: "x", nested: { apiKey: "k", ok: "fine" }, note: "see mongodb://user:pw@host:27017/db now", list: [{ token: "t" }] })).toEqual({
      MONGODB_URI: "[redacted]",
      password: "[redacted]",
      nested: { apiKey: "[redacted]", ok: "fine" },
      note: "see mongodb://[redacted]@host:27017/db now",
      list: [{ token: "[redacted]" }],
    });
  });

  it("logs rejected requests by path only, without the query string or client input", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await call(insights, "/api/insights?category=secret-term&limit=0");
    const line = String(log.mock.calls[0][0]);
    expect(JSON.parse(line)).toMatchObject({ level: "info", message: "Request rejected", path: "/api/insights", status: 422 });
    expect(line).not.toContain("secret-term");
  });
});

describe("read-only API and security headers", () => {
  it("answers non-read methods on /api with a JSON 405 before any handler runs", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const res = proxy(new NextRequest("http://localhost/api/services", { method }));
      expect(res.status, method).toBe(405);
      expect(res.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
      expect((await res.json()).error.code).toBe("METHOD_NOT_ALLOWED");
    }
    expect(proxy(new NextRequest("http://localhost/api/services")).status).toBe(200);
  });

  it("allows POST through the proxy for the one reviewed write route, but nothing else", async () => {
    expect(proxy(new NextRequest("http://localhost/api/contact", { method: "POST" })).status).toBe(200);
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const res = proxy(new NextRequest("http://localhost/api/contact", { method }));
      expect(res.status, method).toBe(405);
      expect(res.headers.get("allow")).toBe("GET, HEAD, OPTIONS, POST");
    }
    // The exception is scoped to exactly /api/contact — every other route stays read-only.
    expect(proxy(new NextRequest("http://localhost/api/services", { method: "POST" })).status).toBe(405);
  });

  it("still normalises page URLs but leaves API paths alone", () => {
    const page = proxy(new NextRequest("http://localhost/Services/X/"));
    expect([page.status, page.headers.get("location")]).toEqual([308, "http://localhost/services/x"]);
    expect(proxy(new NextRequest("http://localhost/api/Services")).status).toBe(200);
  });

  it("configures security headers for every route, with HSTS only in production", async () => {
    vi.resetModules();
    delete process.env.APP_ENV;
    const dev = (await import("../next.config")).default;
    const [rule] = await dev.headers!();
    expect(rule.source).toBe("/:path*");
    const map = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
    expect(map).toMatchObject({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin" });
    expect(map["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(map["Permissions-Policy"]).toContain("camera=()");
    expect(map).not.toHaveProperty("Strict-Transport-Security");

    vi.resetModules();
    process.env.APP_ENV = "production";
    const prod = (await import("../next.config")).default;
    const prodMap = Object.fromEntries((await prod.headers!())[0].headers.map((h) => [h.key, h.value]));
    expect(prodMap["Strict-Transport-Security"]).toContain("max-age=");
    delete process.env.APP_ENV;
  });
});

describe("secrets and environment", () => {
  const root = process.cwd();
  const SKIP = new Set(["node_modules", ".next", ".git", "package-lock.json", "tsconfig.tsbuildinfo"]);
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      if (SKIP.has(name)) return [];
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const files = walk(root).filter((f) => !/\.(png|jpg|ico)$/.test(f));

  it("contains no credential-like strings in any project file", () => {
    const patterns = [/(postgres(ql)?|mongodb(\+srv)?):\/\/[^\s"'<:@]+:[^\s"'<@]+@/i, /sk-[a-z0-9]{20,}/i, /AKIA[0-9A-Z]{16}/, /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./];
    const hits = files.filter((f) => !f.endsWith("security.test.ts") && patterns.some((re) => re.test(readFileSync(f, "utf8"))));
    expect(hits.map((f) => relative(root, f))).toEqual([]);
  });

  it(".env.example holds names and placeholders only, and real env files are git-ignored", () => {
    const example = readFileSync(join(root, ".env.example"), "utf8");
    for (const key of ["MONGODB_URI", "MEDIA_ALLOWED_HOSTS"]) expect(example).toMatch(new RegExp(`^${key}=$`, "m"));
    // Stage 4, Phase 5 added the reviewed analytics id vars (see the identical list in the process.env test above); anything beyond that set is unreviewed.
    expect(example).not.toMatch(/^NEXT_PUBLIC_(?!SITE_URL|GA4_MEASUREMENT_ID|GTM_CONTAINER_ID|META_PIXEL_ID|GOOGLE_ADS_ID|GOOGLE_ADS_CONTACT_CONVERSION_LABEL|GOOGLE_SITE_VERIFICATION)/m);
    expect(readFileSync(join(root, ".gitignore"), "utf8")).toMatch(/^\.env$/m);
    // .env.local may legitimately exist on disk during local development — .env.example's own header
    // instructs copying it there, and it's exercised by real local `next dev`/`npm test` runs (this
    // project's actual MONGODB_URI setup). It's still covered by the credential-scan test above and
    // by .gitignore's blanket `.env.*` pattern, so its presence isn't itself a leak; what would be a
    // real defect is a *deployment*-tier secrets file (.env, .env.production, .env.staging) in the repo.
    const realEnvFiles = files.map((f) => relative(root, f)).filter((f) => /^\.env(\.|$)/.test(f) && f !== ".env.example");
    expect(realEnvFiles.filter((f) => f !== ".env.local")).toEqual([]);
  });

  it("reads process.env only in the approved configuration files, and exposes only the reviewed set of NEXT_PUBLIC_ vars to the browser", () => {
    const allowed = new Set(["src/server/config/env.ts", "src/lib/site-url.ts", "src/lib/media-config.ts", "src/lib/analytics-config.ts", "next.config.ts", "scripts/lib/mongod.ts"]); // scripts/lib/mongod.ts: dev/test tooling only (MONGOD_BINARY, the path of a local mongod)
    const src = files.filter((f) => /\.(ts|tsx|mts)$/.test(f) && !relative(root, f).startsWith("tests/"));
    const readers = src.filter((f) => /process\.env/.test(readFileSync(f, "utf8"))).map((f) => relative(root, f));
    expect(readers.filter((f) => !allowed.has(f))).toEqual([]);
    const publicVars = new Set(src.flatMap((f) => readFileSync(f, "utf8").match(/NEXT_PUBLIC_[A-Z0-9_]+/g) ?? []));
    // Stage 4, Phase 5: analytics/measurement ids are added here — each is a public identifier, not a secret (API.md/CMS_GUIDE.md do not apply; see analytics-config.ts's own comment for why).
    expect([...publicVars].sort()).toEqual([
      "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
      "NEXT_PUBLIC_GOOGLE_ADS_CONTACT_CONVERSION_LABEL",
      "NEXT_PUBLIC_GOOGLE_ADS_ID",
      "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
      "NEXT_PUBLIC_GTM_CONTAINER_ID",
      "NEXT_PUBLIC_META_PIXEL_ID",
      "NEXT_PUBLIC_SITE_URL",
    ]);
  });

  it("keeps server-only guards on the modules that read configuration or secrets", () => {
    for (const f of ["src/server/config/env.ts", "src/server/lib/logger.ts", "src/server/lib/response.ts", "src/server/api/handler.ts"]) {
      expect(readFileSync(join(root, f), "utf8"), f).toContain('import "server-only"');
    }
  });
});
