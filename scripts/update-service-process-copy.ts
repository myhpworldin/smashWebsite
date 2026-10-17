import { closeDb, getDb } from "@/server/db/client";
import { PROCESS_COPY } from "@/server/db/service-process-copy";

/**
 * Writes the "Useful outputs at every stage" copy (src/server/db/service-process-copy.ts) into each offering page.
 * Only the titles listed there, the section sentences listed there and the stage descriptions listed there change;
 * everything else on the page is left as stored. Safe to run again. Take a backup first (prototypes/pre-process-copy).
 */
async function main() {
  const col = getDb().collection("services");
  let changed = 0;
  for (const service of await col.find({}).toArray()) {
    const set: Record<string, unknown> = {};
    for (const [i, d] of (service.deliverables ?? []).entries()) {
      const copy = d.offering ? PROCESS_COPY[d.offering.slug as string] : undefined;
      if (!copy) continue;
      const at = `deliverables.${i}.offering.process`;
      if (copy.description) set[`${at}.description`] = copy.description;
      for (const [j, stage] of copy.stages.entries()) {
        set[`${at}.stages.${j}.title`] = stage.title;
        if (stage.description) set[`${at}.stages.${j}.description`] = stage.description;
      }
      changed++;
    }
    if (Object.keys(set).length) await col.updateOne({ _id: service._id }, { $set: { ...set, updatedAt: new Date() } });
  }
  console.log(`Updated the process copy of ${changed} offerings`);
}

main().then(() => closeDb(), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
