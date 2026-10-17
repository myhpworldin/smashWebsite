import { describe, expect, it } from "vitest";
import { auditProcessCopy, type OfferingProcess } from "@/lib/service-copy-audit";
import { PROCESS_COPY } from "@/server/db/service-process-copy";

const offering = (slug: string, title: string, stages: [string, string][], description = "A sentence about this service."): OfferingProcess => ({
  slug,
  title,
  process: { description, stages: stages.map(([t, d]) => ({ title: t, description: d })) },
});
const GOOD: [string, string][] = [["Audience plan", "Audiences mapped across Meta."], ["Campaign build", "Meta campaigns built."], ["Test reviews", "Meta tests reviewed."]];
const rules = (offerings: OfferingProcess[]) => auditProcessCopy(offerings).map((i) => `${i.slug}:${i.rule}`);

describe("service process copy audit", () => {
  it("passes a service whose band is its own", () => {
    expect(auditProcessCopy([offering("meta-ads", "Meta Ads", GOOD)])).toEqual([]);
  });

  it("flags stage titles every service shares, and titles that are only the service's name", () => {
    const issues = rules([offering("meta-ads", "Meta Ads", [["Strategy foundation", "Meta plan."], ["Meta Ads delivery", "Meta builds."], ["Optimisation & Learning", "Meta tests."]])]);
    expect(issues).toEqual(expect.arrayContaining(["meta-ads:generic-title", "meta-ads:name-template"]));
    expect(issues.filter((i) => i === "meta-ads:generic-title")).toHaveLength(2);
  });

  it("flags the shared 'role of <service> within your customer and business journey' sentence", () => {
    const issues = rules([offering("meta-ads", "Meta Ads", GOOD, "Deliverables are tailored to the scope, maturity and role of Meta Ads within your customer and business journey.")]);
    expect(issues).toContain("meta-ads:template-text");
  });

  it("flags a title or description that two services both use", () => {
    const a = offering("meta-ads", "Meta Ads", GOOD);
    const b = offering("google-ads", "Google Ads", [["Audience plan", "Google keywords planned."], ["Search build", "Google campaigns built."], ["Search reviews", "Google terms reviewed."]], "A sentence about this service.");
    const issues = rules([a, b]);
    expect(issues).toEqual(expect.arrayContaining(["meta-ads:duplicate-title", "google-ads:duplicate-title", "meta-ads:duplicate-text", "google-ads:duplicate-text"]));
  });

  it("flags a band that talks about a different service, or never about its own", () => {
    const offTopic = offering("meta-ads", "Meta Ads", [["Audience plan", "Keywords chosen for Google Search."], ["Campaign build", "Meta campaigns built."], ["Test reviews", "Meta tests reviewed."]]);
    expect(rules([offTopic])).toContain("meta-ads:wrong-service");
    const never = offering("meta-ads", "Meta Ads", [["Audience plan", "Audiences mapped."], ["Campaign build", "Campaigns built."], ["Test reviews", "Tests reviewed."]]);
    expect(rules([never])).toContain("meta-ads:missing-topic");
  });

  it("flags a band that is not three complete stages, or still has sample copy", () => {
    expect(rules([offering("meta-ads", "Meta Ads", GOOD.slice(0, 2))])).toContain("meta-ads:shape");
    expect(rules([offering("meta-ads", "Meta Ads", [["Audience plan", ""], ["Campaign build", "Meta builds."], ["Test reviews", "Meta tests."]])])).toContain("meta-ads:shape");
    expect(rules([offering("meta-ads", "Meta Ads", [["Audience plan", "[SAMPLE] Meta."], ["Campaign build", "Meta builds."], ["Test reviews", "Meta tests."]])])).toContain("meta-ads:shape");
  });
});

describe("the written process copy (src/server/db/service-process-copy.ts)", () => {
  // Stage descriptions that are kept from the database are stood in for here, so only what this file writes is judged.
  const standIn = Object.entries(PROCESS_COPY).map(([slug, copy]) =>
    offering(slug, slug.replace(/-/g, " "), copy.stages.map((s, i) => [s.title, s.description ?? `${slug} stage ${i + 1} output`] as [string, string]), copy.description ?? `${slug} section`),
  );

  it("gives three stages to every service it covers", () => {
    for (const [slug, copy] of Object.entries(PROCESS_COPY)) expect(copy.stages, slug).toHaveLength(3);
  });

  it("has no shared titles, no service-name titles, no template sentence and no repeats", () => {
    // `missing-topic` is skipped: it needs the stored descriptions, which the live audit (npm run db:audit-process-copy) covers.
    expect(auditProcessCopy(standIn).filter((i) => i.rule !== "missing-topic")).toEqual([]);
  });

  it("never uses a title the old template used", () => {
    const titles = Object.values(PROCESS_COPY).flatMap((c) => c.stages.map((s) => s.title.toLowerCase()));
    expect(titles).not.toContain("strategy foundation");
    expect(titles).not.toContain("optimisation & learning");
    expect(new Set(titles).size).toBe(titles.length);
  });
});
