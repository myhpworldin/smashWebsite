"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { NavItem } from "@/lib/nav";
import { NavLink } from "@/components/layout/NavLink";
import styles from "./Header.module.css";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * Mobile navigation: a glass side drawer that slides in from the right over a blurred scrim.
 * The drawer is portalled to <body> (the header's backdrop-filter would otherwise become the containing block of
 * `position: fixed`) and stays mounted so the open/close slide can transition; while closed it is `inert` and hidden.
 * Escape and scrim click close it and focus returns to the trigger; the page behind is scroll-locked while open.
 * Services expands in place into its categories and offerings.
 */
export function MobileNavToggle({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = () => setOpen(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Items rise in one after another once the drawer is open.
  const reveal = (i: number) => ({
    className: `transition-[opacity,transform] duration-500 ${EASE} ${open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"}`,
    style: { transitionDelay: open ? `${140 + i * 60}ms` : "0ms" },
  });

  const available = items.filter((i) => i.available);

  const drawer = (
    <div className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none invisible delay-500"}`} style={{ transitionProperty: "visibility" }}>
      <div onClick={close} aria-hidden="true" className={`absolute inset-0 bg-[#02061a]/50 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} />
      <nav
        id="mobile-nav-panel"
        aria-label="Mobile"
        inert={!open}
        className={`absolute inset-y-0 right-0 flex w-[min(86vw,380px)] flex-col overflow-hidden rounded-l-[28px] border-l border-white/20 bg-gradient-to-b from-white/[0.16] to-[#0a1a5c]/60 text-white shadow-[-24px_0_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-500 ${EASE} ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-[#1f4fd8]/40 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-[#e90101]/25 blur-3xl" />

        <div className="relative flex items-center justify-between px-6 pb-4 pt-6">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Menu</span>
          <button ref={closeRef} type="button" onClick={close} aria-label="Close menu" className="flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <ul className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
          {available.map((item, i) => {
            const r = reveal(i);
            const isOpen = expanded === item.path;
            return (
              <li key={item.path} className={r.className} style={r.style}>
                {item.children ? (
                  <>
                    <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : item.path)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-xl font-medium text-white/90 transition hover:bg-white/10">
                      {item.label}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}><path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-400 ${EASE} ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="mx-2 mb-2 mt-1 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                          <NavLink href={item.path} onClick={close} className="text-sm font-medium text-white/80 underline-offset-4 hover:underline">All services →</NavLink>
                          {item.children.map((child) => (
                            <div key={child.path}>
                              {/* A category heading, not a link — only the individual services below route anywhere. */}
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff6b6b]">{child.label}</p>
                              {child.offerings?.length ? (
                                <ul className="mt-2 flex flex-col">
                                  {child.offerings.map((offering) => (
                                    <li key={offering.path}>
                                      <NavLink href={offering.path} onClick={close} className="block rounded-lg px-2 py-1.5 text-[15px] text-white/75 transition hover:bg-white/10 hover:text-white">{offering.label}</NavLink>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <NavLink href={item.path} onClick={close} className={`${styles.drawerLink} block rounded-2xl px-4 py-3.5 text-xl font-medium text-white/90 transition hover:bg-white/10`}>{item.label}</NavLink>
                )}
              </li>
            );
          })}
        </ul>

      </nav>
    </div>
  );

  return (
    <div className={styles.mobileNav}>
      <button ref={buttonRef} type="button" className={styles.menuButton} aria-label="Open menu" aria-expanded={open} aria-controls="mobile-nav-panel" onClick={() => setOpen(true)}>
        <svg width="32" height="32" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </div>
  );
}
