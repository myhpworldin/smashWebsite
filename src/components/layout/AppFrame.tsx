"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import styles from "./AppFrame.module.css";

export type FrameNavItem = { href: string; label: string; icon: ReactNode; exact?: boolean };

const COLLAPSE_PREFIX = "app.sidebar.collapsed.";

/**
 * The signed-in frame shared by the CRM and the client portal: a navy sidebar (logo, the pages, the person signed in and a sign-out)
 * beside the page. On a wide screen it is fixed and can shrink to an icon rail (remembered per area); below 1024px it becomes a drawer
 * opened from a slim top bar. Navigation is one list, so the active page is marked once: `/area` home matches only itself (`exact`),
 * the rest also match their sub-pages. `theme` turns on the matching token layer (`data-admin-theme` / `data-client-theme`, globals.css).
 * The frame is exactly one screen tall and the page scrolls inside it (the sidebar never moves), so there is nothing below the frame to
 * bounce into or reveal. The page content is passed through untouched, so it stays server-rendered.
 */
export function AppFrame({ theme, homeHref, homeLabel, tag, nav, who, avatar, subtitle, logout, footer, children }: {
  theme: "admin" | "client";
  homeHref: string;
  homeLabel: string;
  tag: string;
  nav: FrameNavItem[];
  who: string;
  avatar: string;
  subtitle: string;
  logout: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Starts expanded to match the server render, then syncs from the stored preference on mount (localStorage does not exist during SSR).
  const [collapsed, setCollapsed] = useState(false);
  const key = COLLAPSE_PREFIX + theme;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, unreadable during SSR
      if (localStorage.getItem(key) === "1") setCollapsed(true);
    } catch {
      // Blocked storage: keep the default (expanded).
    }
  }, [key]);

  // The page scrolls inside the frame, not the window, so the browser's own "new page starts at the top" does not apply: do it here.
  const column = useRef<HTMLDivElement>(null);
  useEffect(() => { column.current?.scrollTo({ top: 0, left: 0 }); }, [pathname]);

  // Moving to another page closes the drawer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the drawer in response to a route change
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(key, next ? "1" : "0"); } catch { /* in-memory state still updates */ }
      return next;
    });
  }

  const themeAttr = { [`data-${theme}-theme`]: "" };

  return (
    <div className={styles.shell} {...themeAttr}>
      <header className={styles.mobileBar}>
        <button type="button" className={styles.menuButton} onClick={() => setOpen(true)} aria-label="Open navigation menu" aria-expanded={open}>
          <Menu size={20} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <Link href={homeHref} className={styles.mobileBrand} aria-label={homeLabel}>
          <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={96} height={34} className={styles.logo} />
        </Link>
        <span className={styles.mobileAvatar} aria-hidden="true">{avatar}</span>
      </header>

      <div className={styles.scrim} data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={styles.rail} data-open={open} data-collapsed={collapsed} aria-label={`${tag} sidebar`}>
        <span className={styles.glow} aria-hidden="true" />
        <div className={styles.head}>
          <Link href={homeHref} className={styles.brand} aria-label={homeLabel}>
            <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={104} height={37} className={styles.logo} priority />
            <span className={styles.mark} aria-hidden="true">S</span>
          </Link>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
        <span className={styles.tag}>{tag}</span>

        <nav className={styles.nav} aria-label={tag}>
          {nav.map(({ href, label, icon, exact }, i) => {
            const current = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={styles.link} aria-current={current ? "page" : undefined} data-tip={label} style={{ "--i": i } as React.CSSProperties}>
                <span className={styles.icon}>{icon}</span>
                <span className={styles.label}>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.foot}>
          <div className={styles.account}>
            <span className={styles.avatar} aria-hidden="true">{avatar}</span>
            <span className={styles.who}>
              <span className={styles.name}>{who}</span>
              <span className={styles.sub}>{subtitle}</span>
            </span>
          </div>
          {logout}
          <button type="button" className={styles.collapse} onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} data-tip={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.9} aria-hidden="true" /> : <PanelLeftClose size={18} strokeWidth={1.9} aria-hidden="true" />}
            <span className={styles.label}>Collapse</span>
          </button>
        </div>
      </aside>

      <div className={styles.column} ref={column}>
        {/* The root layout already provides <main id="main-content">, so this is a plain block, not a second main landmark. */}
        <div className={styles.content}>{children}</div>
        {footer ? <footer className={styles.pageFoot}>{footer}</footer> : null}
      </div>
    </div>
  );
}
