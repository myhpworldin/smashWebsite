import { homeTeam, teamMembers } from "@/server/db/schema";
import { col, findRows, homeRefStages, insertRow, isPublished, toPublic, toRow, updateRow, type Db } from "@/server/db/helpers";
import { teamMemberInputSchema, teamMemberUpdateSchema } from "./team.schema";

export const createTeamMember = async (db: Db, input: unknown) =>
  insertRow(db, teamMembers, teamMemberInputSchema.parse(input), "Team member");

export const updateTeamMember = async (db: Db, id: string, patch: unknown) =>
  updateRow(db, teamMembers, id, teamMemberUpdateSchema.parse(patch), "Team member");

export async function listPublishedTeam(db: Db) {
  const rows = await findRows(db, teamMembers, isPublished(), { sort: { displayOrder: 1, name: 1 } });
  return rows.map(toPublic);
}

/** The team members a Home page references, in the editor's order, published ones only. One query. */
export async function getPublishedTeamForHome(db: Db, homeId: string) {
  const docs = await col(db, homeTeam).aggregate(homeRefStages(teamMembers, homeId)).toArray();
  return docs.map((doc) => toPublic(toRow(teamMembers, doc)));
}
