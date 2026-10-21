"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { HomeSection } from "./shared";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * One photo per phase, in order. 1–3 (Strategy, Create, Attract) are the Figma design's own; 4–6 (Convert, Optimise,
 * Scale) were generated in the same warm, natural-light editorial style, since the design has no photo for them.
 */
const PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/media/home/growth-engine-${n}.jpg`);
/**
 * The phase descriptions from the Figma design ("Smash Redesign" → Frame 1261159082), by step order. A phase shows its
 * design copy here and falls back to the CMS description for any step the design does not cover. (The design's
 * Strategy line begins "e take"; it is set as "We take".)
 */
const PHASE_COPY: Record<number, string> = {
  1: "We take the time to understand your business, target audience, objectives, and market opportunities to build a strategic growth plan aligned with your vision and long-term business goals.",
  2: "We transform the strategy into powerful, engaging campaigns, compelling content, and impactful brand communication designed to capture attention, connect with your target audience, and bring your business vision to life.",
  3: "We connect your business with the right audience through targeted marketing strategies and performance-driven campaigns that build brand awareness, drive quality traffic, and attract potential customers who are more likely to convert.",
  4: "We turn customer interest into meaningful business opportunities through structured follow-ups, CRM systems, WhatsApp marketing, and dedicated call centre support that nurture leads, strengthen customer relationships, and drive higher conversion rates.",
  5: "We track every campaign and customer touchpoint, identify what is working and what is not, and keep testing and refining our creatives, targeting, and funnels to improve results and lower the cost of every conversion.",
  6: "We scale what delivers results by investing more in successful strategies, expanding high-performing campaigns, and continuously refining our approach to drive consistent performance and sustainable long-term business growth.",
};
/** Resting opacity of a step that is not open (Figma: 26%). */
const DIM = 0.26;
/** The photos not in the middle slot sit a touch zoomed in and settle to 1 as they arrive. */
const SETTLE = 1.12;
/** Timeline units: a hand-over takes TRANSITION, then the open step rests for HOLD so it can be read. */
const TRANSITION = 1;
const HOLD = 0.6;
/** Scroll distance of the pin, per step, as a fraction of the viewport height. */
const SCROLL_PER_STEP = 0.6;
/** Figma's frame height, which the photo window matches whenever the viewport has the room. */
const DESIGN_HEIGHT = 813;

/** "STRATEGY" → "Strategy": the design sets the titles in sentence case, the CMS stores them in capitals. */
const sentence = (title: string) => (title === title.toUpperCase() ? title.charAt(0) + title.slice(1).toLowerCase() : title);

/**
 * "SMASH Growth Engine" (Figma "Smash Redesign" → Frame 1261159081, 1440×813): the steps run down the left — number and
 * title, the open one with its description — separated by hairlines, and a vertical strip of photos runs down the right,
 * showing the open step's photo in the middle slot with the neighbouring photos peeking in above and below.
 *
 * The section pins while the page scrolls, and scroll position drives one scrubbed GSAP timeline (scrolling back runs it
 * in reverse): each hand-over closes one step and opens the next while the photo strip slides by exactly one photo, the
 * arriving photo settling from a slight zoom. A short rest after every hand-over keeps the open step readable. Heights and
 * offsets are measured by function-based values that ScrollTrigger re-evaluates on every refresh, so any wrapping or
 * viewport size is handled. Below lg the strip shows a single photo above the list.
 *
 * Without JS, or with reduced motion, nothing is pinned, collapsed or moved: every step is open and the photos are stacked.
 */
export function GrowthEngine({ data }: { data: HomeSection<"growthEngine"> }) {
  const steps = data.steps.slice(0, PHOTOS.length);
  const count = steps.length;
  const section = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = section.current;
    if (!root || count < 2) return;
    const mm = gsap.matchMedia();
    mm.add({ lg: "(min-width: 1024px)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      const { lg, motion } = context.conditions as { lg: boolean; motion: boolean };
      if (!motion) return;
      const win = root.querySelector<HTMLElement>("[data-ge-window]");
      const strip = root.querySelector<HTMLElement>("[data-ge-strip]");
      const slides = gsap.utils.toArray<HTMLElement>("[data-ge-slide]", root);
      const photos = gsap.utils.toArray<HTMLElement>("[data-ge-photo]", root);
      const left = root.querySelector<HTMLElement>("[data-ge-left]");
      const list = root.querySelector<HTMLElement>("[data-ge-list]");
      const rows = gsap.utils.toArray<HTMLElement>("[data-ge-row]", root);
      const descs = gsap.utils.toArray<HTMLElement>("[data-ge-desc]", root);
      if (!win || !strip || !left || !list || slides.length !== count || rows.length !== count) return;

      // The window is as tall as the design's frame when the viewport allows, and as one photo on small screens.
      // The list always reserves the room of its tallest state (one description open), so the heading above it and the
      // block's vertical centring stay put as descriptions of different lengths open and close.
      const size = () => {
        gsap.set(win, { height: lg ? Math.min(DESIGN_HEIGHT, window.innerHeight - 64) : slides[0].offsetHeight, overflow: "hidden" });
        gsap.set(list, { minHeight: 0 });
        const open = descs.reduce((sum, d) => sum + d.offsetHeight, 0);
        gsap.set(list, { minHeight: list.offsetHeight - open + Math.max(...descs.map((d) => d.scrollHeight)) });
        // Centre the text block on the photo window (left top-aligned otherwise, so the no-script layout starts at the top).
        gsap.set(left, { marginTop: lg ? Math.max(0, (win.clientHeight - left.offsetHeight) / 2) : 0 });
      };
      // Where the strip sits so photo `i` is centred in the window.
      const stripY = (i: number) => () => (win.clientHeight - slides[i].offsetHeight) / 2 - slides[i].offsetTop;

      size();
      ScrollTrigger.addEventListener("refreshInit", size);

      // Resting state: the first step open and bright, the rest collapsed and dim; the strip on the first photo.
      gsap.set(strip, { y: stripY(0) });
      gsap.set(photos.slice(1), { scale: SETTLE });
      gsap.set(rows.slice(1), { opacity: DIM });
      gsap.set(descs.slice(1), { height: 0, opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${Math.round(count * SCROLL_PER_STEP * window.innerHeight)}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Every tween states both of its values and defers applying them, so a step can be opened by one tween and
      // closed by a later one without the later one's start value being painted at build time.
      const move = { duration: TRANSITION, ease: "power2.inOut", immediateRender: false } as const;
      let t = HOLD; // the first step rests open before anything moves
      for (let i = 1; i < count; i++) {
        tl.fromTo(descs[i - 1], { height: () => descs[i - 1].scrollHeight, opacity: 1 }, { height: 0, opacity: 0, ...move }, t)
          .fromTo(rows[i - 1], { opacity: 1 }, { opacity: DIM, ...move }, t)
          .fromTo(descs[i], { height: 0, opacity: 0 }, { height: () => descs[i].scrollHeight, opacity: 1, ...move }, t)
          .fromTo(rows[i], { opacity: DIM }, { opacity: 1, ...move }, t)
          .fromTo(strip, { y: stripY(i - 1) }, { y: stripY(i), duration: TRANSITION, ease: "power3.inOut", immediateRender: false }, t)
          .fromTo(photos[i - 1], { scale: 1 }, { scale: SETTLE, ...move }, t)
          .fromTo(photos[i], { scale: SETTLE }, { scale: 1, ...move }, t);
        t += TRANSITION + HOLD;
      }
      tl.to({}, { duration: 0.001 }, t); // extend the timeline to include the last rest

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", size);
        gsap.set([win, strip, left, list, ...photos, ...rows, ...descs], { clearProps: "all" });
      };
    });
    return () => mm.revert();
  }, [count]);

  if (!count) return null;

  return (
    <section ref={section} aria-labelledby="growth-engine-heading" data-home-section="growth-engine" className="relative overflow-hidden bg-[#1a1a1a] text-white">
      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1440px] content-center gap-10 px-4 py-12 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:items-start lg:gap-x-12 xl:grid-cols-[578px_508px] xl:justify-between xl:gap-x-0 xl:pl-20 xl:pr-[90px]">
        <div data-ge-left className="flex flex-col gap-8 lg:gap-[clamp(28px,5svh,56px)]">
          {data.heading ? <h2 id="growth-engine-heading" className="text-[20px] font-normal leading-normal">{data.heading}</h2> : <span id="growth-engine-heading" className="sr-only">Growth Engine</span>}

          <ol data-ge-list className="flex flex-col">
            {steps.map((step, i) => (
              <li key={step.order} className={i ? "mt-6 bg-[url('/media/home/growth-line.svg')] bg-[length:100%_1px] bg-top bg-no-repeat pt-6 lg:mt-[clamp(14px,2.6svh,32px)] lg:pt-[clamp(14px,2.6svh,32px)]" : undefined}>
                <div data-ge-row>
                  <div className="flex items-center gap-4 text-[28px] font-bold leading-[1.1] md:text-[34px] xl:gap-6 xl:text-[clamp(30px,4.6svh,40px)] xl:leading-[1.1]">
                    <span className="w-[1.125em] shrink-0 tabular-nums">{String(step.order).padStart(2, "0")}</span>
                    <h3 className="font-bold">{sentence(step.title)}</h3>
                  </div>
                </div>
                {(PHASE_COPY[step.order] ?? step.description) ? (
                  <div data-ge-desc className="overflow-hidden">
                    <p className="max-w-[495px] pl-[calc(1.125em+16px)] pt-4 text-base leading-[1.42] text-white/90 md:text-[18px] xl:pl-[69px] xl:pt-5">{PHASE_COPY[step.order] ?? step.description}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>

        <div data-ge-window aria-hidden="true" className="w-full max-w-[508px] lg:justify-self-end xl:justify-self-auto">
          <div data-ge-strip className="flex flex-col gap-4 lg:gap-[30px]">
            {PHOTOS.slice(0, count).map((src) => (
              <div key={src} data-ge-slide className="relative aspect-[508/353] w-full shrink-0 overflow-hidden">
                <div data-ge-photo className="absolute inset-0">
                  {/* Lazy, not `priority`: the section is far below the fold, and a preload would compete with the hero's own requests. */}
                  <Image src={src} alt="" fill sizes="(min-width: 1024px) 508px, 100vw" className="object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
