"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The one place primary navigation decides "is this the current page"
 * (Stage 4, Phase 8 §8 — nav had no active-state indicator at all before this).
 * A hub link (e.g. "Work") is also current on its own detail pages
 * (`/work/[slug]`), matching how a user actually reads the nav while deep in
 * a section. `aria-current="page"` is the semantic signal (screen readers,
 * `:not([aria-current])` styling hooks) — no new visual design is invented,
 * this only exposes state that already exists (the current URL).
 */
export function NavLink({ href, onClick, children }: { href: string; onClick?: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const isCurrent = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={isCurrent ? "page" : undefined} onClick={onClick}>
      {children}
    </Link>
  );
}
