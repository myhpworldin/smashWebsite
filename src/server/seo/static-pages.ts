import { ROUTES } from "@/lib/routes";
import type { SeoSource } from "@/server/seo/metadata";
import type { Seo } from "@/server/validation/common";
import type { searchIntentValues } from "@/server/validation/common";

/**
 * SEO source for pages with no database record. `title` is the page name (breadcrumbs use it too); `metaTitle` and
 * `metaDescription` are the search-result copy, written from what each page actually says. A page without them falls
 * back to its name and the site default description — which every such page would then share, so give each its own.
 */
type StaticPage = {
  title: string;
  /** Search-result title (the site name is appended); omit to use `title`. */
  metaTitle?: string;
  searchIntent: (typeof searchIntentValues)[number];
  /** Omitted (indexable) by default; set false for a built page with no approved content yet. */
  robotsIndex?: boolean;
  /** Approved page-specific description; omit to fall back to the site default rather than invent copy. */
  metaDescription?: string;
};

export const STATIC_PAGES: Record<string, StaticPage> = {
  [ROUTES.ABOUT]: {
    title: "About",
    metaTitle: "About Our Growth Marketing Agency",
    searchIntent: "navigational",
    metaDescription: "SMASH is a full-service growth and marketing agency in Kochi, Kerala, built by operators, strategists, creatives and technologists who move businesses forward.",
  },
  [ROUTES.SERVICES]: {
    title: "Services",
    metaTitle: "Digital Marketing Services in Kerala",
    searchIntent: "commercial",
    metaDescription: "Meta and Google Ads, lead generation, social media, creative and video, websites, CRM, automation and WhatsApp engagement from one team in Kochi, Kerala.",
  },
  [ROUTES.WORK]: {
    title: "Our Work",
    metaTitle: "Our Work: Marketing Case Studies",
    searchIntent: "commercial",
    metaDescription: "SMASH case studies: Facebook and Instagram lead generation campaigns that turned real offers into customer enquiries, and the strategy behind each one.",
  },
  [ROUTES.INSIGHTS]: {
    title: "Insights",
    metaTitle: "Insights on Digital Marketing & Growth",
    searchIntent: "informational",
    metaDescription: "Practical articles from SMASH on performance marketing, social media, creative, technology and customer engagement for businesses that want measurable growth.",
  },
  [ROUTES.CAREERS]: {
    title: "Careers",
    metaTitle: "Careers in Digital Marketing, Kochi",
    searchIntent: "navigational",
    metaDescription: "Join SMASH in Kochi, Kerala: a team of strategists, creators and growth marketers. See our open roles, or introduce yourself if none fits right now.",
  },
  [ROUTES.CONTACT]: {
    title: "Contact",
    metaTitle: "Contact Us: Start a Growth Project",
    searchIntent: "transactional",
    metaDescription: "Tell SMASH what you want to grow: your brand, your leads or your business. Send a strategy request, call or WhatsApp us, or visit our office in Kochi, Kerala.",
  },
  [ROUTES.FAQ]: {
    title: "Frequently Asked Questions",
    searchIntent: "informational",
    metaDescription: "Answers to common questions about SMASH: our growth, creative, technology and customer engagement services, the Growth Engine and how to get started.",
  },
  // The Legal pages now carry full copy (src/lib/legal-content.ts) but stay noindex until management / legal sign it
  // off (PAGE_SPECIFICATIONS.md §14). To publish them to search engines, drop `robotsIndex: false` here and update
  // the two tests that pin it (tests/seo-metadata.test.ts, tests/indexing.test.ts).
  [ROUTES.PRIVACY_POLICY]: {
    title: "Privacy Policy",
    searchIntent: "navigational",
    robotsIndex: false,
    metaDescription: "How SMASH collects, uses, shares and protects personal information gathered through this website, and the rights and choices you have.",
  },
  [ROUTES.TERMS]: {
    title: "Terms & Conditions",
    searchIntent: "navigational",
    robotsIndex: false,
    metaDescription: "The terms that apply when you use the SMASH website: acceptable use, intellectual property, disclaimers, liability and governing law.",
  },
  [ROUTES.COOKIE_POLICY]: {
    title: "Cookie Policy",
    searchIntent: "navigational",
    robotsIndex: false,
    metaDescription: "The cookies and similar technologies the SMASH website uses, why, how long they last and how to control them.",
  },
};

export const HOME_LABEL = "Home";

export function staticPageSource(path: string): SeoSource | null {
  const page = STATIC_PAGES[path];
  if (!page) return null;
  return { path, status: "published", title: page.title, seo: { searchIntent: page.searchIntent, robotsIndex: page.robotsIndex, metaTitle: page.metaTitle, metaDescription: page.metaDescription } };
}

/**
 * The Insights hub while no article is published: it only says "No insights published yet", so it is kept out of search
 * (noindex, still followed) and out of the sitemap until the first article goes live, then both switch back on their own.
 * The page's metadata and the sitemap both use this, so they cannot disagree. Approved by the business, 2026-10-23.
 */
export const insightsHubSeo = (publishedCount: number): Partial<Seo> => (publishedCount > 0 ? {} : { robotsIndex: false });
