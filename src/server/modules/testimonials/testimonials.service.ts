import { clients, homeTestimonials, testimonials } from "@/server/db/schema";
import { assertExist, col, findRows, homeRefStages, insertRow, isPublished, toPublic, toRow, updateRow, type Db } from "@/server/db/helpers";
import { testimonialInputSchema, testimonialUpdateSchema } from "./testimonials.schema";

export async function createTestimonial(db: Db, input: unknown) {
  const data = testimonialInputSchema.parse(input);
  await assertExist(db, clients, [data.clientId], "clientId");
  return insertRow(db, testimonials, data, "Testimonial");
}

export async function updateTestimonial(db: Db, id: string, patch: unknown) {
  const data = testimonialUpdateSchema.parse(patch);
  await assertExist(db, clients, [data.clientId], "clientId");
  return updateRow(db, testimonials, id, data, "Testimonial");
}

/** Bounded: testimonials are a small curated set, so the list is capped rather than paginated. */
export const PUBLIC_LIST_CAP = 100;

export async function listPublishedTestimonials(db: Db) {
  const rows = await findRows(db, testimonials, isPublished(), { sort: { displayOrder: 1, personName: 1 }, limit: PUBLIC_LIST_CAP });
  return rows.map(toPublic);
}

/** The testimonials a Home page references, in the editor's order, published ones only. One query. */
export async function getPublishedTestimonialsForHome(db: Db, homeId: string) {
  const docs = await col(db, homeTestimonials).aggregate(homeRefStages(testimonials, homeId)).toArray();
  return docs.map((doc) => toPublic(toRow(testimonials, doc)));
}
