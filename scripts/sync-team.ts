import { closeDb, getDb } from "@/server/db/client";
import { syncTeamRoster } from "@/server/db/home-design-content";

/** Pushes TEAM_ROSTER (src/server/db/home-design-content.ts) into the database. Edit the array, then run this. */
async function main() {
  await syncTeamRoster(getDb());
  console.log("Synced the team roster");
}

main().then(() => closeDb()).then(() => process.exit(0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
