import { getEnv } from "@/server/config/env";
import { closeDb, getDb } from "@/server/db/client";
import { ensureSchema } from "@/server/db/helpers";
import { seedDevelopmentContent } from "@/server/db/seed";

async function main() {
  if (getEnv().APP_ENV === "production") throw new Error("Refusing to seed sample content in production");
  await ensureSchema(getDb());
  await seedDevelopmentContent(getDb());
  console.log("Seeded development sample content");
}

main().then(() => closeDb()).then(() => process.exit(0), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
