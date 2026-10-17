import { closeDb, getDb } from "@/server/db/client";
import { auditProcessCopy, type OfferingProcess } from "@/lib/service-copy-audit";

/** Audits the "Useful outputs at every stage" band of every offering page in the database. Exits 1 when anything is wrong. */
async function main() {
  const services = await getDb().collection("services").find({}, { projection: { slug: 1, deliverables: 1 } }).sort({ displayOrder: 1 }).toArray();
  const offerings: OfferingProcess[] = services.flatMap((s) =>
    (s.deliverables ?? []).filter((d: { offering?: unknown }) => d.offering).map((d: { title: string; offering: { slug: string; process: OfferingProcess["process"] } }) => ({ slug: d.offering.slug, title: d.title, process: d.offering.process })),
  );
  const issues = auditProcessCopy(offerings);
  for (const o of offerings) {
    const mine = issues.filter((i) => i.slug === o.slug);
    console.log(`${mine.length ? "✗" : "✓"} ${o.slug}`);
    for (const i of mine) console.log(`    [${i.rule}] ${i.detail}`);
  }
  console.log(`\n${offerings.length} offerings, ${issues.length} problem${issues.length === 1 ? "" : "s"}`);
  if (issues.length) process.exitCode = 1;
}

main().then(() => closeDb(), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
