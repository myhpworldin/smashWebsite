/**
 * The search and social copy for the pages whose metadata lives in the database: the four service categories (with the
 * introduction each category page shows), every offering page, Home, the case studies, and the brand fields of Site
 * Settings. Written only from what each page already says: no results, clients or claims are added.
 *
 * Titles are the page part only; the site name (" | SMASH Digital Media") is appended by resolveMetadata, so each stays
 * at or under 38 characters to keep the full title near 60. Descriptions are 120–160 characters.
 * `scripts/update-service-seo-copy.ts` writes this into the database; `npm run seo:audit` checks the result.
 */
import { SERVICE_SUMMARIES } from "@/server/db/services-design-content";

export type PageSeo = { metaTitle: string; metaDescription: string };

/** A category page: the hero summary (the same approved line Home's service cards show), its introduction and its metadata. */
export type CategoryCopy = { shortDescription: string; description: string; seo: PageSeo };

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
  growth: {
    shortDescription: SERVICE_SUMMARIES.growth,
    description: [
      "Growth is the performance marketing side of SMASH: paid media and conversion work for businesses that need advertising to produce enquiries and sales, not just reach. We plan, run and improve campaigns on Meta and Google for businesses in Kochi, across Kerala and throughout India.",
      "The work covers the whole path to a lead. Meta Ads and Google Ads put the right offer in front of people ready to act. Lead generation shapes the proposition, landing experience and qualification behind each campaign. Remarketing brings interested visitors back without wearing them out, and conversion optimisation removes the friction that stops traffic turning into action.",
      "Every campaign is set up with clear tracking and reporting tied to your business goals, so budget decisions rest on evidence: what is producing qualified opportunities, what is wasting spend and what is worth scaling next.",
    ].join("\n\n"),
    seo: {
      metaTitle: "Growth Marketing: Meta & Google Ads",
      metaDescription: "Performance marketing from SMASH in Kochi: Meta Ads, Google Ads, lead generation, remarketing and conversion optimisation, measured against business goals.",
    },
  },
  "social-and-creative": {
    shortDescription: SERVICE_SUMMARIES["social-and-creative"],
    description: [
      "Social & Creative is where SMASH plans and produces the content your audience actually sees: the posts, campaigns and videos that carry your brand across Instagram, Facebook and the other platforms that matter to your customers.",
      "It covers two kinds of work. Campaign concepts turn your positioning into one ownable idea that every asset can be built from. Social media management, daily creatives, video ads and AI video then keep that idea moving, with a planned publishing rhythm, a steady flow of on-brand designs, short-form video made for advertising placements, and AI-assisted production where it genuinely speeds things up.",
      "The result is a brand that looks and sounds the same everywhere, content that is ready when your channels and campaigns need it, and creative that gets better as live performance shows what works.",
    ].join("\n\n"),
    seo: {
      metaTitle: "Social Media & Creative Services",
      metaDescription: "Social media management, campaign concepts, daily creatives, video ads and AI video from SMASH in Kochi, built to keep your brand consistent and visible.",
    },
  },
  technology: {
    shortDescription: SERVICE_SUMMARIES.technology,
    description: [
      "Technology is the digital infrastructure behind your marketing: the website people judge your business by, the pages your campaigns send traffic to, and the systems that hold your leads and customer data. SMASH plans and builds it for businesses in Kerala and across India that need their tools to support growth rather than slow it down.",
      "We build responsive websites and focused landing pages, set up and improve CRM structures, automate repetitive manual steps, and connect the tools you already use through integrations, so data moves reliably between your forms, CRM, messaging and reporting.",
      "Because this work is planned alongside SMASH's marketing and customer engagement services, tracking, lead capture and follow-up are designed in from the start instead of being added later.",
    ].join("\n\n"),
    seo: {
      metaTitle: "Websites, CRM & Automation Services",
      metaDescription: "Websites, landing pages, CRM, automation and integrations from SMASH in Kochi, Kerala, built so your marketing, data and sales follow-up work as one system.",
    },
  },
  "customer-engagement": {
    shortDescription: SERVICE_SUMMARIES["customer-engagement"],
    description: [
      "Customer Engagement covers what happens after someone shows interest. An enquiry that waits too long, reaches the wrong person or never hears back is wasted marketing spend, so SMASH builds the systems and routines that turn enquiries into conversations, and conversations into customers.",
      "WhatsApp marketing gives you organised, segmented messaging and broadcasts on a channel your customers already use every day. A lead management system gives every enquiry a clear stage, owner and alert. Call centre support structures inbound and outbound calls around a defined next step, and conversion follow-up keeps open opportunities moving without pressure or duplication.",
      "Together they give your team a visible, consistent process from first enquiry to closed sale, with reporting that shows where opportunities are moving and where they stall.",
    ].join("\n\n"),
    seo: {
      metaTitle: "Customer Engagement: WhatsApp & Leads",
      metaDescription: "WhatsApp marketing, lead management, call centre support and conversion follow-up from SMASH, so every enquiry gets an owner and a clear next step.",
    },
  },
};

