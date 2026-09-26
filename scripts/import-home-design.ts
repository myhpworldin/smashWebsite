import { getEnv } from "@/server/config/env";
import { closeDb, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/helpers";
import { importHomeDesignContent } from "@/server/db/home-design-content";

/** Loads the approved Figma homepage copy into an empty development database (see home-design-content.ts). */
async function main() {
  if (getEnv().APP_ENV === "production") throw new Error("Refusing to import design content in production");
  await ensureSchema(getDb());
  await importHomeDesignContent(getDb());
  console.log("Imported the Figma homepage content");
}

main().then(() => closeDb()).then(() => process.exit(0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
