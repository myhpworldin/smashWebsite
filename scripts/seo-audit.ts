import { getDb } from "@/server/db/client";
import { indexingFromEnv } from "@/server/seo/env-context";
import { loadSiteSeoContext } from "@/server/seo/site-context";
import { auditInternalLinks } from "@/server/seo/links-audit";
import { auditSitemap } from "@/server/seo/sitemap";
import { auditPublishedSeo } from "@/server/seo/validate";

async function main() {
  const site = await loadSiteSeoContext(getDb(), indexingFromEnv());
  const { entries, conflicts } = await auditPublishedSeo(getDb(), site);
  for (const e of entries) {
    console.log(`${e.indexable ? "index  " : "noindex"} ${e.path}`);
    for (const i of e.issues) console.log(`  ${i.level.toUpperCase()} [${i.field}] ${i.message}`);
  }
  for (const c of conflicts) console.log(`CONFLICT duplicate ${c.kind} "${c.value}": ${c.paths.join(", ")}`);

  const linkIssues = await auditInternalLinks(getDb());
  for (const i of linkIssues) console.log(`LINK ${i.source} -> ${i.target}: ${i.problem}`);
  const sitemap = await auditSitemap(getDb(), site);
  for (const i of sitemap.issues) console.log(`SITEMAP ${i.url}: ${i.problem}`);
  console.log(`${entries.length} published pages, ${conflicts.length} conflicts, ${sitemap.entries.length} sitemap URLs, ${sitemap.issues.length} sitemap issues, ${linkIssues.length} link issues`);
  if (!site.allowIndexing) console.log("(this tier is not indexable, so the sitemap is intentionally empty)");
  if (sitemap.issues.length) process.exitCode = 1;
}

main().then(() => process.exit(process.exitCode ?? 0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
