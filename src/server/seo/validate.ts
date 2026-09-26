import { careers, caseStudies, homePage, insights, services, SINGLETON_ID } from "@/server/db/schema";
import { findOneRow, findRows, isPublished, type Db } from "@/server/db/helpers";
import { AppError } from "@/server/lib/errors";
import { canonicalUrl } from "@/lib/routes";
import { careerSource, caseStudySource, homeSource, insightSource, serviceSource } from "@/server/seo/adapters";
import { indexingFromEnv } from "@/server/seo/env-context";
import { loadSiteSeoContext } from "@/server/seo/site-context";
import { ownCanonicalOverride, resolveCanonical, resolveMetadata, type ResolvedMetadata, type SeoSource, type SiteSeoContext } from "@/server/seo/metadata";
import type { Media, Seo } from "@/server/validation/common";
import { altProblem } from "@/server/validation/media";
import { slugStyleWarnings } from "@/server/seo/slug";

/**
 * Structural problems are hard errors; editorial guidance is a warning.
 * The length ranges below are common search-snippet conventions, not rules
 * imposed by the project, so they only ever warn.
 */
export type SeoIssue = { level: "error" | "warning"; field: string; message: string };

const TITLE_MAX = 60;
const DESCRIPTION_RANGE = [70, 160] as const;

const tokens = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w));

export function validateSeo(site: SiteSeoContext, source: SeoSource, meta: ResolvedMetadata = resolveMetadata(site, source)): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const seo = source.seo ?? {};
  const add = (level: SeoIssue["level"], field: string, message: string) => issues.push({ level, field, message });

  if (!source.isHome && !source.title.trim() && !seo.metaTitle) add("error", "metaTitle", "Page has no title and no explicit meta title");
  if (meta.title.length > TITLE_MAX) add("warning", "metaTitle", `Meta title is ${meta.title.length} characters; may be truncated in results (guideline ${TITLE_MAX})`);

  if (!meta.description) add("warning", "metaDescription", "No meta description and no site default to fall back to");
  else if (meta.description.length < DESCRIPTION_RANGE[0] || meta.description.length > DESCRIPTION_RANGE[1]) {
    add("warning", "metaDescription", `Meta description is ${meta.description.length} characters (guideline ${DESCRIPTION_RANGE[0]}–${DESCRIPTION_RANGE[1]})`);
  }

  if (seo.canonicalUrl) {
    if (!ownCanonicalOverride(seo.canonicalUrl, site.siteUrl)) {
      add("error", "canonicalUrl", "Canonical must be a valid URL on the site's own host; it is being ignored");
    } else if (canonicalUrl(new URL(seo.canonicalUrl).pathname, site.siteUrl) !== canonicalUrl(source.path, site.siteUrl)) {
      add("warning", "canonicalUrl", "Canonical points at a different page than this route");
    }
    if (seo.robotsIndex === false) add("warning", "robots", "noindex combined with a canonical override sends conflicting signals");
  }
  if (source.status === "draft" && seo.robotsIndex === true) add("warning", "robotsIndex", "Drafts are never indexable; this setting has no effect until published");
  if (!site.allowIndexing && source.status === "published") add("warning", "robots", "This environment is not indexable; every page is served noindex");

  const images: [string, Media | null | undefined][] = [
    ["ogImage", seo.ogImage ?? source.image],
    ["twitterImage", seo.twitterImage],
  ];
  for (const [field, image] of images) {
    if (!image) continue;
    const altIssue = image.alt.trim() ? altProblem(image.alt) : null;
    if (altIssue) add("warning", field, altIssue);
    if (!image.width || !image.height) add("warning", field, "Image has no width/height");
  }

  const topic = seo.primarySearchTopic;
  const slug = source.path.split("/")[2];
  if (slug) for (const w of slugStyleWarnings(slug)) add("warning", "slug", w);
  if (!topic) {
    if (source.status === "published") add("warning", "primarySearchTopic", "No primary search topic recorded");
  } else if (slug && !tokens(topic).some((t) => tokens(slug).includes(t))) {
    add("warning", "primarySearchTopic", `Topic "${topic}" shares no words with the slug "${slug}"; check the route and topic describe the same page`);
  }
  const related = seo.relatedSearchTopics ?? [];
  if (topic && related.some((r) => r.toLowerCase() === topic.toLowerCase())) add("warning", "relatedSearchTopics", "Related topics repeat the primary topic");
  if (new Set(related.map((r) => r.toLowerCase())).size !== related.length) add("warning", "relatedSearchTopics", "Related topics contain duplicates");

  return issues;
}

