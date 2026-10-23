import { describe, expect, it } from "vitest";
import { CASE_STUDY_OFFERINGS, PAGE_COPY } from "@/server/db/service-page-copy";

/** The 19 live offering pages (sitemap, 2026-10-23). */
const OFFERING_SLUGS = [
  "meta-ads", "google-ads", "lead-generation", "remarketing", "conversion-optimisation",
  "social-media-management", "campaign-concepts", "daily-creatives", "video-ads", "ai-videos",
  "websites", "landing-pages", "crm", "automation", "integrations",
  "whatsapp-marketing", "lead-management", "call-centre-support", "conversion-follow-up",
];

/** Every string the copy puts on a page, labelled by where it goes. */
const strings = (slug: string) => {
  const c = PAGE_COPY[slug];
  return [
    c.importance.heading,
    c.importance.description,
    ...c.importance.takeaways,
    c.outcome.heading,
    c.outcome.description,
    ...c.outcome.items.flatMap((i) => [i.title, i.description]),
    ...(c.introduction ? [c.introduction.description] : []),
    ...(c.capabilities ? [c.capabilities.heading, c.capabilities.description, ...c.capabilities.items.flatMap((i) => [i.title, i.description])] : []),
  ];
};

describe("service page copy", () => {
  it("covers every offering page", () => {
    expect(Object.keys(PAGE_COPY).sort()).toEqual([...OFFERING_SLUGS].sort());
  });

  it("never repeats a heading, card or sentence across pages, or within one", () => {
    const seen = new Map<string, string>();
    for (const slug of Object.keys(PAGE_COPY)) {
      for (const s of strings(slug)) {
        const key = s.toLowerCase();
        expect(seen.get(key), `"${s}" on ${slug} is also on ${seen.get(key)}`).toBeUndefined();
        seen.set(key, slug);
      }
    }
  });

  it("keeps Meta Ads' capability cards and audience cards distinct", () => {
    const meta = PAGE_COPY["meta-ads"];
    const caps = new Set(meta.capabilities!.items.map((i) => i.title.toLowerCase()));
    expect(meta.outcome.items.filter((i) => caps.has(i.title.toLowerCase()))).toEqual([]);
  });

  it("uses Indian-market terms, not dollar amounts or US-only wording", () => {
    const all = Object.keys(PAGE_COPY).flatMap(strings).join("\n");
    expect(all).not.toMatch(/\$|\bdollars?\b|\bUSD\b|\bdemos?\b|\bzip code\b/i);
  });

  it("claims no figures and names the verified case studies only where they appear as proof", () => {
    for (const slug of Object.keys(PAGE_COPY)) {
      const text = strings(slug).join("\n");
      expect(text.replaceAll("D2C", ""), slug).not.toMatch(/\d|%|₹|guarantee/i);
      if (!(CASE_STUDY_OFFERINGS as readonly string[]).includes(slug)) expect(text, slug).not.toMatch(/\bCORE\b|Mobile Garage/);
    }
  });
});
