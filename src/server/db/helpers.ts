import { randomUUID } from "node:crypto";
import type { Db as MongoDb, Document, Filter, Sort } from "mongodb";
import { AppError } from "@/server/lib/errors";
import { intentKey } from "@/server/seo/slug";
import type { Metric } from "@/server/validation/common";
import { INDEXES, SPEC, VALIDATORS, type CollectionName, type InsertOf, type RowOf } from "@/server/db/schema";

/** The MongoDB database handle every service takes. There are no multi-document transactions (a standalone `mongod` has none), so writes are ordered to fail before they change anything. */
export type Db = MongoDb;
/** Kept so signatures that used to accept a transaction still read naturally; it is the same handle. */
export type Tx = Db;
export type Where = Filter<Document>;

/** Any collection (content, link or singleton). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents are validated by zod before they are written; `_id` is a string id (or an auto ObjectId in the link collections)
export const col = (db: Db, name: string) => db.collection<any>(name);

const definedOnly = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));

/** Document → the row shape the services and DTOs use: `_id` becomes `id`, and unset nullable columns read as `null`. */
export function toRow<N extends CollectionName>(name: N, doc: Document): RowOf<N> {
  const { _id, ...rest } = doc;
  const row: Record<string, unknown> = { id: _id, ...rest };
  for (const key of SPEC[name].nullable) if (row[key] === undefined) row[key] = null;
  return row as RowOf<N>;
}

const mongoCode = (err: unknown) => (err as { code?: number } | null)?.code;

/** Translate database constraint failures into AppErrors; rethrow anything else. */
export function mapDbError(err: unknown, label: string): never {
  switch (mongoCode(err)) {
    case 11000: // duplicate key
      throw AppError.conflict(`${label} already exists (duplicate slug)`);
    case 121: // collection validator (DocumentValidationFailure)
      throw AppError.validation({ constraint: `${label} violates a content constraint.` });
    default:
      throw err;
  }
}

export async function insertRow<N extends CollectionName>(db: Db | Tx, name: N, values: InsertOf<N> & { id?: string }, label: string): Promise<RowOf<N>> {
  const { id, ...rest } = values as Record<string, unknown> & { id?: string };
  const doc = { _id: id ?? randomUUID(), ...SPEC[name].defaults(), ...definedOnly(rest) };
  try {
    await col(db, name).insertOne(doc);
  } catch (err) {
    return mapDbError(err, label);
  }
  return toRow(name, doc);
}

export async function updateRow<N extends CollectionName>(db: Db | Tx, name: N, id: string, values: InsertOf<N>, label: string): Promise<RowOf<N>> {
  // A relations-only edit has no column changes; still record it (updatedAt always moves).
  try {
    const doc = await col(db, name).findOneAndUpdate({ _id: id as never }, { $set: { ...definedOnly(values as Record<string, unknown>), updatedAt: new Date() } }, { returnDocument: "after" });
    if (!doc) throw AppError.notFound(label);
    return toRow(name, doc);
  } catch (err) {
    if (err instanceof AppError) throw err;
    return mapDbError(err, label);
  }
}

