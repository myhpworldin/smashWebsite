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
  // Stage 4, Phase 7: routed and rendered, but noindex until management supplies
  // approved legal copy (PAGE_SPECIFICATIONS.md §14) — an honest "built, not yet
  // indexable" state, not a fabricated policy. Flip robotsIndex once real content lands.
  [ROUTES.PRIVACY_POLICY]: { title: "Privacy Policy", searchIntent: "navigational", robotsIndex: false },
  [ROUTES.TERMS]: { title: "Terms of Use", searchIntent: "navigational", robotsIndex: false },
  [ROUTES.COOKIE_POLICY]: { title: "Cookie Policy", searchIntent: "navigational", robotsIndex: false },
};

export const HOME_LABEL = "Home";

export function staticPageSource(path: string): SeoSource | null {
  const page = STATIC_PAGES[path];
  if (!page) return null;
  return { path, status: "published", title: page.title, seo: { searchIntent: page.searchIntent, robotsIndex: page.robotsIndex, metaDescription: page.metaDescription } };
}
