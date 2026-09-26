import { getEnv } from "@/server/config/env";
import { closeDb, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/helpers";

async function main() {
  getEnv();
  // Creates every collection with its validator and indexes (unique slugs and redirect sources, read-path sort keys). Idempotent; never drops or rewrites data.
  await ensureSchema(getDb());
  console.log("Collections, validators and indexes ensured");
}

main().then(() => closeDb()).then(() => process.exit(0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
