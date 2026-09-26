"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Asset } from "@/components/home/shared";
import { NavLink } from "@/components/layout/NavLink";
import { ROUTES } from "@/lib/routes";

type Props = { label: string; href: string; items: { label: string; path: string }[] };

/**
 * The header's "Services" item: the link itself still goes to /services, and the arrow beside it opens a menu of
 * every published service (WAI-ARIA disclosure). It opens on hover, on focus and on click/tap of the arrow, and closes
 * on Escape, on a click elsewhere, when focus leaves, and when a link in it is used.
 */
export function ServicesMenu({ label, href, items }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const menuId = useId();
  // Set when hovering opened the menu, so the click that follows (aimed at the arrow) keeps it open instead of toggling it shut.
  const openedByHover = useRef(false);
  const close = () => {
    openedByHover.current = false;
    setOpen(false);
  };

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
        id={menuId}
        className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 transition-[opacity,transform,visibility] duration-200 ease-out ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"}`}
      >
        <ul className="w-max min-w-[240px] rounded-2xl border border-black/10 bg-white p-2 text-left font-inter text-base text-deep-blue shadow-[0_12px_32px_rgba(1,18,74,0.18)]">
          <li>
            <Link href={ROUTES.SERVICES} onClick={close} className="block rounded-xl px-4 py-2.5 font-semibold no-underline transition-colors hover:bg-soft-grey focus-visible:bg-soft-grey">All Services</Link>
          </li>
          <li role="separator" className="mx-4 my-1 border-t border-black/10" />
          {items.map((item) => (
            <li key={item.path}>
              <Link href={item.path} onClick={close} className="block rounded-xl px-4 py-2.5 font-normal no-underline transition-colors hover:bg-soft-grey focus-visible:bg-soft-grey">{item.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
