import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { closeDb, getDb } from "@/server/db/client";
import { caseStudies, serviceCaseStudies, services } from "@/server/db/schema";
import { updateCaseStudy } from "@/server/modules/work/work.service";
import {
  CASE_STUDY_CATEGORY,
  CASE_STUDY_OFFERINGS,
  IMPORTANCE_EYEBROW,
  OUTCOME_EYEBROW,
  PAGE_COPY,
  VERIFIED_CASE_STUDIES,
  type CopyItem,
} from "@/server/db/service-page-copy";

/**
 * Phase 7 content pass (src/server/db/service-page-copy.ts):
 *   1. Case studies CORE and Mobile Garage: tagged Growth only (their work was Facebook & Instagram lead generation, not
 *      Customer Engagement or Technology), the unverified "every enquiry captured for follow-up" clause dropped from the
 *      execution text, and Meta Ads Manager recorded as the source of their enquiry counts.
 *   2. Every offering page: "When It Fits" and "Who It's For" copy, replacing the second benefits list; Meta Ads also gets
 *      its own introduction and capability cards. Icons, visuals, process, FAQs, related links and SEO are left as stored.
 *   3. Meta Ads and Lead Generation show the two case studies as their "Results".
 *
 * It backs up everything it touches to prototypes/pre-service-page-copy/ first (and refuses to overwrite an earlier
 * backup, so a second run never replaces the original). Undo: node --env-file=.env.local prototypes/pre-service-page-copy/restore.js
 * Public pages then update within the hour, or straight away after POST /api/admin/revalidate.
 */
const BACKUP_DIR = "prototypes/pre-service-page-copy";
const RESULTS_SOURCE = "Meta Ads Manager campaign results, confirmed by SMASH (2026-10-23)";
const UNVERIFIED_CLAUSE = /,? with every enquiry captured for follow-up/;
const VERIFIED_COUNTS = new Set(["425", "282"]);

type Row = Record<string, unknown> & { _id: string };
type Offering = Record<string, unknown> & { slug?: string; outcome?: { items?: CopyItem[] }; capabilities?: { items?: CopyItem[] } };

async function main() {
  const db = getDb();
  const serviceRows = (await db.collection(services).find({}).toArray()) as unknown as Row[];
  const caseRows = (await db.collection(caseStudies).find({ slug: { $in: [...VERIFIED_CASE_STUDIES] } }).toArray()) as unknown as Row[];
  const caseIds = caseRows.map((c) => c._id);
  const links = await db.collection(serviceCaseStudies).find({ caseStudyId: { $in: caseIds } }).toArray();

  const growth = serviceRows.find((s) => s.slug === CASE_STUDY_CATEGORY);
  if (!growth) throw new Error(`No "${CASE_STUDY_CATEGORY}" service category found`);
  const missing = VERIFIED_CASE_STUDIES.filter((slug) => !caseRows.some((c) => c.slug === slug));
  if (missing.length) throw new Error(`Case studies not found: ${missing.join(", ")}`);

  if (existsSync(`${BACKUP_DIR}/backup.json`)) throw new Error(`${BACKUP_DIR}/backup.json already exists: restore or move it before running again`);
  mkdirSync(BACKUP_DIR, { recursive: true });
  writeFileSync(`${BACKUP_DIR}/backup.json`, JSON.stringify({ takenAt: new Date().toISOString(), services: serviceRows.map((s) => ({ _id: s._id, deliverables: s.deliverables })), caseStudies: caseRows, links }, null, 1));
  console.log(`Backed up ${serviceRows.length} services, ${caseRows.length} case studies and ${links.length} service links to ${BACKUP_DIR}/backup.json`);

  // 1. Case studies first: if a publish check refuses one, nothing on the service pages has changed yet.
  for (const c of caseRows) {
    const execution = typeof c.execution === "string" ? c.execution.replace(UNVERIFIED_CLAUSE, "") : undefined;
    const results = Array.isArray(c.results)
      ? (c.results as { value?: string }[]).map((r) => (VERIFIED_COUNTS.has(String(r.value).replace(/\D/g, "")) ? { ...r, source: RESULTS_SOURCE } : r))
      : undefined;
    await updateCaseStudy(db, c._id, { relatedServiceIds: [growth._id], ...(execution !== undefined ? { execution } : {}), ...(results ? { results } : {}) });
    console.log(`✓ case study ${c.slug}: tagged ${growth.name as string}${execution !== c.execution ? ", follow-up clause removed" : ""}`);
  }

  // 2 + 3. Offering pages.
  const done = new Set<string>();
  for (const service of serviceRows) {
    const set: Record<string, unknown> = {};
    for (const [i, d] of ((service.deliverables ?? []) as { offering?: Offering }[]).entries()) {
      const slug = d.offering?.slug;
      const copy = slug ? PAGE_COPY[slug] : undefined;
      if (!slug || !copy) continue;
      const at = `deliverables.${i}.offering`;

      set[`${at}.importance.eyebrow`] = IMPORTANCE_EYEBROW;
      set[`${at}.importance.heading`] = copy.importance.heading;
      set[`${at}.importance.description`] = copy.importance.description;
      set[`${at}.importance.takeaways`] = copy.importance.takeaways.map((title) => ({ title }));

      set[`${at}.outcome.eyebrow`] = OUTCOME_EYEBROW;
      set[`${at}.outcome.heading`] = copy.outcome.heading;
      set[`${at}.outcome.description`] = copy.outcome.description;
      set[`${at}.outcome.items`] = withIcons(copy.outcome.items, d.offering?.outcome?.items);

      if (copy.introduction) set[`${at}.introduction.description`] = copy.introduction.description;
      if (copy.capabilities) {
        set[`${at}.capabilities.heading`] = copy.capabilities.heading;
        set[`${at}.capabilities.description`] = copy.capabilities.description;
        set[`${at}.capabilities.items`] = withIcons(copy.capabilities.items, d.offering?.capabilities?.items);
      }
      if ((CASE_STUDY_OFFERINGS as readonly string[]).includes(slug)) set[`${at}.relatedCaseStudyIds`] = caseIds;
      done.add(slug);
    }
    if (Object.keys(set).length) await db.collection(services).updateOne({ _id: service._id } as never, { $set: { ...set, updatedAt: new Date() } });
  }
  const notFound = Object.keys(PAGE_COPY).filter((slug) => !done.has(slug));
  console.log(`✓ ${done.size} offering pages updated${notFound.length ? `; no page found for: ${notFound.join(", ")}` : ""}`);
  console.log("Public pages refresh within the hour, or straight away after POST /api/admin/revalidate.");
}

/** The new cards, each keeping the icon stored on the card in the same position. */
function withIcons(items: CopyItem[], stored: CopyItem[] | undefined) {
  return items.map((item, j) => {
    const icon = (stored?.[j] as { icon?: unknown } | undefined)?.icon;
    return icon ? { ...item, icon } : item;
  });
}

main().then(() => closeDb(), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
