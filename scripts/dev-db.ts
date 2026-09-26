import { MongoClient } from "mongodb";
import { ensureSchema } from "@/server/db/helpers";
import { seedDevelopmentContent } from "@/server/db/seed";
import { importHomeDesignContent } from "@/server/db/home-design-content";
import { startTempMongod } from "./lib/mongod";

/**
 * Development/verification only: a throwaway local MongoDB (a temporary `mongod`, see scripts/lib/mongod.ts).
 * Data is lost on exit. Usage: npm run db:dev -- [--seed | --design] [--empty] [--port=27018], then set
 * MONGODB_URI=mongodb://127.0.0.1:27018/smash in .env.local. Or skip this and use your own MongoDB.
 */
async function main() {
  const flag = process.argv.find((a) => a.startsWith("--port="));
  const port = Number(flag?.split("=")[1] ?? 27018);
  const mongod = await startTempMongod(port);
  const client = new MongoClient(mongod.uri, { ignoreUndefined: true });
  await client.connect();
  const db = client.db("smash");
  // --empty leaves the collections and indexes out so `npm run db:migrate` can be tried against a fresh database.
  if (!process.argv.includes("--empty")) await ensureSchema(db);
  if (process.argv.includes("--seed") && !process.argv.includes("--empty")) await seedDevelopmentContent(db);
  // --design loads the approved Figma homepage copy instead of the [SAMPLE] placeholders (one or the other).
  if (process.argv.includes("--design") && !process.argv.includes("--empty")) await importHomeDesignContent(db);
  await client.close();

  console.log(`Dev database ready on mongodb://127.0.0.1:${port}/smash (temporary, deleted on exit)`);
  const shutdown = () => void mongod.stop().then(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
