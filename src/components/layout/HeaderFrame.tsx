"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Pages whose full-bleed hero sits behind the header (Home, Contact, Services, Careers). */
const HERO_PATHS = ["/", "/contact", "/services", "/careers"];

/**
 * On those pages the header floats over the hero (transparent, white text);
 * every other page has no hero behind it, so it gets a solid brand bar.
 */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const overHero = HERO_PATHS.includes(usePathname());
  return (
    <header className={overHero ? "absolute inset-x-0 top-0 z-40 text-white" : "relative z-40 bg-deep-blue text-white"}>
      {children}
    </header>
  );
}
