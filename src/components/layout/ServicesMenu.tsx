"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Asset } from "@/components/home/shared";
import { NavLink } from "@/components/layout/NavLink";
import { ROUTES } from "@/lib/routes";

type Props = { label: string; href: string; items: { label: string; path: string; offerings?: { label: string; path: string }[] }[] };

const subscribeNone = () => () => {};

/**
 * The header's "Services" item: the link itself still goes to /services, and the arrow beside it opens a single
 * mega-menu panel (WAI-ARIA disclosure) — "All Services" on top, then one column per category, each headed by the
 * category name with its individual services listed underneath. It opens on hover, on focus and on click/tap of the
 * arrow, and closes on Escape, on a click elsewhere, when focus leaves, and when a link in it is used.
 * The panel is a solid sheet as wide as the navbar that unrolls out of its lower edge (a clip-path reveal with a
 * short slide, columns following in a stagger). It is portalled to <body>, positioned from the navbar's rect: the
 * navbar's own backdrop-filter would otherwise stop the panel's blur from seeing the page behind it.
 */
export function ServicesMenu({ label, href, items }: Props) {
  const [open, setOpen] = useState(false);
  // false on the server and during hydration, true afterwards — the portal target (document.body) exists only then.
  const mounted = useSyncExternalStore(subscribeNone, () => true, () => false);
  // The navbar's box in document coordinates; the panel spans it, just under its lower edge.
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
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
  };
  const inside = (node: EventTarget | null) => !!node && (!!rootRef.current?.contains(node as Node) || !!panelRef.current?.contains(node as Node));

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const bar = rootRef.current?.closest("header > div");
      if (!bar) return;
      const r = bar.getBoundingClientRect();
      const margin = 16;
      const left = Math.max(r.left, margin);
      const right = Math.min(r.right, window.innerWidth - margin);
      setBox({ top: r.bottom + window.scrollY, left: left + window.scrollX, width: right - left });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // While open the pill and the panel read as one shape: the pill squares its lower corners and takes the panel's solid
  // colour, then relaxes back to its own look on close.
  useEffect(() => {
    const bar = rootRef.current?.closest<HTMLElement>("header > div");
    if (!open || !bar || getComputedStyle(bar).borderTopLeftRadius === "0px") return;
    const saved = { transition: bar.style.transition, background: bar.style.backgroundColor };
    bar.style.transition = "border-radius 450ms cubic-bezier(0.22,1,0.36,1), background-color 450ms ease";
    bar.style.borderBottomLeftRadius = "0px";
    bar.style.borderBottomRightRadius = "0px";
    bar.style.backgroundColor = "#0b1233";
    return () => {
      bar.style.borderBottomLeftRadius = "";
      bar.style.borderBottomRightRadius = "";
      bar.style.backgroundColor = saved.background;
      setTimeout(() => (bar.style.transition = saved.transition), 460);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!inside(e.target)) close();
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
    closeTimer.current = setTimeout(close, 180);
  };

  const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
  const hoverProps = { onPointerEnter: (e: React.PointerEvent) => e.pointerType !== "touch" && show(), onPointerLeave: hideSoon };

  const panel = (
    <div
      ref={panelRef}
      id={menuId}
      inert={!open}
      {...hoverProps}
      onBlur={(e) => !inside(e.relatedTarget) && close()}
      style={{
        top: (box?.top ?? 0) - 1,
        left: box?.left ?? 0,
        width: box?.width ?? 0,
        clipPath: open ? "inset(0 -60px -80px -60px round 0 0 32px 32px)" : "inset(0 0 100% 0 round 0 0 32px 32px)",
        transform: open ? "translateY(0) scaleY(1)" : "translateY(-22px) scaleY(0.94)",
        transformOrigin: "top center",
      }}
      className={`absolute z-[45] transition-[clip-path,transform,opacity,visibility] duration-[550ms] ${ease} ${open ? "visible opacity-100" : "invisible opacity-0"}`}
    >
      <div className="relative overflow-hidden rounded-b-[32px] bg-[#0b1233] px-10 pb-10 pt-3 text-left font-inter text-white shadow-[0_28px_70px_rgba(0,0,12,0.5)]">
        <Link
          href={ROUTES.SERVICES}
          onClick={close}
          className="group relative flex items-center justify-between rounded-xl px-3 py-2 text-lg font-semibold text-white no-underline transition-colors hover:text-[#ff6b6b] focus-visible:text-[#ff6b6b]"
        >
          All Services
          <Asset name="icons.svg" width={5} height={9} className="max-w-none rotate-0 opacity-60 brightness-0 invert transition-transform group-hover:translate-x-0.5" />
        </Link>
        <div className="relative h-5" />
        <div className="relative grid gap-x-12" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item, i) => (
            <div
              key={item.path}
              style={{ transitionDelay: open ? `${150 + i * 70}ms` : "0ms" }}
              className={`min-w-0 transition-[opacity,transform] duration-500 ${ease} ${open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"} `}
            >
              {/* A category heading, not a link — only the individual services below route anywhere. */}
              <p className="wrap-break-word pb-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#ff6b6b]">{item.label}</p>
              {item.offerings?.length ? (
                <ul className="flex flex-col gap-0.5">
                  {item.offerings.map((offering) => (
                    <li key={offering.path}>
                      <Link
                        href={offering.path}
                        onClick={close}
                        className="block wrap-break-word rounded-lg px-2.5 py-2 text-sm font-medium leading-snug text-white/90 no-underline transition-[background-color,color,transform] hover:translate-x-1 hover:bg-white/12 hover:text-white focus-visible:bg-white/12 focus-visible:text-white"
                      >
                        {offering.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className="flex items-center" {...hoverProps} onBlur={(e) => !inside(e.relatedTarget) && close()}>
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
        <Asset name="icons.svg" width={5} height={9} className={`max-w-none transition-transform duration-300 ${open ? "-rotate-90" : "rotate-90"}`} />
      </button>
      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