/** Each offering page's metadata, by offering slug, condensed from that page's own "What SMASH Provides" copy. */
export const OFFERING_SEO: Record<string, PageSeo> = {
  "meta-ads": {
    metaTitle: "Meta Ads Agency: Facebook & Instagram",
    metaDescription: "Meta Ads management from SMASH in Kochi: strategy, audiences, campaign setup, creative, budget control, testing and clear reporting on Facebook and Instagram.",
  },
  "google-ads": {
    metaTitle: "Google Ads Management: Search & PMax",
    metaDescription: "Google Ads management from SMASH: Search, Performance Max, display and YouTube campaigns with clear tracking, disciplined budgets and goal-based reporting.",
  },
  "lead-generation": {
    metaTitle: "Lead Generation Services in Kerala",
    metaDescription: "Lead generation from SMASH: the offer, channel mix, landing pages, qualification and tracking needed to bring in qualified leads and hand them to sales quickly.",
  },
  remarketing: {
    metaTitle: "Remarketing & Retargeting Campaigns",
    metaDescription: "Remarketing from SMASH brings interested visitors back with segmented audiences, sequenced creative and controlled frequency, so follow-up helps, not tires.",
  },
  "conversion-optimisation": {
    metaTitle: "Conversion Rate Optimisation (CRO)",
    metaDescription: "Conversion optimisation from SMASH: journey, form and page analysis, then evidence-led experiments that remove friction from each step to an enquiry or sale.",
  },
  "social-media-management": {
    metaTitle: "Social Media Management in Kochi",
    metaDescription: "Social media management from SMASH: content planning, publishing, community management and regular performance reviews across the platforms your customers use.",
  },
  "campaign-concepts": {
    metaTitle: "Creative Campaign Concepts",
    metaDescription: "Campaign concepts from SMASH turn your positioning into one ownable creative idea, so every asset, channel and format in a campaign tells the same story.",
  },
  "daily-creatives": {
    metaTitle: "Daily Social Media Creatives",
    metaDescription: "Daily creatives from SMASH: a steady flow of on-brand social, campaign and performance designs, produced from clear briefs, templates and approvals.",
  },
  "video-ads": {
    metaTitle: "Video Advertising Production",
    metaDescription: "Video ads from SMASH: concept, script and short-form production built for advertising placements, adapted into the formats and variations each platform needs.",
  },
  "ai-videos": {
    metaTitle: "AI Video Production",
    metaDescription: "AI video production from SMASH: AI-assisted concepts, scenes, presenters, voice and versioning to scale video output, with brand fit reviewed at every step.",
  },
  websites: {
    metaTitle: "Website Design & Development, Kochi",
    metaDescription: "Website design and development from SMASH in Kochi: responsive business websites that explain what you do clearly and are built to support growth.",
  },
  "landing-pages": {
    metaTitle: "Landing Page Design & Development",
    metaDescription: "Landing pages from SMASH: focused campaign pages that combine message, proof, UX and tracking around one action, so more clicks turn into enquiries.",
  },
  crm: {
    metaTitle: "CRM Setup & Customisation",
    metaDescription: "CRM services from SMASH: selecting, configuring and improving your CRM so your team captures leads consistently and sees every customer and next step.",
  },
  automation: {
    metaTitle: "Business Process Automation",
    metaDescription: "Workflow automation from SMASH: we find repetitive manual work, design and test practical automations, and document them so your team moves faster.",
  },
  integrations: {
    metaTitle: "Software & API Integrations",
    metaDescription: "Integrations from SMASH connect the tools your business already uses, mapping data, APIs and workflows so information moves reliably without duplicate entry.",
  },
  "whatsapp-marketing": {
    metaTitle: "WhatsApp Marketing Services",
    metaDescription: "WhatsApp marketing from SMASH: audience segments, message journeys, templates, broadcasts and automation that make WhatsApp a useful, trackable channel.",
  },
  "lead-management": {
    metaTitle: "Lead Management System Setup",
    metaDescription: "A lead management system from SMASH: clear stages, rules, alerts and reporting that move every enquiry to the right owner and next action.",
  },
  "call-centre-support": {
    metaTitle: "Call Centre Support: Sales & Service",
    metaDescription: "Call centre support from SMASH: structured inbound and outbound call workflows, agent guidance, escalation and quality review for consistent conversations.",
  },
  "conversion-follow-up": {
    metaTitle: "Lead Conversion Follow-up",
    metaDescription: "Conversion follow-up from SMASH: sequences, channels, messages and tasks that follow up every enquiry and unfinished action without pressure or duplication.",
  },
};

/** The site-wide social preview image (Site Settings `defaultOgImage`), also Home's own, since Home's hero image is decorative and has no alt text. */
export const DEFAULT_OG_IMAGE = {
  url: "/media/main-banner.png",
  alt: "Abstract deep-blue light wave, the SMASH Digital Media brand backdrop",
  width: 2880,
  height: 1768,
};

/** Home's title is used as written (Home is never suffixed with the site name). */
export const HOME_SEO: PageSeo = {
  metaTitle: "SMASH | Performance Marketing Agency in Kochi, Kerala",
  metaDescription: "SMASH is a growth and performance marketing agency in Kochi, Kerala, combining strategy, creative, technology and customer engagement to help businesses grow.",
};

/** Case studies, by slug: each one's own campaign and result, as its page states them. */
export const CASE_STUDY_SEO: Record<string, PageSeo> = {
  core: {
    metaTitle: "CORE: 425 Refurbished Laptop Enquiries",
    metaDescription: "How a Facebook and Instagram lead generation campaign put CORE's refurbished laptop offers in front of the right buyers and produced 425 customer enquiries.",
  },
  "mobile-garage": {
    metaTitle: "Mobile Garage: 282 Repair Enquiries",
    metaDescription: "How a Facebook and Instagram lead generation campaign combined a 50% off service offer, targeted ads and reels to bring Mobile Garage 282 enquiries.",
  },
};

/** The public brand. The registered name stays where the law needs it (src/lib/company.ts). */
export const BRAND_NAME = "SMASH Digital Media";
