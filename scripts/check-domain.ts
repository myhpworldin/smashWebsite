/**
 * Read-only check that a deployed (or locally running) copy of the site agrees with itself about its one canonical domain.
 *
 *   npm run seo:check-domain -- https://smash.international
 *   npm run seo:check-domain -- http://localhost:3000 --primary=https://smash.international   (a local `next start` in production mode)
 *   npm run seo:check-domain -- https://my-preview.vercel.app --expect=noindex                 (a preview / staging deployment)
 *
 * <origin>           where to send requests.
 * --primary=<origin> the one canonical origin the site must advertise (default https://smash.international).
 * --expect=index|noindex  index: canonicals, sitemap and robots are those of the live site. noindex: nothing may be indexable.
 *                    Default: index when <origin> is the primary origin, otherwise noindex.
 *
 * It only sends GET requests, never follows a redirect on its own (so every hop is counted) and exits 1 on any FAIL.
 */

export {}; // a module, so its top-level names do not clash with browser globals such as `origin`

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const origin = new URL(args.find((a) => !a.startsWith("--")) ?? "https://smash.international").origin;
const primary = new URL(flag("primary") ?? "https://smash.international").origin;
const isPrimaryHost = origin === primary;
const expect = (flag("expect") ?? (isPrimaryHost ? "index" : "noindex")) as "index" | "noindex";
if (expect !== "index" && expect !== "noindex") throw new Error("--expect must be index or noindex");

let failures = 0;
const say = (level: "PASS" | "WARN" | "FAIL", message: string) => {
  if (level === "FAIL") failures++;
  console.log(`${level}  ${message}`);
};

type Hit = { status: number; location: string | null; headers: Headers; body: string };

async function get(url: string): Promise<Hit> {
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "smash-domain-check/1.0" }, signal: AbortSignal.timeout(20_000) });
  return { status: res.status, location: res.headers.get("location"), headers: res.headers, body: res.status === 200 ? await res.text() : "" };
}

/** Follows redirects one hop at a time. `chain` lists every URL visited, so a loop or a long chain is visible. */
async function trace(start: string) {
  const chain = [start];
  const statuses: number[] = [];
  let hit = await get(start);
  while (hit.status >= 300 && hit.status < 400 && hit.location && chain.length < 8) {
    statuses.push(hit.status);
    const next = new URL(hit.location, chain[chain.length - 1]).toString();
    if (chain.includes(next)) return { chain: [...chain, next], statuses, hit, loop: true };
    chain.push(next);
    hit = await get(next);
  }
  return { chain, statuses, hit, loop: false };
}

/** A sitemap or page URL on the primary origin, requested from `origin` (they differ only for a local run). */
const reach = (primaryUrl: string) => origin + primaryUrl.slice(primary.length);

async function checkVariants() {
  const host = new URL(primary).host;
  const bare = host.replace(/^www\./, "");
  const variants = [`http://${bare}/`, `https://${bare}/`, `http://www.${bare}/`, `https://www.${bare}/`];
  for (const v of variants) {
    const t = await trace(v);
    const final = t.chain[t.chain.length - 1];
    const hops = t.chain.length - 1;
    const label = `${v} -> ${hops ? t.chain.slice(1).join(" -> ") : "(no redirect)"}`;
    if (t.loop) say("FAIL", `${label}  redirect loop`);
    else if (new URL(final).origin !== primary || t.hit.status !== 200) say("FAIL", `${label}  ends at ${t.hit.status}, not ${primary}/ with 200`);
    else if (t.statuses.some((s) => s !== 301 && s !== 308)) say("WARN", `${label}  uses ${t.statuses.join("/")} (permanent 301/308 expected)`);
    else if (new URL(v).origin === primary) say("PASS", `${v} serves directly (200)`);
    else if (hops === 1) say("PASS", label);
    else if (hops === 2) say("WARN", `${label}  two hops (scheme then host)`);
    else say("FAIL", `${label}  redirect chain of ${hops} hops`);
  }
}

