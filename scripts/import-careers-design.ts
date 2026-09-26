import { getEnv } from "@/server/config/env";
import { closeDb, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/helpers";
import { importCareersDesignContent } from "@/server/db/careers-design-content";

/** Loads the approved Figma Careers roles into a development database with no careers yet (see careers-design-content.ts). */
async function main() {
  if (getEnv().APP_ENV === "production") throw new Error("Refusing to import design content in production");
  await ensureSchema(getDb());
  await importCareersDesignContent(getDb());
  console.log("Imported the Figma careers roles");
}

main().then(() => closeDb()).then(() => process.exit(0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
