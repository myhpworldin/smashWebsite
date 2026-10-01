import { LIVE_STATIC_ROUTES, ROUTES } from "@/lib/routes";

/**
 * The approved sitemap's terminology (SEO_SITE_ARCHITECTURE.md), not invented
 * labels. `available` mirrors the exact rule already used by the Home API's
 * `links` block (HOME_PAGE_CONTRACT.md): a route with no page file yet must
 * not be linked to, or it would 404. Navigation grows automatically as pages
 * ship — no code change here is needed when a hub page file is added, only an
 * update to LIVE_STATIC_ROUTES (already required by an existing test).
 */
const NAV_ROUTES: { label: string; path: string }[] = [
  { label: "About", path: ROUTES.ABOUT },
  { label: "Services", path: ROUTES.SERVICES },
  { label: "Work", path: ROUTES.WORK },
  { label: "Insights", path: ROUTES.INSIGHTS },
  { label: "Careers", path: ROUTES.CAREERS },
  { label: "Contact", path: ROUTES.CONTACT },
];

export type NavItem = {
  label: string;
  path: string;
  available: boolean;
  /** Sub-links shown in a dropdown (desktop) / nested list (mobile). */
  children?: { label: string; path: string; /** A child's own sub-links (e.g. a service category's individual services), shown as a flyout (desktop) / nested list (mobile). */ offerings?: { label: string; path: string }[] }[];
};

export function getPrimaryNav(): NavItem[] {
  return NAV_ROUTES.map((item) => ({ ...item, available: LIVE_STATIC_ROUTES.includes(item.path) }));
}