export type SeoConflict = { kind: "metaTitle" | "metaDescription" | "canonical" | "primarySearchTopic"; value: string; paths: string[] };
export type SeoAuditEntry = { path: string; meta: ResolvedMetadata; indexable: boolean; issues: SeoIssue[] };

/** Every currently published page's SEO source, across every content type + Home — shared by the audit below and the real-time check that follows it. */
async function publishedSources(db: Db): Promise<SeoSource[]> {
  const home = await findOneRow(db, homePage, { _id: SINGLETON_ID as never });
  return [
    ...(home && home.status === "published" ? [homeSource(home)] : []),
    ...(await findRows(db, services, isPublished())).map(serviceSource),
    ...(await findRows(db, caseStudies, isPublished())).map(caseStudySource),
    ...(await findRows(db, insights, isPublished())).map(insightSource),
    ...(await findRows(db, careers, isPublished())).map(careerSource),
  ];
}

/**
 * Audit every published page's resolved SEO. Drafts are excluded. `indexable`
 * (published and robots.index) is what a sitemap should consume.
 */
export async function auditPublishedSeo(db: Db, site: SiteSeoContext): Promise<{ entries: SeoAuditEntry[]; conflicts: SeoConflict[] }> {
  const sources = await publishedSources(db);

  const entries = sources.map((source) => {
    const meta = resolveMetadata(site, source);
    return { path: meta.path, meta, indexable: meta.robots.index, issues: validateSeo(site, source, meta) };
  });

  const groups = new Map<string, SeoConflict>();
  const track = (kind: SeoConflict["kind"], value: string | undefined, path: string) => {
    if (!value) return;
    const key = `${kind}\u0000${value.toLowerCase()}`;
    const g = groups.get(key) ?? { kind, value, paths: [] };
    g.paths.push(path);
    groups.set(key, g);
  };
  entries.forEach((e, i) => {
    track("metaTitle", e.meta.title, e.path);
    track("metaDescription", e.meta.description, e.path);
    track("canonical", e.meta.canonical, e.path);
    track("primarySearchTopic", sources[i].seo?.primarySearchTopic, e.path);
  });
  return { entries, conflicts: [...groups.values()].filter((g) => g.paths.length > 1) };
}

/**
 * Real-time counterpart to the "canonical" conflict `auditPublishedSeo` above
 * reports (Stage 5, Phase 3 §12): that function is a manual/dev-run report
 * (`npm run seo:audit`, or a test), so nothing previously stopped an editor
 * from actually creating the conflict through the admin API in the first
 * place — this runs on every publish instead. Only meaningful when the
 * record sets an explicit canonical override: a page's own, unoverridden
 * canonical can never collide with another page's, since routes/slugs are
 * already unique by construction (`assertNoDuplicateIntent`, DB constraints).
 * Excludes by path, not id, on purpose — simpler, and correct either way: an
 * unchanged slug's stale DB row is exactly the record being excluded, and a
 * changed slug's stale row is already a different, irrelevant path.
 * Builds its own site context (one extra lightweight query) so every write-path
 * call site needs only `db`, the record's own path, and its own `seo` field.
 */
export async function assertNoCanonicalConflict(db: Db, ownPath: string, ownSeo: Seo | null | undefined): Promise<void> {
  if (!ownSeo?.canonicalUrl) return;
  const site = await loadSiteSeoContext(db, indexingFromEnv());
  const ownCanonical = resolveCanonical(site, ownPath, ownSeo);
  const others = (await publishedSources(db)).filter((s) => s.path !== ownPath);
  const clash = others.find((s) => resolveCanonical(site, s.path, s.seo) === ownCanonical);
  if (clash) {
    throw AppError.conflict(`Canonical URL conflicts with an already-published page (${clash.path}). Two published pages cannot share the same canonical URL.`);
  }
}
