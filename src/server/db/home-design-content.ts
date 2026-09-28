import type { Db } from "@/server/db/helpers";
import { findOneRow } from "@/server/db/helpers";
import { homePage, SINGLETON_ID } from "@/server/db/schema";
import { createService } from "@/server/modules/services/services.service";
import { createCaseStudy } from "@/server/modules/work/work.service";
import { createTeamMember } from "@/server/modules/team/team.service";
import { saveHomePage } from "@/server/modules/home/home.service";
import { getSiteSettings, saveSiteSettings } from "@/server/modules/site-settings/site-settings.service";
import { AppError } from "@/server/lib/errors";
import { catalogueFields, SERVICE_CATALOGUE } from "@/server/db/services-design-content";

/**
 * Home SEO, written from the approved positioning only (PAGE_SPECIFICATIONS.md: brand-navigational page for a
 * "growth partner"; the hero copy names strategy, creativity, technology and performance marketing). No figures,
 * rankings, superlatives or place names, and no keyword research is implied: the primary term is the brand.
 * The title carries the brand itself because the Home title is not suffixed with the site name.
 */
export const HOME_SEO = {
  metaTitle: "SMASH International | Growth & Performance Marketing Agency",
  metaDescription: "SMASH is an agency built from real business experience. We combine strategy, creativity, technology and performance marketing to help businesses grow.",
} as const;

/**
 * Global identity plus the design's own footer contact placeholders (Figma "footer-variation-3": phone, email,
 * "Smash Address line 1 & line 2"). Like the team members below, these are the design's stand-in values, not a
 * confirmed business phone/email/address — replace them in the CMS once the client provides the real ones.
 * Social links are left out entirely since the design gives icons only, no handles/URLs.
 */
export const SITE_IDENTITY = {
  siteName: "SMASH International",
  siteDescription: "Strategy, creativity, technology and performance marketing built from real business experience.",
  contact: {
    phone: "+91 1234567890",
    whatsapp: "+91 1234567890",
    email: "hello@smash.international",
    address: "Smash Address line 1 & line 2",
  },
} as const;

/** Recorded on every imported figure: the numbers come from the approved Figma design and still need the client's confirmation. */
const SOURCE = "Approved Figma homepage design (Smash Website Design); confirm with the client before launch";

const img = (url: string, alt: string, width: number, height: number) => ({ url, alt, width, height });
const decorative = (url: string, width: number, height: number) => ({ url, alt: "", decorative: true, width, height });

/**
 * Loads the copy of the approved Figma homepage into the CMS through the same services the admin API uses, so the
 * homepage can be edited from then on. The design's own placeholders are kept as they are and marked: the team
 * (names and "Designation"), and the case-study blurb (it ends mid-sentence in the design). Fields the design does not
 * cover (service page bodies, case-study details) carry the project's "[SAMPLE]" marker. Replace them in the CMS.
 *
 * Also saves the site identity (name, description) when Site Settings do not exist yet, and the Home SEO title and
 * description.
 *
 * Refuses to run when a Home record already exists, so it can never overwrite what an editor saved. Development
 * databases only (scripts/import-home-design.ts refuses production).
 */
