"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Asset, SectionHeading, WRAP } from "@/components/home/shared";
import { PageHero } from "@/components/layout/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/lib/routes";

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
          el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
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

/**
 * The Services page body (Figma "Services"): the hero with its search box, then one section per service with its
 * offerings as cards. Search filters the cards by title/description as you type; a group with no matching card is
 * hidden. Every card links to its service's page (`/services/<slug>`), the only detail page an offering has.
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
      <PageHero
        id="services-heading"
        title="Our Services"
        description="Everything you need to build a stronger brand, attract more customers, and scale with confidence."
        descriptionWidth="max-w-[614px]"
        image={{ url: "/media/services-hero-banner.png", alt: "" }}
      >
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative h-[50px] w-full max-w-[471px] rounded-[60px] bg-white/[0.28] backdrop-blur-[12px]">
          <label htmlFor={searchId} className="sr-only">Search services</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Services..."
            autoComplete="off"
            maxLength={100}
            className="size-full rounded-[60px] bg-transparent pl-5 pr-[54px] font-inter text-base font-light text-white outline-offset-2 placeholder:text-white [&::-webkit-search-cancel-button]:hidden"
          />
          <Asset name="services-search.svg" width={42} height={42} className="pointer-events-none absolute right-1 top-1" />
        </form>
      </PageHero>

      <p role="status" className="sr-only">{q ? `${total} ${total === 1 ? "offering" : "offerings"} found` : ""}</p>

      {visible.length ? (
        visible.map((group, i) => (
          <section key={group.slug} aria-labelledby={`${group.slug}-heading`} className={`${i % 2 ? "bg-soft-grey" : ""} ${i === 0 ? "pt-16 lg:pt-[120px]" : "pt-12 lg:pt-20"} pb-12 lg:pb-20`}>
            <div className={WRAP}>
              <SectionHeading eyebrow={group.eyebrow} heading={group.name} id={`${group.slug}-heading`} className="!gap-3" />
              <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.cards.map((card) => (
                  <li
                    key={card.title}
                    className="group relative flex min-h-[250px] flex-col rounded-2xl border border-black/[0.08] bg-white px-[29px] pb-5 pt-6 shadow-[0_4px_10px_rgba(0,0,0,0.02)] transition-colors focus-within:border-deep-blue hover:border-deep-blue"
                  >
                    <span className="grid size-[60px] place-items-center rounded-[15px] border border-black/30 bg-white">
                      {card.iconUrl ? <Image src={card.iconUrl} alt="" width={28} height={28} unoptimized /> : null}
                    </span>
                    <h3 className="mt-6 font-manrope text-[22px] font-bold leading-[30px] text-deep-blue">{card.title}</h3>
                    {card.description ? <p className="mt-3 font-inter text-[15px] leading-[22px] text-black/80">{card.description}</p> : null}
                    <Link
                      href={card.offeringSlug ? ROUTES.SERVICE_OFFERING(group.slug, card.offeringSlug) : ROUTES.SERVICE(group.slug)}
                      className="mt-auto pt-3 font-inter text-[15px] font-medium leading-[22px] text-bright-blue no-underline after:absolute after:inset-0 after:rounded-2xl after:content-['']"
                    >
                      Know More<span className="sr-only"> about {card.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))
      ) : (
        <div className={`${WRAP} py-16 lg:py-[120px]`}>
          <EmptyState message={q ? `No services match “${query.trim()}”. Try a different word.` : "No services published yet."} />
        </div>
      )}
    </>
  );
}
