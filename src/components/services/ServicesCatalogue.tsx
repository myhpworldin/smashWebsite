"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Asset, WRAP } from "@/components/home/shared";
import { HomeAsset } from "@/components/home/home-ui";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { MaskLine } from "@/components/about/AboutWords";
import sheet from "@/components/layout/sheet.module.css";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/lib/routes";
import { ServicesMotion } from "./ServicesMotion";

/**
 * Lands the page on a category section with a visible "start at top, then glide down" entrance, for a card on
 * Home that links here as `/services?scrollTo=<id>` (see ServiceGroups.tsx). Reads `location.search` directly in
 * an effect rather than `useSearchParams()` so this needs no Suspense boundary and does nothing until after the
 * page has already painted at its natural scroll-top-0 position — a raw `#hash` would instead make the browser
 * (and Next's own router) jump there instantly, before any JS runs, which is the "no animation" behaviour this
 * replaces. The scroll itself is the browser's native compositor-driven `scrollIntoView({behavior:"smooth"})` —
 * no JS animation loop, no per-frame work on the main thread, so it costs nothing at runtime.
 */
function useScrollToCategory() {
  useEffect(() => {
    const targetId = new URLSearchParams(window.location.search).get("scrollTo");
    if (!targetId) return;

    let raf2 = 0;
    let timer = 0;
    // Two rAFs so the browser has finished its first layout pass (hero image box, fonts) before anything is
    // measured — otherwise a late layout shift can throw the landing position off by a section or more.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        timer = window.setTimeout(() => {
          const el = document.getElementById(targetId);
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          // Align the service's whole sheet, not its heading: the heading is pinned part-way down its column, so
          // aligning that would scroll the top of the cards out of view.
          (el?.closest("[data-svc-group]") ?? el)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
          // Swaps the query param for a shareable #hash once scrolling has already started — replaceState never
          // triggers a scroll on its own, so this can't re-jump or fight the animation that's already running.
          window.history.replaceState(null, "", `${window.location.pathname}#${targetId}`);
        }, 250); // a brief, visible pause at the top before the glide down, matching what was asked for
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, []);
}

export type CatalogueGroup = {
  name: string;
  slug: string;
  eyebrow: string | null;
  cards: { title: string; description: string | null; iconUrl: string | null; offeringSlug: string | null }[];
};

const matches = (query: string, ...fields: (string | null)[]) => fields.some((f) => f?.toLowerCase().includes(query));

/** The sticky heading column pins only where there is room for it: a wide screen that is also tall enough. */
const PIN = "[@media(min-width:1024px)_and_(min-height:700px)]:sticky [@media(min-width:1024px)_and_(min-height:700px)]:top-[110px]";

/**
 * One offering. On the light sheets it is a white card; on the dark ones a glass card. Hover lifts it, lights its edge,
 * tips its icon, and "Know More" draws its underline while the arrow flies out to the top-right as a fresh one slides in
 * from the bottom-left (Home's "View all services" hover); a light follows the pointer across it (SheetMotion). The
 * whole card is the link (the `after:` overlay), as before.
 */
function OfferingCard({ card, groupSlug, light }: { card: CatalogueGroup["cards"][number]; groupSlug: string; light: boolean }) {
  const arrow = light ? { name: "arrow-up-right-red.svg", size: 17.28 } : { name: "arrow-up-right.svg", size: 16 };
  return (
    <li
      data-svc-card
      data-spot
      style={{ "--spot": light ? "rgba(0,88,200,0.10)" : "rgba(120,170,255,0.22)" } as React.CSSProperties}
      className={`${sheet.spot} group relative flex min-h-[250px] flex-col rounded-[20px] border px-6 pb-6 pt-6 transition-[border-color,background-color,transform,box-shadow] duration-500 ease-out hover:-translate-y-1 focus-within:-translate-y-1 lg:px-7 ${
        light
          ? "border-black/[0.08] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.02)] hover:border-deep-blue hover:shadow-[0_24px_50px_-28px_rgba(1,18,74,0.35)] focus-within:border-deep-blue"
          : "border-white/12 bg-white/[0.05] hover:border-white/40 hover:bg-white/[0.09] focus-within:border-white/40"
      }`}
    >
      <span className="grid size-[60px] place-items-center rounded-[15px] border border-black/30 bg-white transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-rotate-6 group-hover:scale-105 group-focus-within:-rotate-6 group-focus-within:scale-105">
        {card.iconUrl ? <Image src={card.iconUrl} alt="" width={28} height={28} unoptimized /> : null}
      </span>
      <h3 className={`mt-6 font-manrope text-[22px] font-bold leading-[30px] ${light ? "text-deep-blue" : "text-white"}`}>{card.title}</h3>
      {card.description ? <p className={`mt-3 font-inter text-[15px] leading-[22px] ${light ? "text-black/80" : "text-white/70"}`}>{card.description}</p> : null}
      <Link
        href={card.offeringSlug ? ROUTES.SERVICE_OFFERING(groupSlug, card.offeringSlug) : ROUTES.SERVICE(groupSlug)}
        className={`mt-auto inline-flex w-fit items-center gap-3 pt-5 font-inter text-[15px] font-medium leading-[22px] no-underline after:absolute after:inset-0 after:rounded-[20px] after:content-[''] ${light ? "text-bright-blue" : "text-white"}`}
      >
        <span className="relative">
          Know More<span className="sr-only"> about {card.title}</span>
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:origin-left group-hover:scale-x-100 group-focus-within:origin-left group-focus-within:scale-x-100 motion-reduce:transition-none" />
        </span>
        <span aria-hidden="true" className="relative size-4 shrink-0 overflow-hidden">
          <HomeAsset name={arrow.name} width={arrow.size} height={arrow.size} className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:-translate-y-full group-hover:translate-x-full group-focus-within:-translate-y-full group-focus-within:translate-x-full motion-reduce:transition-none" />
          <HomeAsset name={arrow.name} width={arrow.size} height={arrow.size} className="absolute inset-0 -translate-x-full translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:translate-x-0 group-hover:translate-y-0 group-focus-within:translate-x-0 group-focus-within:translate-y-0 motion-reduce:transition-none" />
        </span>
      </Link>
    </li>
  );
}

