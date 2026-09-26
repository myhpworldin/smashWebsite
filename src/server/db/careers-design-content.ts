import type { Db } from "@/server/db/helpers";
import { findRows } from "@/server/db/helpers";
import { careers } from "@/server/db/schema";
import { createCareer } from "@/server/modules/careers/careers.service";

const SOCIAL = { title: "Social Media Strategist", department: "Creative", workMode: "on-site", summary: "Build campaigns, shape brand voice, and turn social moments into measurable growth." } as const;
const BIZDEV = { title: "Business Development Executive", department: "Sales", workMode: "hybrid", summary: "Identify new opportunities, build relationships, and help scale our agency partnerships." } as const;

/** The five rows of the approved Figma "Careers" list, top to bottom. The design repeats two placeholder roles, so slugs carry a distinguishing word. */
const ROLES = [
  { ...SOCIAL, slug: "social-media-strategist" },
  { ...BIZDEV, slug: "business-development-executive" },
  { ...SOCIAL, slug: "social-media-strategist-kochi" },
  { ...BIZDEV, slug: "business-development-executive-kochi" },
  { ...SOCIAL, slug: "social-media-strategist-onsite" },
] as const;

/**
 * The open roles shown on the approved Figma "Careers" page: titles, teams, work mode, location and one-line summaries
 * are the design's; the full description is not in the design and carries the project's "[SAMPLE]" marker. The page
 * lists newest first, so the roles are created bottom row first. Development databases only; refuses to run when any
 * Career already exists so it can never touch real postings.
 */
export async function importCareersDesignContent(db: Db) {
  if ((await findRows(db, careers, {}, { limit: 1 })).length) throw new Error("Careers already exist; edit them in the CMS instead of importing over them.");
  for (const role of [...ROLES].reverse()) {
    await createCareer(db, { ...role, location: "Kochi, India", employmentType: "full-time", description: "[SAMPLE] Role description, to be written.", status: "published" });
    await new Promise((resolve) => setTimeout(resolve, 5)); // distinct publish times keep the list order stable
  }
}
