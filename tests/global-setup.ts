import { startTempMongod } from "../scripts/lib/mongod";

/** One throwaway mongod for the whole run; each test gets its own database on it (see test-db.ts). */
export default async function setup() {
  const mongod = await startTempMongod();
  process.env.TEST_MONGO_URI = mongod.uri;
  return mongod.stop;
}
