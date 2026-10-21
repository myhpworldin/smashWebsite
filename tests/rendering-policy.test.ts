import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Which routes are cached (ISR) and which render per request (src/server/seo/public-cache.ts). Read from the route
 * files themselves, so a page cannot quietly become cached, or quietly lose its cache, without this list changing too.
 */
const APP = join(__dirname, "../src/app");
const source = (file: string) => readFileSync(join(APP, file), "utf8");

const CACHED = [
  "page.tsx",
  "about/page.tsx",
  "services/page.tsx",
  "services/[slug]/page.tsx",
  "services/[slug]/[offeringSlug]/page.tsx",
  "work/[slug]/page.tsx",
  "faq/page.tsx",
  "contact/page.tsx",
  "careers/page.tsx",
  "careers/[slug]/page.tsx",
  "insights/[slug]/page.tsx",
  "privacy-policy/page.tsx",
  "terms/page.tsx",
  "cookie-policy/page.tsx",
  "sitemap.ts",
];
/** `?page=` decides what these show, so they cannot be one cached copy. */
const PER_REQUEST = ["work/page.tsx", "insights/page.tsx"];

function filesUnder(dir: string): string[] {
  return readdirSync(join(APP, dir), { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? filesUnder(path) : /\.(ts|tsx)$/.test(e.name) ? [path] : [];
  });
}

describe("rendering policy", () => {
  it.each(CACHED)("%s is cached for at most an hour, never forced dynamic", (file) => {
    expect(source(file)).toMatch(/^export const revalidate = 3600;$/m);
    expect(source(file)).not.toContain("force-dynamic");
  });

  it("each cached detail route prerenders its published slugs", () => {
    for (const file of CACHED.filter((f) => f.includes("["))) expect(source(file)).toMatch(/export const generateStaticParams = \(\) => published(Slug|Offering)Params\(/);
  });

  it.each(PER_REQUEST)("%s renders per request", (file) => {
    expect(source(file)).toContain('export const dynamic = "force-dynamic";');
    expect(source(file)).not.toMatch(/export const revalidate/);
  });

  it("nothing private, personalised or unpublished is ever cached: admin, client portal, preview and the API", () => {
    const privateFiles = ["admin", "client", "preview", "api"].flatMap(filesUnder);
    expect(privateFiles.length).toBeGreaterThan(0);
    const cached = privateFiles.filter((f) => /export const (revalidate|dynamic = "force-static")/.test(source(f)));
    expect(cached.map((f) => relative(APP, join(APP, f)))).toEqual([]);
  });
});
