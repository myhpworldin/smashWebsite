import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { TOP_LEVEL_SEGMENTS } from "@/lib/routes";

/** Lowercase words joined by single hyphens. Also enforced by DB check constraints. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;
const SUGGESTED_MAX_LENGTH = 60;

const RESERVED = new Set(TOP_LEVEL_SEGMENTS);
const ID_LIKE = [
  /^\d+$/, // 123
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/, // uuid
  /^(page|service|project|article|post|item|case)-\d+$/, // service-1, page-123
];

/** Returns a human-readable reason a slug is not acceptable, or null when it is. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Slug is empty";
  if (slug.length > SLUG_MAX_LENGTH) return `Slug is longer than ${SLUG_MAX_LENGTH} characters`;
  if (!SLUG_PATTERN.test(slug)) return "Slug must be lowercase letters, digits and single hyphens";
  if (RESERVED.has(slug)) return `"${slug}" is reserved for an application route`;
  if (ID_LIKE.some((re) => re.test(slug))) return "Slug must be descriptive, not an identifier or sequence number";
  return null;
}

export const slugSchema = z.string().superRefine((value, ctx) => {
  const problem = slugProblem(value);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

/**
 * Deterministic suggestion from a title. Only used to *propose* a slug when
 * content is first created; an editor may shorten it. Words are never dropped
 * (no stop-word removal) except immediate repeats ("marketing marketing").
 */
export function slugify(input: string, maxLength = SUGGESTED_MAX_LENGTH): string {
  const words = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "") // don't -> dont
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((w, i, all) => w !== all[i - 1]);

  let slug = "";
  for (const word of words) {
    const next = slug ? `${slug}-${word}` : word;
    if (next.length > maxLength) break; // cut at a word boundary
    slug = next;
  }
  return slug || words[0]?.slice(0, maxLength) || "";
}

/** slugify + validation; throws when nothing usable can be derived. */
export function generateSlug(title: string, maxLength?: number): string {
  const slug = slugify(title, maxLength);
  const problem = slugProblem(slug);
  if (problem) throw AppError.validation({ slug: `Cannot derive a slug from "${title}": ${problem}` });
  return slug;
}

const SUPERLATIVES = new Set(["best", "top", "leading", "cheapest", "cheap", "ultimate", "premier", "greatest", "finest", "unbeatable"]);

/**
 * Editorial warnings (never hard errors) for slugs that look written for search
 * engines rather than people: superlative filler, repeated terms, or very long.
 * "performance-marketing" passes; "best-top-leading-digital-marketing-agency-services" does not.
 */
export function slugStyleWarnings(slug: string): string[] {
  const words = slug.split("-");
  const warnings: string[] = [];
  const filler = words.filter((w) => SUPERLATIVES.has(w));
  if (filler.length) warnings.push(`Slug contains promotional filler (${[...new Set(filler)].join(", ")}); name the page's actual topic`);
  const counts = new Map<string, number>();
  for (const w of words.filter((w) => w.length > 3)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const repeated = [...counts].filter(([, n]) => n > 1).map(([w]) => w);
  if (repeated.length) warnings.push(`Slug repeats "${repeated.join('", "')}"; say each term once`);
  if (words.length > 7) warnings.push(`Slug has ${words.length} words; shorter slugs are easier to read and share`);
  return warnings;
}

/**
 * Key for spotting two slugs that target the same intent: ignores the generic
 * words "service(s)" and plural endings. "performance-marketing" and
 * "performance-marketing-services" share a key.
 */
export function intentKey(slug: string): string {
  return slug
    .split("-")
    .filter((w) => w !== "service" && w !== "services")
    .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w))
    .join("-");
}
