import { MongoClient } from "mongodb";
import { getEnv } from "@/server/config/env";
import type { Db } from "@/server/db/helpers";

let client: MongoClient | undefined;
let db: Db | undefined;

/** Lazily-created pooled connection. Throws a clear error when MONGODB_URI is unset. */
export function getDb(): Db {
  if (!db) {
    const { MONGODB_URI: uri, MONGODB_DB: name } = getEnv();
    if (!uri) throw new Error("MONGODB_URI is not configured");
    // maxPoolSize: a sane ceiling for a single app instance, not the driver's unbounded default.
    // serverSelectionTimeoutMS: fail a request in 5s when the database is unreachable, rather than hanging on the driver's 30s default.
    client = new MongoClient(uri, { ignoreUndefined: true, maxPoolSize: 10, serverSelectionTimeoutMS: 5_000 });
    // The database in the URI path (mongodb://host/name) is used unless MONGODB_DB overrides it; the driver falls back to "test".
    db = client.db(name);
  }
  return db;
}

/** For scripts: close the pool so the process can exit. */
export async function closeDb() {
  await client?.close();
  client = undefined;
  db = undefined;
}
