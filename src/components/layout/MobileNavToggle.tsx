"use client";

import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/lib/nav";
import { NavLink } from "@/components/layout/NavLink";
import styles from "./Header.module.css";

/**
 * Mobile navigation disclosure. Kept as the one client component in the
 * header — everything else stays server-rendered. No animation library:
 * the panel's open/closed state is plain CSS, motion (if any) comes later
 * from the designer's motion spec (phase brief §26).
 *
 * Stage 3, Phase 8: the disclosure had no Escape-to-close, no focus return to
 * the trigger, and no outside-click dismissal — all baseline expectations for
 * this pattern (WAI-ARIA disclosure), not cosmetic. The panel itself is a
 * small anchored dropdown, not a full-screen overlay, so there is nothing
 * behind it to scroll-lock; that would only apply if a designer's spec later
 * called for a full-screen mobile overlay instead.
 */
export function MobileNavToggle({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className={styles.mobileNav} ref={containerRef}>
      <button ref={buttonRef} type="button" className={styles.menuButton} aria-expanded={open} aria-controls="mobile-nav-panel" onClick={() => setOpen((v) => !v)}>
        {open ? "Close menu" : "Menu"}
      </button>
      {open ? (
        <nav id="mobile-nav-panel" aria-label="Mobile" className={styles.mobilePanel}>
          <ul className={styles.navList}>
            {items.filter((i) => i.available).map((item) => (
              <li key={item.path}>
                <NavLink href={item.path} onClick={() => setOpen(false)}>{item.label}</NavLink>
                {item.children ? (
                  <ul className="mt-2 flex flex-col gap-2 border-l border-black/10 pl-4 text-[0.9375rem]">
                    {item.children.map((child) => (
                      <li key={child.path}>
                        <NavLink href={child.path} onClick={() => setOpen(false)}>{child.label}</NavLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
