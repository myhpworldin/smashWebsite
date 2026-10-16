import { ROUTES } from "@/lib/routes";
import type { SeoSource } from "@/server/seo/metadata";
import type { searchIntentValues } from "@/server/validation/common";

/**
 * SEO source for pages with no database record. Titles are the page names only;
 * descriptions are intentionally absent so they fall back to the site default
 * instead of inventing copy. Add `metaDescription` here once approved text exists.
 */
type StaticPage = {
  title: string;
  searchIntent: (typeof searchIntentValues)[number];
  /** Omitted (indexable) by default; set false for a built page with no approved content yet. */
  robotsIndex?: boolean;
  /** Approved page-specific description; omit to fall back to the site default rather than invent copy. */
  metaDescription?: string;
};

export const STATIC_PAGES: Record<string, StaticPage> = {
  [ROUTES.ABOUT]: { title: "About", searchIntent: "navigational" },
  [ROUTES.SERVICES]: { title: "Services", searchIntent: "commercial" },
  [ROUTES.WORK]: {
    title: "Our Work",
    searchIntent: "commercial",
    metaDescription: "Real SMASH case studies across growth, performance marketing, social & creative, technology and customer engagement — real work for real businesses.",
  },
  [ROUTES.INSIGHTS]: { title: "Insights", searchIntent: "informational" },
  [ROUTES.CAREERS]: { title: "Careers", searchIntent: "navigational" },
  [ROUTES.CONTACT]: { title: "Contact", searchIntent: "transactional" },
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
  return { path, status: "published", title: page.title, seo: { searchIntent: page.searchIntent, robotsIndex: page.robotsIndex, metaDescription: page.metaDescription } };
}
