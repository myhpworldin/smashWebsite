import { homePage, services, SINGLETON_ID } from "@/server/db/schema";
import { findOneRow, findPicked, isPublished, type Db } from "@/server/db/helpers";
import { LIVE_STATIC_ROUTES } from "@/lib/routes";
import { resolvePublicRoute } from "@/server/seo/resolve";

export type LinkIssue = { source: string; target: string; problem: string };

/**
 * Health check for internal links that editors enter (CTA and metric-link
 * targets are validated for *form* on write). Each internal target must be a
 * page that exists today: a built static page or published content, and not an
 * old slug that now redirects. External https links are not checked.
 */
export async function auditInternalLinks(db: Db): Promise<LinkIssue[]> {
  const links: { source: string; target: string }[] = [];
  const add = (source: string, target?: string | null) => target && target.startsWith("/") && links.push({ source, target });

  const home = await findOneRow(db, homePage, { _id: SINGLETON_ID as never });
  if (home?.status === "published") {
    home.hero?.ctas?.forEach((c, i) => add(`home.hero.ctas[${i}]`, c.target));
    add("home.story.cta", home.story?.cta?.target);
    add("home.cta.primary", home.cta?.cta.target);
    add("home.cta.secondary", home.cta?.secondaryCta?.target);
    home.businessProof?.items.forEach((m, i) => add(`home.businessProof[${i}].link`, m.link));
    home.results?.items.forEach((m, i) => add(`home.results[${i}].link`, m.link));
  }
  const rows = await findPicked(db, services, isPublished(), ["slug", "cta"] as const);
  for (const s of rows) add(`service:${s.slug}.cta`, (s.cta as { target?: string } | null)?.target);

  const issues: LinkIssue[] = [];
  for (const { source, target } of links) {
    const r = await resolvePublicRoute(db, target);
    if (r.kind === "static" && !LIVE_STATIC_ROUTES.includes(r.path)) issues.push({ source, target, problem: "page is not built yet (it returns 404)" });
    else if (r.kind === "redirect") issues.push({ source, target, problem: `points at an old URL; use ${r.to}` });
    else if (r.kind === "not-found") issues.push({ source, target, problem: "no published page exists at this URL" });
  }
  return issues;
}
