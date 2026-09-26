import { randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { enquiries, services } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { col, findOneRow, publishedAnd, type Db } from "@/server/db/helpers";
import { phoneKey } from "@/lib/contact-validation";
import { enquiryInputSchema } from "./enquiries.schema";

/** Newest enquiries kept on one record; a returning visitor never grows a document without bound. */
const MAX_SUBMISSIONS = 50;

/**
 * Persists a real submission; a filled honeypot is silently dropped (returns
 * as if it succeeded — see `enquiries.schema.ts`) rather than surfaced as an
 * error, so an adaptive bot gets no signal about what tripped the trap.
 *
 * One record per phone number: an enquiry from a number already on file is added to that record (its
 * details updated to the newest values, the enquiry appended to `submissions`) instead of creating a
 * second document. It is a single atomic upsert on the unique `phoneKey` index; if two first-time
 * requests race, the loser hits the duplicate-key error and simply retries as an update.
 *
 * `serviceOfInterest` is a free-text column (CMS_CONTENT_MAP.md §3: deliberately
 * no foreign key here — an enquiry log entry, not linked content), but the only
 * way a real visitor can produce a value is picking one of the actual published
 * service names from the form's own `<select>` (`ContactForm.tsx`). Stage 6,
 * Phase 3 §10: a request sending anything else is not a real visitor submission
 * — reject it rather than silently logging an arbitrary string.
 */
export async function createEnquiry(db: Db, input: unknown) {
  const { honeypot, ...data } = enquiryInputSchema.parse(input);
  if (honeypot) return { id: null };
  if (data.serviceOfInterest) {
    const match = await findOneRow(db, services, publishedAnd({ name: data.serviceOfInterest }));
    if (!match) throw AppError.validation({ serviceOfInterest: "Please choose one of the listed services." });
  }

  const now = new Date();
  const { name, phone, location, message, serviceOfInterest, monthlyBudget, primaryGoal, ...optionalContact } = data;
  const entry = { message: message ?? null, serviceOfInterest: serviceOfInterest ?? null, monthlyBudget: monthlyBudget ?? null, primaryGoal: primaryGoal ?? null, submittedAt: now };
  const latest = Object.fromEntries(Object.entries({ ...optionalContact, message, serviceOfInterest, monthlyBudget, primaryGoal }).filter(([, v]) => v !== undefined));
  const update: Document = {
    $set: { name, phone, location, ...latest, updatedAt: now },
    $push: { submissions: { $each: [entry], $slice: -MAX_SUBMISSIONS } },
    $inc: { submissionCount: 1 },
    $setOnInsert: { _id: randomUUID(), createdAt: now },
  };
  const upsert = () => col(db, enquiries).findOneAndUpdate({ phoneKey: phoneKey(phone) }, update, { upsert: true, returnDocument: "after", projection: { _id: 1 }, includeResultMetadata: false });

  try {
    return { id: (await upsert())!._id as string };
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    return { id: (await upsert())!._id as string };
  }
}