export async function importHomeDesignContent(db: Db) {
  if (await findOneRow(db, homePage, { _id: SINGLETON_ID as never })) throw new Error("A Home record already exists; edit it in the CMS instead of importing over it.");

  // Site identity is global and only ever filled in when nothing exists, so an editor's Site Settings are never replaced.
  try {
    await getSiteSettings(db);
  } catch (err) {
    if (!(err instanceof AppError && err.code === "NOT_FOUND")) throw err;
    await saveSiteSettings(db, SITE_IDENTITY);
  }

  const services = [];
  for (const [i, group] of SERVICE_CATALOGUE.entries()) {
    services.push(await createService(db, { name: group.name, slug: group.slug, shortDescription: `[SAMPLE] ${group.name} short description.`, description: `[SAMPLE] ${group.name} page body, to be written.`, ...catalogueFields(group, i), status: "published" }));
  }

  // TODO (client): the design gives no case-study text beyond this blurb (which ends mid-sentence); replace with the approved summary, challenge, strategy and results.
  const blurb = "We turn interest into real business opportunities using structured follow-ups, CRM, WhatsApp, and call centre";
  const caseStudy = (title: string, slug: string, image: ReturnType<typeof img>) =>
    createCaseStudy(db, { title, slug, summary: blurb, challenge: "[SAMPLE] To be written.", heroImage: image, status: "published" });
  const cases = [
    await caseStudy("CORE", "core", img("/media/case-showroom-deep-blue.png", "Laptops on display tables in a retail showroom", 640, 448)),
    await caseStudy("Mobile Garage", "mobile-garage", img("/media/case-mobile-garage-warm-red.png", "A technician repairing a phone with a screwdriver", 640, 448)),
  ];

  // TODO (client): names, designations and photos are the design's placeholders.
  const person = (name: string, group: string, n: number) =>
    createTeamMember(db, { name, role: "Designation", group, photo: img(`/media/team-${n}.png`, `Portrait of ${name}`, 290, 298), displayOrder: n, status: "published" });
  const team = [
    await person("Peter Parker", "Founders & Partners", 1),
    await person("Michelle Jones", "Founders & Partners", 2),
    await person("Peter Parker", "Founders & Partners", 3),
    await person("Michelle Jones", "Team Members", 4),
    await person("Peter Parker", "Team Members", 5),
    await person("Michelle Jones", "Team Members", 6),
  ];

  const step = (title: string, description: string) => ({ title, description });
  const metric = (label: string, value: string, description: string) => ({ label, value, description, source: SOURCE });
  await saveHomePage(db, {
    hero: {
      label: "What did it for ourselves. Now, we do it for you.",
      heading: "We Built Business Before we built an agency",
      supportingCopy: "Strategy, creativity, technology and performance marketing built from real business experience.",
      ctas: [{ label: "Book a Strategy Call", target: "/contact" }, { label: "Explore Our Work", target: "/work" }],
      media: decorative("/media/main-banner.png", 2880, 1768),
    },
    whySmash: { items: [{ title: "We understand business" }, { title: "We execute marketing" }, { title: "We deliver measurable growth" }] },
    businessProof: {
      eyebrow: "Real Businesses. Real Scars. Real Scale.",
      heading: "Marketing learned by building businesses from the concrete floor up.",
      items: [
        metric("2 to", "400+ People", "What started with two people is now a team of 400+ professionals, working together to build, create and deliver."),
        metric("₹20 Lakhs to", "₹400 Crores", "From a small beginning to a large-scale operation, we’ve grown through smart strategy and a focus on long-term value."),
        metric("150 Sq. Ft. to", "Multi-location Retail Network", "From a 150 sq. ft. space to a multi-location retail network, we’ve expanded our presence and built a stronger connection with customers."),
      ],
    },
    bannerCta: { heading: "Let’s Grow your brand Together!", cta: { label: "Book a Strategy Call", target: "/contact" }, media: decorative("/media/banner-cta.png", 1320, 496) },
    story: {
      heading: "That experience became SMASH.",
      description:
        "We didn't sit in boardrooms writing theoretical frameworks. We managed supply chains. We hired hundreds of workers. We faced daily operating costs. When we spent money on advertising, it had to bring back customers - or we failed.\n\nSMASH is the consolidation of those concrete lessons, packaged to scale your enterprise with surgical operational focus.",
      points: ["WE MADE MISTAKES.", "WE TESTED.", "WE LEARNED.", "WE CHANGED.", "WE UNDERSTOOD CUSTOMERS.", "WE EXECUTED."].map((title) => ({ title })),
      cta: { label: "More About Us", target: "/about" },
    },
    servicesSection: { eyebrow: "Our Services", heading: "A Unified Agency Offering Built Around the Transaction.", cta: { label: "View All Services", target: "/services" } },
    growthEngine: {
      eyebrow: "Our Services",
      heading: "The SMASH Growth Engine",
      description: "A proven, end-to-end growth system that turns strategy into visibility, leads, conversions, and scalable business growth.",
      steps: [
        step("STRATEGY", "We understand your business, audience, goals, and opportunities before building the growth plan."),
        step("CREATE", "We turn the strategy into powerful campaigns, content, and communication that connect with your audience."),
        step("ATTRACT", "We reach the right audience through targeted marketing and performance-driven campaigns that generate awareness, traffic, and qualified leads."),
        step("CONVERT", "We turn interest into real business opportunities using structured follow-ups, CRM, WhatsApp, and call centre support to improve conversions."),
        step("OPTIMISE", "We track what’s working, identify what isn’t, and continuously improve performance for better results."),
        step("SCALE", "We invest more in what works, expand successful strategies, and create sustainable business growth."),
      ],
    },
    selectedWorkSection: { eyebrow: "Case Studies", heading: "Real campaigns. Real growth. Measurable results", cta: { label: "Let’s Work Together", target: "/contact" } },
    industries: {
      eyebrow: "Industries",
      heading: "Sectors We Scale",
      items: ["Retail", "Technology", "Education", "Healthcare", "Real Estate", "Hospitality", "Automotive", "Professional Services", "E-commerce", "Consumer Brands"].map((name) => ({ name })),
    },
    ourStory: {
      eyebrow: "Our Story",
      heading: "Built from Real Business Experience.",
      lead: "We Didn’t Just Study Business. We Built One.",
      description:
        "SMASH was built through years of real business experience starting small, navigating challenges, learning from mistakes, and discovering what it truly takes to build and grow a business.\nThat experience shapes how we work today. We combine business understanding, creative thinking, and practical execution to help brands solve real challenges and create meaningful growth.",
      media: decorative("/media/our-story.png", 569, 573),
      cta: { label: "More About Us", target: "/about" },
    },
    teamSection: { eyebrow: "Our Team", heading: "Meet the Team Behind the Work" },
    cta: {
      heading: "Let's Talk Growth",
      description: "Have a business challenge in mind? Let’s talk about where you are, where you want to go, and how we can help you get there.",
      cta: { label: "Contact Us", target: "/contact" },
    },
    seo: HOME_SEO,
    serviceIds: services.map((s) => s.id),
    caseStudyIds: cases.map((c) => c.id),
    teamIds: team.map((t) => t.id),
    status: "published",
  });
}
