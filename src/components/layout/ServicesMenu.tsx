"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Asset } from "@/components/home/shared";
import { NavLink } from "@/components/layout/NavLink";
import { ROUTES } from "@/lib/routes";

type Props = { label: string; href: string; items: { label: string; path: string; offerings?: { label: string; path: string }[] }[] };

/**
 * The header's "Services" item: the link itself still goes to /services, and the arrow beside it opens a single
 * mega-menu panel (WAI-ARIA disclosure) — "All Services" on top, then one column per category, each headed by the
 * category name with its individual services listed underneath. It opens on hover, on focus and on click/tap of the
 * arrow, and closes on Escape, on a click elsewhere, when focus leaves, and when a link in it is used.
 */
export function ServicesMenu({ label, href, items }: Props) {
  const [open, setOpen] = useState(false);
  // How far to nudge the panel off dead-centre so it stays clear of the viewport edge (mega-menu is wider than the nav bar's own space at narrower desktop widths).
  const [edgeShift, setEdgeShift] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const menuId = useId();
  // Set when hovering opened the menu, so the click that follows (aimed at the arrow) keeps it open instead of toggling it shut.
  const openedByHover = useRef(false);
  const close = () => {
    openedByHover.current = false;
    setOpen(false);
    setEdgeShift(0);
  };

  // Keeps the mega-menu on-screen: it's centred under the trigger by default, but at narrower desktop widths that can
  // push it past the viewport edge (the page itself never scrolls horizontally to accommodate it).
  useEffect(() => {
    if (!open) return;
    const clampToViewport = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const margin = 16;
      const rect = panel.getBoundingClientRect();
      if (rect.right > window.innerWidth - margin) setEdgeShift(window.innerWidth - margin - rect.right);
      else if (rect.left < margin) setEdgeShift(margin - rect.left);
      else setEdgeShift(0);
    };
    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const show = () => {
    clearTimeout(closeTimer.current);
    if (!open) openedByHover.current = true;
    setOpen(true);
  };
  // A short delay so crossing the small gap between the link and the panel does not close it.
  const hideSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, 150);
  };

  return (
    <div
      ref={rootRef}
      className="relative flex items-center"
      onPointerEnter={(e) => e.pointerType !== "touch" && show()}
      onPointerLeave={hideSoon}
      onBlur={(e) => !rootRef.current?.contains(e.relatedTarget) && close()}
    >
      <NavLink href={href} onClick={close}>{label}</NavLink>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${label} menu`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          if (openedByHover.current) openedByHover.current = false;
          else setOpen((v) => !v);
        }}
        className="ml-[9px] grid h-8 w-6 place-items-center rounded"
      >
        <Asset name="icons.svg" width={5} height={9} className={`max-w-none transition-transform duration-200 ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>

      <div
        ref={panelRef}
        id={menuId}
        style={{ transform: `translateX(calc(-50% + ${edgeShift}px)) translateY(${open ? 0 : -4}px)` }}
        className={`absolute left-1/2 top-full z-50 w-max max-w-[calc(100vw-2rem)] pt-3 transition-[opacity,transform,visibility] duration-200 ease-out ${open ? "visible opacity-100" : "invisible opacity-0"}`}
      >
        <div className="rounded-[28px] border border-black/5 bg-white px-8 py-7 text-left font-inter text-deep-blue shadow-[0_20px_48px_rgba(1,18,74,0.16)]">
          <Link
            href={ROUTES.SERVICES}
            onClick={close}
            className="group flex items-center justify-between rounded-xl px-3 py-0 text-lg font-semibold no-underline transition-colors hover:text-smash-red focus-visible:text-smash-red"
          >
            All Services
            <Asset name="icons.svg" width={5} height={9} className="max-w-none rotate-0 opacity-40 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="my-5 border-t border-black/8" />
          {/*
            Each column is sized to its own content, capped at 184px of TEXT (wrapping past that) — not stretched to
            match its widest neighbour. That 184px cap sits on an inner wrapper, separate from the divider's own
            border/padding on the outer grid item: capping them together (as an earlier version did) silently ate the
            divider's 40px out of the text budget for every column except the first, so "Social Media Management" had
            far less room to work with than "Conversion Optimisation" and overflowed into the next column's divider.
            With the budgets equal, `auto-cols-max` lets short lists (e.g. Customer Engagement) shrink instead of
            leaving stretched, inconsistent trailing whitespace — every gap is the real `gap-x-10`.
          */}
          <div className="grid grid-flow-col auto-cols-max gap-x-10">
            {items.map((item, i) => (
              <div key={item.path} className={`min-w-0 ${i > 0 ? "border-l border-black/8 pl-10" : ""}`}>
                <div className="min-w-0 max-w-46">
                  {/* A category heading, not a link — only the individual services below route anywhere. */}
                  <p className="wrap-break-word pb-3 text-xs font-semibold uppercase tracking-[0.07em] text-deep-blue/45">{item.label}</p>
                  {item.offerings?.length ? (
                    <ul className="flex flex-col gap-0.5">
                      {item.offerings.map((offering) => (
                        <li key={offering.path}>
                          <Link
                            href={offering.path}
                            onClick={close}
                            className="block wrap-break-word rounded-lg px-2.5 py-2 text-sm font-medium leading-snug no-underline transition-colors hover:bg-soft-grey hover:text-smash-red focus-visible:bg-soft-grey focus-visible:text-smash-red"
                          >
                            {offering.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