async function checkRobots() {
  const r = await get(`${origin}/robots.txt`);
  if (r.status !== 200) return say("FAIL", `robots.txt returned ${r.status}`);
  say("PASS", "robots.txt is reachable (200)");
  const sitemaps = [...r.body.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (expect === "noindex") {
    say(/^disallow:\s*\/\s*$/im.test(r.body) ? "PASS" : "FAIL", "robots.txt blocks all crawling");
    say(sitemaps.length ? "FAIL" : "PASS", sitemaps.length ? `robots.txt advertises a sitemap: ${sitemaps.join(", ")}` : "robots.txt advertises no sitemap");
    return;
  }
  say(sitemaps.length === 1 && sitemaps[0] === `${primary}/sitemap.xml` ? "PASS" : "FAIL", `robots.txt Sitemap line: ${sitemaps.join(", ") || "(none)"} (expected ${primary}/sitemap.xml)`);
  for (const path of ["/admin", "/preview/", "/client"]) say(new RegExp(`^disallow:\\s*${path}\\s*$`, "im").test(r.body) ? "PASS" : "FAIL", `robots.txt keeps ${path} disallowed`);
  say(/^disallow:\s*\/\s*$/im.test(r.body) ? "FAIL" : "PASS", "robots.txt does not block the whole site");
}

async function checkSitemap(): Promise<string[]> {
  const r = await get(`${origin}/sitemap.xml`);
  if (expect === "noindex") {
    const locs = r.status === 200 ? [...r.body.matchAll(/<loc>/g)].length : 0;
    say(locs === 0 ? "PASS" : "FAIL", r.status === 200 ? `sitemap.xml lists ${locs} URLs (none expected)` : `sitemap.xml returned ${r.status} (nothing is advertised)`);
    return [];
  }
  if (r.status !== 200) {
    say("FAIL", `sitemap.xml returned ${r.status}${r.location ? ` -> ${r.location}` : ""}`);
    return [];
  }
  say("PASS", "sitemap.xml is reachable (200)");
  const xml = r.body;
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());
  const wellFormed = xml.startsWith("<?xml") && /<urlset[^>]*sitemaps\.org\/schemas\/sitemap\/0\.9/.test(xml) && xml.trimEnd().endsWith("</urlset>")
    && (xml.match(/<url>/g) ?? []).length === (xml.match(/<\/url>/g) ?? []).length && (xml.match(/<url>/g) ?? []).length === locs.length && !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml);
  say(wellFormed ? "PASS" : "FAIL", `sitemap.xml is valid sitemap XML (${locs.length} URLs)`);
  const lastmods = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
  say(lastmods.every((d) => !Number.isNaN(Date.parse(d))) ? "PASS" : "FAIL", `${lastmods.length} <lastmod> dates all parse`);
  const offHost = locs.filter((l) => !l.startsWith(`${primary}/`));
  say(offHost.length ? "FAIL" : "PASS", offHost.length ? `${offHost.length} sitemap URLs are not on ${primary}: ${offHost.slice(0, 3).join(", ")}` : `every sitemap URL is on ${primary}`);
  const dupes = locs.filter((l, i) => locs.indexOf(l) !== i);
  say(dupes.length ? "FAIL" : "PASS", dupes.length ? `duplicate sitemap URLs: ${dupes.join(", ")}` : "no duplicate sitemap URLs");
  const bad: string[] = [];
  const queue = [...locs];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const hit = await get(reach(url)).catch((e: Error) => ({ status: 0, location: e.message }) as Hit);
      if (hit.status !== 200) bad.push(`${url} -> ${hit.status}${hit.location ? ` ${hit.location}` : ""}`);
    }
  }));
  say(bad.length ? "FAIL" : "PASS", bad.length ? `sitemap URLs that do not answer 200 directly:\n        ${bad.join("\n        ")}` : `all ${locs.length} sitemap URLs answer 200 with no redirect`);
  return locs;
}

const attr = (html: string, pattern: RegExp) => html.match(pattern)?.[1]?.replaceAll("&amp;", "&");

async function checkPages(sitemap: string[]) {
  const statics = ["/", "/services", "/work", "/insights", "/about", "/careers", "/contact", "/faq", "/privacy-policy", "/terms", "/cookie-policy"];
  // One real page per content group, taken from the sitemap, so the dynamic routes are covered too.
  const sample = (prefix: string, depth: number) => sitemap.map((u) => new URL(u).pathname).find((p) => p.startsWith(prefix) && p.split("/").length === depth + 1);
  const dynamic = [sample("/services/", 2), sample("/services/", 3), sample("/work/", 2), sample("/insights/", 2), sample("/careers/", 2)].filter((p): p is string => !!p);
  const inSitemap = new Set(sitemap.map((u) => new URL(u).pathname));
  for (const path of [...statics, ...dynamic]) {
    const hit = await get(origin + path);
    if (hit.status !== 200) {
      say("FAIL", `${path} returned ${hit.status}${hit.location ? ` -> ${hit.location}` : ""}`);
      continue;
    }
    const canonical = attr(hit.body, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/) ?? attr(hit.body, /<link[^>]*href="([^"]*)"[^>]*rel="canonical"/);
    const ogUrl = attr(hit.body, /<meta[^>]*property="og:url"[^>]*content="([^"]*)"/);
    const robots = attr(hit.body, /<meta[^>]*name="robots"[^>]*content="([^"]*)"/) ?? "";
    const header = hit.headers.get("x-robots-tag") ?? "";
    const want = path === "/" ? `${primary}/` : `${primary}${path}`;
    const problems: string[] = [];
    if (canonical !== want) problems.push(`canonical ${canonical ?? "(missing)"} (expected ${want})`);
    if (ogUrl !== want) problems.push(`og:url ${ogUrl ?? "(missing)"} (expected ${want})`);
    if (expect === "noindex") {
      if (!/noindex/i.test(robots) && !/noindex/i.test(header)) problems.push("not noindex");
    } else if (/noindex/i.test(robots) === inSitemap.has(path)) {
      problems.push(inSitemap.has(path) ? `listed in the sitemap but robots meta is "${robots}"` : "indexable but missing from the sitemap");
    }
    say(problems.length ? "FAIL" : "PASS", problems.length ? `${path}: ${problems.join("; ")}` : `${path}: canonical and og:url = ${want}${/noindex/i.test(robots) ? " (noindex, not in sitemap)" : ""}`);
  }
}

async function main() {
  console.log(`Checking ${origin}  (primary ${primary}, expecting ${expect})\n`);
  if (isPrimaryHost && primary.startsWith("https://")) await checkVariants();
  else console.log("(host/scheme redirect checks skipped: they only apply to a deployed https primary host)");
  await checkRobots();
  const sitemap = await checkSitemap();
  await checkPages(sitemap);
  console.log(`\n${failures ? `${failures} FAILED` : "All checks passed"}`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
