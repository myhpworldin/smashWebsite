import { clients } from "@/server/db/schema";
import { findRows, insertRow, isPublished, toPublic, updateRow, type Db } from "@/server/db/helpers";
import { clientInputSchema, clientUpdateSchema } from "./clients.schema";

export const createClient = async (db: Db, input: unknown) =>
  insertRow(db, clients, clientInputSchema.parse(input), "Client");

export const updateClient = async (db: Db, id: string, patch: unknown) =>
  updateRow(db, clients, id, clientUpdateSchema.parse(patch), "Client");

export async function listPublishedClients(db: Db) {
  const rows = await findRows(db, clients, isPublished(), { sort: { displayOrder: 1, name: 1 }, limit: 100 });
  return rows.map(toPublic);
}