export async function getRowById<N extends CollectionName>(db: Db | Tx, name: N, id: string, label: string): Promise<RowOf<N>> {
  const doc = await col(db, name).findOne({ _id: id as never });
  if (!doc) throw AppError.notFound(label);
  return toRow(name, doc);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- projected fields are read from documents whose shape the caller names
type Field = any;

type FindOptions = { sort?: Sort; skip?: number; limit?: number };

/** Every row matching `where`, as rows (`id`, nulls filled). */
export async function findRows<N extends CollectionName>(db: Db | Tx, name: N, where: Where = {}, opts: FindOptions = {}): Promise<RowOf<N>[]> {
  let cursor = col(db, name).find(where);
  if (opts.sort) cursor = cursor.sort(opts.sort);
  if (opts.skip) cursor = cursor.skip(opts.skip);
  if (opts.limit) cursor = cursor.limit(opts.limit);
  return (await cursor.toArray()).map((doc) => toRow(name, doc));
}

/** Projected read for card-level data: only `fields` are fetched; `id` is the `_id` and unset fields read as `null`. */
export async function findPicked<F extends string>(db: Db | Tx, name: string, where: Where, fields: readonly F[], opts: FindOptions = {}): Promise<({ id: string } & Record<F, Field>)[]> {
  let cursor = col(db, name).find(where, { projection: { _id: 1, ...Object.fromEntries(fields.map((f) => [f, 1])) } });
  if (opts.sort) cursor = cursor.sort(opts.sort);
  if (opts.skip) cursor = cursor.skip(opts.skip);
  if (opts.limit) cursor = cursor.limit(opts.limit);
  return (await cursor.toArray()).map((doc) => pick(doc, fields));
}

/** `{ id, ...fields }` from a document, unset fields as `null`. */
export const pick = <F extends string>(doc: Document, fields: readonly F[]) =>
  ({ id: doc._id as unknown as string, ...Object.fromEntries(fields.map((f) => [f, doc[f] ?? null])) }) as { id: string } & Record<F, Field>;

/**
 * Pipeline prefix for "the records a Home page references": the ordered
 * reference documents joined to their target collection, published targets only,
 * yielding the target documents in the editor's order. One aggregate, however many are referenced.
 */
export const homeRefStages = (target: string, homeId: string): Document[] => [
  { $match: { homeId } },
  { $sort: { position: 1 } },
  { $lookup: { from: target, localField: "refId", foreignField: "_id", as: "ref" } },
  { $unwind: "$ref" },
  { $replaceRoot: { newRoot: "$ref" } },
  { $match: isPublished() },
];

export async function findOneRow<N extends CollectionName>(db: Db | Tx, name: N, where: Where): Promise<RowOf<N> | null> {
  const doc = await col(db, name).findOne(where);
  return doc ? toRow(name, doc) : null;
}

/** Every id must exist, otherwise a validation error lists the missing ones. */
export async function assertExist(db: Db | Tx, name: CollectionName, ids: readonly (string | null | undefined)[], label: string) {
  const wanted = [...new Set(ids.filter((v): v is string => !!v))];
  if (!wanted.length) return;
  const found = await col(db, name).find({ _id: { $in: wanted } as never }, { projection: { _id: 1 } }).toArray();
  const have = new Set(found.map((r) => r._id as unknown as string));
  const missing = wanted.filter((v) => !have.has(v));
  if (missing.length) throw AppError.validation({ [label]: `Unknown ids: ${missing.join(", ")}.` });
}

export type PageParams = { page: number; limit: number };
export const DEFAULT_PAGE: PageParams = { page: 1, limit: 12 };
export const offsetOf = ({ page, limit }: PageParams) => (page - 1) * limit;

export const countWhere = (db: Db | Tx, name: string, where: Where = {}): Promise<number> => col(db, name).countDocuments(where);

/** Publishing rule, enforced in the query layer: public reads always go through this. */
export const isPublished = (): Where => ({ status: "published" });
export const publishedAnd = (...conds: (Where | undefined)[]): Where => ({ $and: [isPublished(), ...conds.filter((c): c is Where => !!c)] });

/** First publication stamps publishedAt; later edits and unpublish keep it. */
export function publishFields(status: "draft" | "published" | undefined, existing?: Date | null) {
  if (status === "published") return { status, publishedAt: existing ?? new Date() };
  return status ? { status } : {};
}

/** Metrics must record their verification source before publication. */
export function assertMetricsVerified(metrics: readonly Metric[], where: string) {
  const unsourced = metrics.filter((m) => !m.source).map((m) => m.label);
  if (unsourced.length) {
    throw AppError.validation({ [where]: `Cannot publish metrics without a verification source: ${unsourced.join(", ")}` });
  }
}

/** Public DTOs never carry workflow fields. */
export function toPublic<T extends { status?: unknown; createdAt?: unknown }>(row: T): Omit<T, "status" | "createdAt"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status, createdAt, ...rest } = row;
  return rest;
}

export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const copy = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
}

/**
 * Admin listing (Stage 4, Phase 2): every row regardless of status — drafts
 * included — newest first. Deliberately separate from `listPublished*` in
 * each module, which stays the public, published-only query; this is never
 * reachable except through `adminApi` (bearer-token gated).
 */
export async function listAllRows<N extends CollectionName>(db: Db, name: N, page: PageParams = DEFAULT_PAGE) {
  const [items, total] = await Promise.all([
    findRows(db, name, {}, { sort: { createdAt: -1, _id: 1 }, skip: offsetOf(page), limit: page.limit }),
    countWhere(db, name),
  ]);
  return { items, total };
}

/**
 * Two records of the same slugged content type must not target the same
 * topic (e.g. "acme-corp" and "acme-corps", or "x" and "x-services") — an
 * exact-slug collision is already a unique index (`mapDbError`, duplicate
 * key), but a near-duplicate isn't. Originally written only for Services
 * (Stage 4, Phase 2); generalized here (Stage 5, Phase 2 §16) since the
 * underlying `intentKey` was already generic and Work/Insights/Careers had
 * the exact same exact-slug protection but not this one.
 */
export async function assertNoDuplicateIntent(db: Db | Tx, name: CollectionName, slug: string, label: string, ownId?: string) {
  const key = intentKey(slug);
  const rows = (await col(db, name).find({}, { projection: { slug: 1 } }).toArray()) as unknown as { _id: string; slug: string }[];
  const clash = rows.find((r) => r._id !== ownId && intentKey(r.slug) === key);
  if (clash) throw AppError.conflict(`Slug "${slug}" targets the same topic as existing ${label} "${clash.slug}"`);
}

/** Replace a set of link documents (delete + insert). Not atomic, so the new pairs are validated by the caller first. */
export async function replaceLinks(db: Db | Tx, name: string, ownerField: string, ownerId: string, rows: Record<string, unknown>[]) {
  await col(db, name).deleteMany({ [ownerField]: ownerId });
  if (rows.length) await col(db, name).insertMany(rows);
}

/** Creates every collection with its validator and index. Idempotent; run by `npm run db:migrate` and by the dev/test databases. */
export async function ensureSchema(db: Db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, validator] of Object.entries(VALIDATORS)) {
    if (existing.has(name)) await db.command({ collMod: name, validator, validationLevel: "strict" });
    else await db.createCollection(name, { validator });
  }
  for (const { collection, keys, unique, name, partial } of INDEXES) await col(db, collection).createIndex(keys, { unique: !!unique, name, ...(partial ? { partialFilterExpression: partial } : {}) });
}
