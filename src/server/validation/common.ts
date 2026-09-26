import { z } from "zod";
import { getSiteUrl } from "@/lib/site-url";
import { isPublicRoutePath } from "@/lib/routes";
import { slugProblem } from "@/server/seo/slug";

export const contentStatusValues = ["draft", "published"] as const;
export const contentStatusSchema = z.enum(contentStatusValues);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export { SLUG_PATTERN, slugSchema } from "@/server/seo/slug";

/** Slug rules (reserved words, id-like values) applied to the last segment of a content route. */
const slugProblemOfPath = (path: string) => {
  const parts = path.split("/");
  return parts.length === 3 ? slugProblem(parts[2]) : null;
};

/** Trimmed, non-empty, length-bounded. NUL is refused (unsafe to store and log); ordinary punctuation, symbols and international text are untouched. */
const text = (max: number) =>
  z.string().trim().min(1).max(max).refine((v) => !v.includes("\u0000"), "Contains an invalid character");
export const boundedText = text;
export const shortText = text(200);
export const longText = text(20000);

const httpUrl = z.url({ protocol: /^https?$/ });
/** Internal route ("/services") or absolute http(s) URL. */
export const linkTarget = z.union([
  httpUrl,
  z.string().regex(/^\/(?!\/)[^\s]*$/, "Must be an absolute URL or a root-relative path"),
]);

export { mediaSchema, socialImageSchema, videoSchema, type Media, type Video } from "@/server/validation/media";
import { mediaSchema, socialImageSchema } from "@/server/validation/media";

/** An explicit canonical must live on the configured site origin; external canonicals are refused at entry. */
function isOnSite(url: string): boolean {
  try {
    return new URL(url).origin === new URL(getSiteUrl()).origin;
  } catch {
    return false;
  }
}

export const searchIntentValues = ["informational", "commercial", "transactional", "navigational"] as const;

/**
 * Editorial SEO. `primarySearchTopic` / `relatedSearchTopics` / `searchIntent`
 * document what a page is meant to answer; they are NOT performance data and are
 * never injected into page copy. Robots flags default to index/follow when unset.
 */
export const seoSchema = z.object({
  metaTitle: text(120).optional(),
  metaDescription: text(320).optional(),
  /** Must be on the site's own host; other hosts are ignored by the generator. */
  canonicalUrl: httpUrl.refine(isOnSite, "Canonical URL must be on this site's own domain").optional(),
  ogTitle: text(120).optional(),
  ogDescription: text(320).optional(),
  ogImage: socialImageSchema.optional(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional(),
  twitterTitle: text(120).optional(),
  twitterDescription: text(320).optional(),
  twitterImage: socialImageSchema.optional(),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
  primarySearchTopic: text(120).optional(),
  relatedSearchTopics: z.array(text(120)).max(10).optional(),
  searchIntent: z.enum(searchIntentValues).optional(),
});
export type Seo = z.infer<typeof seoSchema>;

/**
 * Where a call to action may point: a canonical internal route (a defined static
 * route or /<services|work|insights|careers>/<slug>, no query or fragment) or an
 * https URL without credentials. http, other schemes, unknown paths and
 * id/query-style URLs are refused.
 */
export const ctaTarget = z.string().refine((v) => {
  if (v.startsWith("/")) return isPublicRoutePath(v) && slugProblemOfPath(v) === null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}, "Must be a canonical site route (e.g. /contact, /services/<slug>) or an https URL");

export const ctaSchema = z.object({ label: shortText, target: ctaTarget });
export type Cta = z.infer<typeof ctaSchema>;

/** A titled block of copy, used for Service problem/solution and Home sections. */
export const titledCopySchema = z.object({
  title: shortText.optional(),
  description: longText.optional(),
});

export const titledItemSchema = z.object({ title: shortText, description: longText.optional(), icon: mediaSchema.optional() });
export type TitledItem = z.infer<typeof titledItemSchema>;

/**
 * A measurable statement (business proof, result). `source` records where the
 * figure was verified; it is mandatory before the owning content is published.
 */
export const metricSchema = z.object({
  label: shortText,
  value: shortText,
  description: longText.optional(),
  context: longText.optional(),
  source: shortText.optional(),
  link: ctaTarget.optional(),
});
export type Metric = z.infer<typeof metricSchema>;

export const faqSchema = z.object({ question: shortText, answer: longText });

/**
 * Stage 5, Phase 9 §18: reject duplicate questions within one FAQ list —
 * two identical questions is a content mistake (a copy-paste left in), not a
 * legitimate case, and it would also produce a malformed FAQPage schema
 * (`schema.ts`) with a repeated `mainEntity` question. Same comparison style
 * as `uuidListSchema` just above. Empty questions/answers are already
 * impossible: `shortText`/`longText` (`text()`) require a trimmed, non-empty value.
 */
export const faqListSchema = (max: number) =>
  z.array(faqSchema).max(max).refine((items) => {
    const keys = items.map((f) => f.question.trim().toLowerCase());
    return new Set(keys).size === keys.length;
  }, "Duplicate FAQ question");

export const uuidListSchema = z.array(z.uuid()).max(100).refine((a) => new Set(a).size === a.length, "Duplicate ids");
