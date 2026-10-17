/**
 * Checks the "Useful outputs at every stage" band (the dark process timeline) of every service offering page for copy
 * that is repeated across services or does not belong to the service it sits on. Pure: it takes the offerings' process
 * data and returns problems, so one rule set serves the audit script (against the live database) and the tests.
 *
 * What it flags:
 *   generic-title    a stage called "Strategy foundation" / "Optimisation & Learning": the same on many pages
 *   name-template    a stage named after the service ("Remarketing delivery"): a template with the name swapped in
 *   duplicate-title  a stage title used by two offerings (or twice on one)
 *   template-text    the section sentence built from "role of <service> within your customer and business journey"
 *   duplicate-text   a section description or a stage description used by two offerings
 *   shape            not exactly three stages, an empty title or description, or leftover "[SAMPLE]" copy
 *   missing-topic    the band never mentions what its own service is
 *   wrong-service    the band mentions something that belongs to a different service (e.g. Google on Meta Ads)
 */
export type ProcessStage = { title: string; description?: string | null };
export type OfferingProcess = { slug: string; title: string; process: { description?: string | null; stages: ProcessStage[] } | null };
export type CopyIssue = { slug: string; rule: string; detail: string };

/** Titles that say nothing about the service: every page that uses one reads the same. */
const GENERIC_TITLES = new Set(["strategy foundation", "optimisation & learning", "optimization & learning", "planning", "delivery", "optimisation", "reporting"]);
const TEMPLATE_SENTENCE = /role of .+ within your customer and business journey/i;

/**
 * What each offering's band must be about (`topic`: at least one of these appears) and what would be about another
 * service (`foreign`: none of these appears).
 */
export const SERVICE_TERMS: Record<string, { topic: RegExp; foreign: RegExp }> = {
  "meta-ads": { topic: /\b(meta|facebook|instagram|ad set)/i, foreign: /google|keyword|search term|performance max|youtube|whatsapp|\bcrm\b/i },
  "google-ads": { topic: /google|search|keyword/i, foreign: /facebook|instagram|\bmeta\b|ad set|whatsapp|\bcrm\b/i },
  "lead-generation": { topic: /\blead/i, foreign: /content calendar|community management|whatsapp|call centre/i },
  remarketing: { topic: /remarket|returning|re-engage|audience/i, foreign: /keyword|content calendar|sitemap|\bcrm\b|whatsapp/i },
  "conversion-optimisation": { topic: /conversion|experiment|\btests?\b|friction/i, foreign: /content calendar|keyword|broadcast|whatsapp|\bcrm\b/i },
  "social-media-management": { topic: /\b(posts?|content|community|platforms?|channels?)\b/i, foreign: /bidding|budget pacing|roas|keyword|ad set|\bcrm\b/i },
  "campaign-concepts": { topic: /concept|idea|creative platform/i, foreign: /bidding|budget pacing|\bcrm\b|keyword|whatsapp/i },
  "daily-creatives": { topic: /creative|asset|template/i, foreign: /bidding|\bcrm\b|keyword|sitemap|whatsapp/i },
  "video-ads": { topic: /video/i, foreign: /\bcrm\b|sitemap|keyword|bidding|whatsapp/i },
  "ai-videos": { topic: /\bai\b|video/i, foreign: /\bcrm\b|sitemap|keyword|bidding|whatsapp/i },
  websites: { topic: /\b(site|sites|website|pages?)\b/i, foreign: /ad set|bidding|broadcast|keyword|whatsapp/i },
  "landing-pages": { topic: /\b(landing|page|pages)\b/i, foreign: /sitemap|content calendar|broadcast|bidding|whatsapp/i },
  crm: { topic: /\bcrm\b|pipeline|lead/i, foreign: /ad set|bidding|keyword|broadcast|content calendar/i },
  automation: { topic: /automat/i, foreign: /ad set|bidding|keyword|broadcast|content calendar/i },
  integrations: { topic: /integrat|connect|data/i, foreign: /ad set|bidding|keyword|content calendar|broadcast/i },
  "whatsapp-marketing": { topic: /whatsapp/i, foreign: /keyword|bidding|ad set|sitemap|\bcrm\b/i },
  "lead-management": { topic: /\blead/i, foreign: /bidding|keyword|ad set|broadcast|content calendar/i },
  "call-centre-support": { topic: /\bcalls?\b/i, foreign: /bidding|keyword|ad set|whatsapp|sitemap/i },
  "conversion-follow-up": { topic: /follow/i, foreign: /bidding|keyword|ad set|sitemap|content calendar/i },
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
/** "google-ads" → "google ads": the name a templated stage title repeats. */
const nameOf = (slug: string) => slug.replace(/-/g, " ");

export function auditProcessCopy(offerings: OfferingProcess[]): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const add = (slug: string, rule: string, detail: string) => issues.push({ slug, rule, detail });
  const titleOwners = new Map<string, string[]>();
  const textOwners = new Map<string, string[]>();
  const claim = (map: Map<string, string[]>, key: string, slug: string) => map.set(key, [...(map.get(key) ?? []), slug]);

  for (const o of offerings) {
    const p = o.process;
    if (!p || p.stages.length !== 3) {
      add(o.slug, "shape", `expected 3 stages, found ${p?.stages.length ?? 0}`);
      continue;
    }
    if (p.description && TEMPLATE_SENTENCE.test(p.description)) add(o.slug, "template-text", `section description is the shared template: "${p.description}"`);
    if (p.description) claim(textOwners, norm(p.description), o.slug);

    const name = nameOf(o.slug);
    for (const [i, stage] of p.stages.entries()) {
      const at = `stage ${i + 1} "${stage.title}"`;
      if (!stage.title?.trim() || !stage.description?.trim()) add(o.slug, "shape", `${at} has no title or description`);
      if (/\[sample\]/i.test(`${stage.title} ${stage.description}`)) add(o.slug, "shape", `${at} still has [SAMPLE] copy`);
      const t = norm(stage.title ?? "");
      if (GENERIC_TITLES.has(t)) add(o.slug, "generic-title", `${at} is a title every service shares`);
      else if (t.includes(name) || t.includes(norm(o.title))) add(o.slug, "name-template", `${at} is just the service name with a word added`);
      claim(titleOwners, t, o.slug);
      if (stage.description) claim(textOwners, norm(stage.description), o.slug);
    }

    const rules = SERVICE_TERMS[o.slug];
    if (rules) {
      const all = [p.description ?? "", ...p.stages.flatMap((s) => [s.title, s.description ?? ""])].join(" ");
      if (!rules.topic.test(all)) add(o.slug, "missing-topic", "the band never mentions what this service is");
      const stray = all.match(rules.foreign);
      if (stray) add(o.slug, "wrong-service", `mentions "${stray[0]}", which belongs to another service`);
    }
  }

  for (const [title, owners] of titleOwners) {
    if (owners.length > 1 && !GENERIC_TITLES.has(title)) for (const slug of new Set(owners)) add(slug, "duplicate-title", `stage title "${title}" is also used by ${[...new Set(owners)].filter((s) => s !== slug).join(", ") || "this service itself"}`);
  }
  for (const [text, owners] of textOwners) {
    if (owners.length > 1) for (const slug of new Set(owners)) add(slug, "duplicate-text", `"${text.slice(0, 70)}…" is also used by ${[...new Set(owners)].filter((s) => s !== slug).join(", ") || "this service itself"}`);
  }
  return issues;
}
