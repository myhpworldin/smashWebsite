import { MongoClient } from "mongodb";
import { getEnv } from "@/server/config/env";
import type { Db } from "@/server/db/helpers";

/**
 * Held on `globalThis`, not in module scope: in `next dev` every hot reload re-evaluates this module, and a
 * module-level singleton would then open a brand-new pool each time — repeating the `mongodb+srv` DNS lookup
 * and the TLS handshake to Atlas (and re-exposing the request to any DNS hiccup) on the next request, while
 * leaking the old pool. A global survives reloads, so there is one pool per process.
 */
const state = globalThis as typeof globalThis & { __smashMongo?: { client?: MongoClient; db?: Db } };
const cache = (state.__smashMongo ??= {});

/** Lazily-created pooled connection. Throws a clear error when MONGODB_URI is unset. */
export function getDb(): Db {
  if (!cache.db) {
    const { MONGODB_URI: uri, MONGODB_DB: name } = getEnv();
    if (!uri) throw new Error("MONGODB_URI is not configured");
    // maxPoolSize: a sane ceiling for a single app instance, not the driver's unbounded default.
    // minPoolSize: keep one connection warm, so a request after an idle spell (Atlas drops idle sockets) isn't the one that pays for a fresh handshake — the admin login was.
    // serverSelectionTimeoutMS: fail a request in 5s when the database is unreachable, rather than hanging on the driver's 30s default.
    // connectTimeoutMS / maxIdleTimeMS: the driver's defaults wait 30s for each new socket's TLS handshake, so after a network
    // blip (Wi-Fi change, VPN, laptop sleep) every request stalls for 30s on a dead connection. Give up on a handshake after
    // 10s so the pool retries quickly, and retire idle sockets after 60s, before Atlas or a NAT silently drops them.
    cache.client = new MongoClient(uri, { ignoreUndefined: true, maxPoolSize: 10, minPoolSize: 1, serverSelectionTimeoutMS: 5_000, connectTimeoutMS: 10_000, maxIdleTimeMS: 60_000 });
    // The database in the URI path (mongodb://host/name) is used unless MONGODB_DB overrides it; the driver falls back to "test".
    cache.db = cache.client.db(name);
  }
  return cache.db;
}

/** For scripts: close the pool so the process can exit. */
export async function closeDb() {
  await cache.client?.close();
  cache.client = undefined;
  cache.db = undefined;
}