/**
 * One service's sheet: the number, eyebrow and name at the left (pinned while the cards scroll, where the screen is big
 * enough) and its offerings as cards at the right. The sheets alternate light and dark and each slides over the one
 * before it with the same rounded top, as Home's and About's do. The heading keeps its `${slug}-heading` id — Home's
 * service cards link here as `/services?scrollTo=<id>`.
 */
function GroupSheet({ group, index, first }: { group: CatalogueGroup; index: number; first: boolean }) {
  const light = index % 2 === 0;
  return (
    <section
      aria-labelledby={`${group.slug}-heading`}
      data-svc-group
      className={`relative pb-20 pt-20 lg:pb-[140px] lg:pt-[130px] ${first ? `min-h-svh ${SHEET}` : ""} ${light ? "bg-white text-ink" : "bg-[#1a1a1a] text-white"}`}
    >
      <div className={`${WRAP} grid gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-16`}>
        <div className={`flex flex-col gap-3 lg:self-start ${PIN}`}>
          <span
            aria-hidden="true"
            data-svc-num
            className={`select-none text-[84px] font-semibold leading-none text-transparent lg:text-[130px] ${light ? "[-webkit-text-stroke:1px_rgba(1,18,74,0.22)]" : "[-webkit-text-stroke:1px_rgba(255,255,255,0.25)]"}`}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {group.eyebrow ? <p data-svc-eyebrow className={`mt-2 font-inter text-sm font-semibold uppercase leading-[normal] ${light ? "text-eyebrow" : "text-[#ff4a4a]"}`}>{group.eyebrow}</p> : null}
          <h2 id={`${group.slug}-heading`} className="font-inter text-[32px] font-medium leading-[1.15] md:text-[44px]">
            <MaskLine as="span">{group.name}</MaskLine>
          </h2>
        </div>
        <ul data-svc-cards className="grid gap-5 md:grid-cols-2">
          {group.cards.map((card) => (
            <OfferingCard key={card.title} card={card} groupSlug={group.slug} light={light} />
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The Services page body (Figma "Services"), redesigned in the Home page's language like About and Contact: the
 * shared dark hero with its search box (SheetHero), then one sheet per service with its offerings as cards. Search
 * filters the cards by title/description as you type; a group with no matching card is hidden. Every card links to
 * its service's page (`/services/<slug>`), the only detail page an offering has. Words and links are unchanged.
 *
 * The hero is sticky and the first sheet slides over it; the rest follow, overlapping. Motion: SheetMotion (hero
 * scroll-out, pointer light) and ServicesMotion (headings rise out of masks, numbers and cards come in as each
 * sheet arrives); the cards' hovers are CSS.
 */
export function ServicesCatalogue({ groups }: { groups: CatalogueGroup[] }) {
  useScrollToCategory();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const q = query.trim().toLowerCase();
  const visible = groups
    .map((g) => ({ ...g, cards: q && !matches(q, g.name, g.eyebrow) ? g.cards.filter((c) => matches(q, c.title, c.description)) : g.cards }))
    .filter((g) => g.cards.length);
  const total = visible.reduce((n, g) => n + g.cards.length, 0);

  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero
          id="services-heading"
          title="Our Services"
          description="Everything you need to build a stronger brand, attract more customers, and scale with confidence."
          descriptionWidth="max-w-[614px]"
          image="/media/services-hero-banner.png"
        >
          <form role="search" onSubmit={(e) => e.preventDefault()} className="group/search relative h-[54px] w-full max-w-[471px] rounded-[60px] border border-white/20 bg-white/[0.2] backdrop-blur-[10px] transition-[background-color,border-color,box-shadow] duration-300 focus-within:border-white/70 focus-within:bg-white/[0.3] focus-within:shadow-[0_0_0_6px_rgba(255,255,255,0.1)]">
            <label htmlFor={searchId} className="sr-only">Search services</label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Services..."
              autoComplete="off"
              maxLength={100}
              className="size-full rounded-[60px] bg-transparent pl-6 pr-[58px] font-inter text-base font-light text-white outline-offset-4 placeholder:text-white/80 [&::-webkit-search-cancel-button]:hidden"
            />
            <Asset name="services-search.svg" width={42} height={42} className="pointer-events-none absolute right-1.5 top-1.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/search:scale-110 group-focus-within/search:-rotate-12" />
          </form>
        </SheetHero>

        {visible.length ? (
          <GroupSheet group={visible[0]} index={0} first />
        ) : (
          <section aria-label="Services" className={`relative min-h-svh bg-white ${SHEET}`}>
            <div className={`${WRAP} py-20 lg:py-[140px]`}>
              <EmptyState message={q ? `No services match “${query.trim()}”. Try a different word.` : "No services published yet."} />
            </div>
          </section>
        )}
      </div>

      <p role="status" className="sr-only">{q ? `${total} ${total === 1 ? "offering" : "offerings"} found` : ""}</p>

      {visible.slice(1).map((group, i) => (
        <GroupSheet key={group.slug} group={group} index={i + 1} first={false} />
      ))}

      <SheetMotion />
      <ServicesMotion signature={visible.map((g) => `${g.slug}:${g.cards.length}`).join("|")} />
    </>
  );
}
