import { redirects } from "@/server/db/schema";
import { col, findOneRow, type Db, type Tx } from "@/server/db/helpers";
import { normalizePathname } from "@/lib/routes";

/**
 * Record that a published URL moved. Keeps redirects flat (no chains) and
 * un-redirects a path that becomes a live URL again.
 */
export async function recordPathChange(tx: Tx, fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  const c = col(tx, redirects);
  await c.deleteMany({ fromPath: toPath });
  await c.updateMany({ toPath: fromPath }, { $set: { toPath } });
  await c.updateOne(
    { fromPath },
    { $set: { toPath }, $setOnInsert: { _id: crypto.randomUUID() as never, statusCode: 301, createdAt: new Date() } },
    { upsert: true },
  );
}

export async function findRedirect(db: Db, path: string) {
  const row = await findOneRow(db, redirects, { fromPath: normalizePathname(path) });
  return row ? { to: row.toPath, status: row.statusCode as 301 | 308 } : null;
}
