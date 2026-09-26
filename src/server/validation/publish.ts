import { AppError, type FieldErrors } from "@/server/lib/errors";
import type { Seo } from "@/server/validation/common";
import { ROUTES } from "@/lib/routes";
import { ownCanonicalOverride } from "@/server/seo/metadata";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Minimum content a record needs before it may be published. Identity fields
 * (title/name, slug, summary/excerpt/quote…) are already required at creation by
 * the input schemas, so these rules cover what those leave optional while a
 * draft. Only what a public page genuinely needs is required.
 */
type Has = (value: unknown) => boolean;
const filled: Has = (v) => typeof v === "string" && v.trim().length > 0;

/**
 * A Home page that search engines may index must say what it is: its own SEO title and description (never the
 * site-wide fallback, which would silently describe every page the same way). A Home marked "do not index"
 * (`seo.robotsIndex: false`) needs neither. An explicit canonical, if given, must be the Home URL itself.
 */
export function homeSeoProblems(seo: Seo | null | undefined): FieldErrors {
  const problems: FieldErrors = {};
  const canonical = ownCanonicalOverride(seo?.canonicalUrl, getSiteUrl());
  if (seo?.canonicalUrl && canonical !== ownCanonicalOverride(getSiteUrl(), getSiteUrl())) problems["seo.canonicalUrl"] = `The Home canonical must be the Home URL (${ROUTES.HOME}), not another page.`;
  if (seo?.robotsIndex === false) return problems;
  if (!filled(seo?.metaTitle)) problems["seo.metaTitle"] = "SEO title is required to publish an indexable Home page.";
  if (!filled(seo?.metaDescription)) problems["seo.metaDescription"] = "SEO description is required to publish an indexable Home page.";
  return problems;
}

const RULES = {
  service: (r: { description?: string | null }): FieldErrors => (filled(r.description) ? {} : { description: "Required before publishing." }),
  career: (r: { description?: string | null }): FieldErrors => (filled(r.description) ? {} : { description: "Required before publishing." }),
  caseStudy: (r: { challenge?: string | null; strategy?: string | null; execution?: string | null }): FieldErrors =>
    [r.challenge, r.strategy, r.execution].some(filled)
      ? {}
      : { challenge: "Add at least one of challenge, strategy or execution before publishing." },
  home: (r: { hero?: { heading?: string } | null; seo?: Seo | null }): FieldErrors => ({
    ...(filled(r.hero?.heading) ? {} : { hero: "A hero heading is required before publishing." }),
    ...homeSeoProblems(r.seo),
  }),
} satisfies Record<string, (r: never) => FieldErrors>;

/**
 * Stage 5, Phase 1 §10/§19: "no placeholder text" is a named pre-publish check,
 * not just a convention. This catches the one placeholder pattern that's
 * unambiguous — literal Lorem Ipsum filler — across every string field of the
 * record, however deep. It deliberately does NOT flag this project's own
 * `[SAMPLE]` markers: those exist precisely so a human can find and replace
 * seed content before a real launch (`seed.ts`), and rejecting them here would
 * make the seed script's own output unpublishable, which is not the point.
 */
const LOREM_IPSUM = /lorem ipsum/i;

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out));
}

function assertNoPlaceholderText(record: unknown) {
  const strings: string[] = [];
  collectStrings(record, strings);
  if (strings.some((s) => LOREM_IPSUM.test(s))) {
    throw AppError.validation({ content: 'Contains placeholder text ("Lorem ipsum") — replace with real content before publishing.' });
  }
}

export function assertPublishable<K extends keyof typeof RULES>(kind: K, record: Parameters<(typeof RULES)[K]>[0]) {
  assertNoPlaceholderText(record);
  const problems = (RULES[kind] as (r: unknown) => FieldErrors)(record);
  if (Object.keys(problems).length) throw AppError.validation(problems);
}
