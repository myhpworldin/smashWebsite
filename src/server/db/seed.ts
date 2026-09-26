import type { Db } from "@/server/db/helpers";
import { createService } from "@/server/modules/services/services.service";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { createInsight } from "@/server/modules/insights/insights.service";
import { createTeamMember } from "@/server/modules/team/team.service";
import { createClient } from "@/server/modules/clients/clients.service";
import { createTestimonial } from "@/server/modules/testimonials/testimonials.service";
import { createCareer } from "@/server/modules/careers/careers.service";
import { saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { saveHomePage } from "@/server/modules/home/home.service";

const SAMPLE_SOURCE = "[SAMPLE] placeholder, not a verified figure";

/**
 * DEVELOPMENT SAMPLE CONTENT ONLY. Every string is prefixed "[SAMPLE]".
 * It exists so the frontend can build every Home section against a real API
 * response. It contains no real business claims: metric values are the literal
 * text "[SAMPLE]", there are no real client names, testimonials or statistics,
 * and the only media is the hero banner (public/media/main-banner.png; the other sections simply have no image). Never run against production.
 */
export async function seedDevelopmentContent(db: Db) {
  const service = await createService(db, {
    name: "[SAMPLE] Service",
    slug: "sample-service",
    shortDescription: "[SAMPLE] Placeholder service description.",
    description: "[SAMPLE] Placeholder service body.",
    hero: { heading: "[SAMPLE] Service hero heading", label: "[SAMPLE] Eyebrow", supportingCopy: "[SAMPLE] Placeholder hero copy.", ctas: [{ label: "[SAMPLE] Talk to us", target: "/contact" }] },
    problem: { title: "[SAMPLE] Problem title", description: "[SAMPLE] Placeholder problem copy." },
    solution: { title: "[SAMPLE] Solution title", description: "[SAMPLE] Placeholder solution copy." },
    deliverables: [{ title: "[SAMPLE] Deliverable 1", description: "[SAMPLE] Placeholder." }, { title: "[SAMPLE] Deliverable 2", description: "[SAMPLE] Placeholder." }],
    process: [{ title: "[SAMPLE] Step 1", description: "[SAMPLE] Placeholder." }, { title: "[SAMPLE] Step 2", description: "[SAMPLE] Placeholder." }],
    tools: [{ name: "[SAMPLE] Tool A" }, { name: "[SAMPLE] Tool B", description: "[SAMPLE] Placeholder." }],
    faqs: [{ question: "[SAMPLE] Question?", answer: "[SAMPLE] Placeholder answer." }],
    cta: { label: "[SAMPLE] Discuss your requirements", target: "/contact" },
    status: "published",
  });
  const client = await createClient(db, { name: "[SAMPLE] Client", status: "published" });
  const testimonial = await createTestimonial(db, {
    quote: "[SAMPLE] Placeholder testimonial, not a real quote.",
    personName: "[SAMPLE] Person",
    personRole: "[SAMPLE] Role",
    companyName: "[SAMPLE] Company",
    clientId: client.id,
    status: "published",
  });
  const caseStudy = await createCaseStudy(db, {
    title: "[SAMPLE] Case study",
    slug: "sample-case-study",
    summary: "[SAMPLE] Placeholder case study summary.",
    challenge: "[SAMPLE] Placeholder challenge.",
    strategy: "[SAMPLE] Placeholder strategy.",
    execution: "[SAMPLE] Placeholder execution.",
    clientId: client.id,
    testimonialId: testimonial.id,
    industry: "[SAMPLE] Industry",
    results: [{ label: "[SAMPLE] Result", value: "[SAMPLE]", source: SAMPLE_SOURCE }],
    status: "published",
    relatedServiceIds: [service.id],
  });
  const author = await createTeamMember(db, { name: "[SAMPLE] Team member", role: "[SAMPLE] Role", group: "[SAMPLE] Group", status: "published" });
  await createCareer(db, {
    title: "[SAMPLE] Career role",
    slug: "sample-role",
    summary: "[SAMPLE] Placeholder role summary.",
    description: "[SAMPLE] Placeholder role description.",
    requirements: ["[SAMPLE] Placeholder requirement."],
    responsibilities: ["[SAMPLE] Placeholder responsibility."],
    location: "[SAMPLE] Location",
    employmentType: "full-time",
    status: "published",
  });
  const insight = await createInsight(db, {
    title: "[SAMPLE] Insight",
    slug: "sample-insight",
    excerpt: "[SAMPLE] Placeholder excerpt.",
    content: "[SAMPLE] Placeholder article body.",
    category: "[SAMPLE] Category",
    authorId: author.id,
    status: "published",
    relatedServiceIds: [service.id],
    relatedCaseStudyIds: [caseStudy.id],
  });
  await saveSiteSettings(db, {
    siteName: "[SAMPLE] Site name",
    contact: { email: "sample@example.com", phone: "+00 0000 000000", whatsapp: "+00 0000 000000", address: "[SAMPLE] Address line 1 & line 2" },
    socialLinks: [{ platform: "Instagram", url: "https://example.com/instagram" }, { platform: "Twitter", url: "https://example.com/twitter" }, { platform: "LinkedIn", url: "https://example.com/linkedin" }],
  });

  const item = (n: number) => ({ title: `[SAMPLE] Item ${n}`, description: `[SAMPLE] Placeholder description ${n}.` });
  const metric = (label: string) => ({ label, value: "[SAMPLE]", description: "[SAMPLE] Placeholder metric.", source: SAMPLE_SOURCE });
  await saveHomePage(db, {
    hero: {
      label: "[SAMPLE] Eyebrow",
      heading: "[SAMPLE] Hero heading",
      supportingCopy: "[SAMPLE] Placeholder supporting text.",
      ctas: [{ label: "[SAMPLE] Primary action", target: "/contact" }, { label: "[SAMPLE] Secondary action", target: `/services/${service.slug}` }],
      media: { url: "/media/main-banner.png", alt: "", decorative: true, width: 2880, height: 1768 },
    },
    businessProof: { heading: "[SAMPLE] Business proof", items: [metric("[SAMPLE] Proof A"), metric("[SAMPLE] Proof B")] },
    story: { eyebrow: "[SAMPLE] Story", heading: "[SAMPLE] Story heading", description: "[SAMPLE] Placeholder story.", points: [item(1), item(2)], cta: { label: "[SAMPLE] About", target: "/about" } },
    servicesSection: { heading: "[SAMPLE] Services", cta: { label: "[SAMPLE] View all", target: "/services" } },
    growthEngine: { heading: "[SAMPLE] Growth engine", description: "[SAMPLE] Placeholder.", steps: [item(1), item(2), item(3)] },
    selectedWorkSection: { heading: "[SAMPLE] Selected work", cta: { label: "[SAMPLE] Work with us", target: "/contact" } },
    results: { heading: "[SAMPLE] Results", items: [metric("[SAMPLE] Result A")] },
    whySmash: { heading: "[SAMPLE] Why", items: [item(1), item(2)] },
    testimonialsSection: { heading: "[SAMPLE] Testimonials" },
    technology: { heading: "[SAMPLE] Technology", items: [{ name: "[SAMPLE] Platform A" }, { name: "[SAMPLE] Platform B", description: "[SAMPLE] Placeholder." }] },
    insightsSection: { heading: "[SAMPLE] Insights" },
    cta: { eyebrow: "[SAMPLE] Next step", heading: "[SAMPLE] CTA heading", description: "[SAMPLE] Placeholder.", cta: { label: "[SAMPLE] Contact", target: "/contact" } },
    bannerCta: { heading: "[SAMPLE] Banner heading", cta: { label: "[SAMPLE] Banner action", target: "/contact" } },
    industries: { heading: "[SAMPLE] Industries", items: [{ name: "[SAMPLE] Industry A" }, { name: "[SAMPLE] Industry B" }] },
    ourStory: { eyebrow: "[SAMPLE] Our story", heading: "[SAMPLE] Our story heading", lead: "[SAMPLE] Lead line.", description: "[SAMPLE] Placeholder story body.", cta: { label: "[SAMPLE] About", target: "/about" } },
    teamSection: { heading: "[SAMPLE] Team" },
    seo: { metaTitle: "[SAMPLE] Home SEO title", metaDescription: "[SAMPLE] Home SEO description placeholder." },
    serviceIds: [service.id],
    teamIds: [author.id],
    caseStudyIds: [caseStudy.id],
    testimonialIds: [testimonial.id],
    insightIds: [insight.id],
    status: "published",
  });
}
