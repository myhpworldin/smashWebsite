import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { afterAll } from "vitest";
import { ensureSchema, type Db } from "@/server/db/helpers";

let client: MongoClient | undefined;
let database: Db | undefined;
const observers = new Map<string, (command: string) => void>();

/** One shared, command-monitored client per test file. */
function shared() {
  if (!client) {
    const uri = process.env.TEST_MONGO_URI;
    if (!uri) throw new Error("TEST_MONGO_URI is not set (vitest globalSetup did not run)");
    client = new MongoClient(uri, { ignoreUndefined: true, monitorCommands: true });
    client.on("commandStarted", (e) => {
      if (["find", "aggregate", "count", "insert", "update", "delete", "findAndModify"].includes(e.commandName)) observers.get(e.databaseName)?.(e.commandName);
    });
    afterAll(async () => {
      await client?.close();
      client = undefined;
      database = undefined;
    });
  }
  return client;
}

/**
 * An empty database with the collections, validators and indexes applied. Creating collections and
 * indexes is the slow part of MongoDB, so a test file's database is created once and emptied for each
 * later call. `onQuery` observes every read/write command sent to it.
 */
export async function createTestDb(onQuery?: (command: string) => void) {
  const c = shared();
  if (!database) {
    database = c.db(`t_${randomUUID().replace(/-/g, "")}`);
    await ensureSchema(database);
  } else {
    for (const { name } of await database.listCollections({}, { nameOnly: true }).toArray()) await database.collection(name).deleteMany({});
  }
  if (onQuery) observers.set(database.databaseName, onQuery);
  else observers.delete(database.databaseName);
  return { db: database, client: c };
}

/** The minimum SEO a Home needs to be published as an indexable page. */
export const HOME_SEO = { metaTitle: "Home title", metaDescription: "Home description that says what the site is." };
