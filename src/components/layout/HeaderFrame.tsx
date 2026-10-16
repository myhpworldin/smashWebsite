"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/** Terms, Privacy and Cookie policies: the same SheetHero as About and Contact, so the same floating pill header. */
const LEGAL_PATHS = [ROUTES.TERMS, ROUTES.PRIVACY_POLICY, ROUTES.COOKIE_POLICY];

/**
 * Pages whose full-bleed hero sits behind the header (Home, About, Contact, Services, Careers, Our Work).
 * Our Work uses the same `PageHero` as the others (`src/app/work/page.tsx`) — it was missing here, which left
 * the header rendered as an in-flow solid bar instead of floating over the hero, doubling PageHero's own
 * top padding (calibrated for a floating header) and misplacing its background glows (Phase 7 audit).
 */
const HERO_PATHS = ["/", "/about", "/contact", "/services", "/careers", "/work", ...LEGAL_PATHS];

/**
 * Every individual service offering page (`/services/[category]/[offering]`, e.g. `/services/growth/meta-ads`)
 * also uses `PageHero` (Service Detail, Figma node 165:306) — 19 distinct dynamic paths, too many to list
 * exactly like `HERO_PATHS` above, so matched by pattern instead. Found live: without this, the header rendered
 * solid instead of floating, which both doubled `PageHero`'s top padding (same defect as the `/work` fix above)
 * and left the page's breadcrumbs sitting in a jarring white strip sandwiched between two navy blocks (the
 * solid header and the hero), since they were rendered in a separate section before the hero.
 */
/** Pages redesigned in the Home language (Home, About, Contact, Services): their header is the frosted pill. */
const PILL_PATHS = ["/", "/about", "/contact", "/services", ...LEGAL_PATHS];

/** A service category (`/services/growth`) or one of its offerings (`/services/growth/meta-ads`): both open on the dark SheetHero. */
const SERVICE_DETAIL_PATH = /^\/services\/[a-z0-9-]+(\/[a-z0-9-]+)?$/;

/** Our Work and Careers, and one case study / role of each: all open on the dark SheetHero too. */
const WORK_PATH = /^\/(work|careers)(\/[a-z0-9-]+)?$/;

/**
 * On those pages the header floats over the hero (transparent, white text);
 * every other page has no hero behind it, so it gets a solid brand bar.
 * The redesigned pages (Home — Figma "Smash Redesign" — and About) additionally set `data-pill`, which Header uses to draw its bar as
 * the design's frosted pill; the other pages keep the previous layout until they are redesigned too.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const overHero = HERO_PATHS.includes(pathname) || SERVICE_DETAIL_PATH.test(pathname) || WORK_PATH.test(pathname);
  return (
    <header data-pill={PILL_PATHS.includes(pathname) || SERVICE_DETAIL_PATH.test(pathname) || WORK_PATH.test(pathname) ? "" : undefined} className={`group/header ${overHero ? "absolute inset-x-0 top-0 z-40 text-white" : "relative z-40 bg-deep-blue text-white"}`}>
      {children}
    </header>
  );
}
