"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Hides the public site's Header/Footer on `/admin/**` — the CRM is a distinct internal application,
 * not a page within the public site (CRM Phase 2 brief: the admin login "should NOT look like the
 * public Contact page... should feel like an internal business application"). A client component
 * because a Server Component layout has no access to the current pathname; `Header`/`Footer` stay
 * Server Components themselves — they are passed in already rendered, so they keep fetching their own
 * data server-side exactly as before, this just decides whether to mount them.
 */
export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const isAdmin = usePathname()?.startsWith("/admin") ?? false;
  return (
    <>
      {isAdmin ? null : header}
      {children}
      {isAdmin ? null : footer}
    </>
  );
}
