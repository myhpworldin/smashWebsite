"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Pages whose full-bleed hero sits behind the header (Home, About, Contact, Services, Careers, Our Work).
 * Our Work uses the same `PageHero` as the others (`src/app/work/page.tsx`) — it was missing here, which left
 * the header rendered as an in-flow solid bar instead of floating over the hero, doubling PageHero's own
 * top padding (calibrated for a floating header) and misplacing its background glows (Phase 7 audit).
 */
const HERO_PATHS = ["/", "/about", "/contact", "/services", "/careers", "/work"];

/**
 * Every individual service offering page (`/services/[category]/[offering]`, e.g. `/services/growth/meta-ads`)
 * also uses `PageHero` (Service Detail, Figma node 165:306) — 19 distinct dynamic paths, too many to list
 * exactly like `HERO_PATHS` above, so matched by pattern instead. Found live: without this, the header rendered
 * solid instead of floating, which both doubled `PageHero`'s top padding (same defect as the `/work` fix above)
 * and left the page's breadcrumbs sitting in a jarring white strip sandwiched between two navy blocks (the
 * solid header and the hero), since they were rendered in a separate section before the hero.
 */
const SERVICE_OFFERING_PATH = /^\/services\/[a-z0-9-]+\/[a-z0-9-]+$/;

/**
 * On those pages the header floats over the hero (transparent, white text);
 * every other page has no hero behind it, so it gets a solid brand bar.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const overHero = HERO_PATHS.includes(pathname) || SERVICE_OFFERING_PATH.test(pathname);
  return (
    <header className={overHero ? "absolute inset-x-0 top-0 z-40 text-white" : "relative z-40 bg-deep-blue text-white"}>
      {children}
    </header>
  );
}
