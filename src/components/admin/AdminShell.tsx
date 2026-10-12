"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import type { PublicAdminUser } from "@/server/modules/admin-users/admin-users.service";
import styles from "./AdminShell.module.css";

const COLLAPSE_KEY = "admin.sidebar.collapsed";

/**
 * The CRM's persistent chrome (Phase 4 brief, Step 5): sidebar + topbar + content, reused across every
 * `/admin/(protected)/**` page via the one layout that already renders this (`layout.tsx`, Phase 2) —
 * navigating between admin pages re-renders only `children`, never this shell. A client component
 * only because the mobile drawer's open/closed state and the desktop collapse preference have to live
 * somewhere both `AdminTopbar`/`AdminSidebar` can reach; `children` is still the server-rendered page
 * content, passed through untouched (the same pattern `SiteChrome.tsx` already uses for the public
 * Header/Footer). `data-admin-theme` here is the one place the admin token layer (globals.css) turns on.
 */
export function AdminShell({ admin, children }: { admin: PublicAdminUser; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Starts false to match the server-rendered markup, then syncs from the stored preference on
  // mount — a one-frame "expanded" flash on repeat visits is an acceptable trade for never hitting
  // a hydration mismatch (localStorage isn't available during SSR).
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // localStorage doesn't exist during SSR, so this can only be read post-mount; the one-time
      // sync-from-external-store setState here is the deliberate exception to the "don't setState in
      // an effect" rule, not a missed derivation.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, unreadable during SSR
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      // Private browsing / blocked storage: silently keep the default (expanded).
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Nothing to persist to; the in-memory state still updates for this session.
      }
      return next;
    });
  }

  return (
    <div className={styles.shell} data-admin-theme="">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <div className={styles.column}>
        <AdminTopbar admin={admin} onMenuClick={() => setMenuOpen(true)} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
