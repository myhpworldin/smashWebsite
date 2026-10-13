"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { HomeAsset } from "./home-ui";
import type { HomeSection } from "./shared";

/** The design's two photographs, alternating step by step (Figma: step 01 → the first, step 02 → the second). */
const PHOTOS = ["/media/home/growth-photo-1.jpg", "/media/home/growth-photo-2.jpg"];
/** How long each step stays before the carousel moves on (its progress bar fills over this time). */
const STEP_MS = 6000;
const SWIPE_PX = 50;

/**
 * "SMASH Growth Engine" (Figma New Homepage, node 606:974 and its frames 635:120 / 641:208): a near-black band with the
 * title and round prev/next arrows, over a carousel of the CMS growth steps — each a white card (uppercase title,
 * number, description, progress bar) followed by a photograph. The active step's card + photo fill the 1140px
 * column; the neighbours peek in at either edge behind a frosted veil.
 *
 * Motion: the active card's progress bar fills over STEP_MS and the carousel then advances (looping). It pauses while
 * the cards are hovered, while anything in the section has focus, and while it is off screen; the arrows and a horizontal swipe move one step at a time. The track only ever moves
 * by transform. Reduced motion: no autoplay, no sliding (the bar shows the active step as complete).
 */
export function GrowthEngine({ data }: { data: HomeSection<"growthEngine"> }) {
  const steps = data.steps;
  const count = steps.length;
  const [active, setActive] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const swipeStart = useRef<number | null>(null);

  const go = useCallback((delta: number) => setActive((i) => (i + delta + count) % count), [count]);

  // The track's offset is the active card's own position, measured — so it is exact at every breakpoint and card width.
  useLayoutEffect(() => {
    const measure = () => setOffset(cards.current[active]?.offsetLeft ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (section.current) ro.observe(section.current);
    return () => ro.disconnect();
  }, [active]);

  // Autoplay only while the section is on screen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!count) return null;
  const playing = visible && !hovered && !focused;

  return (
    <section
      ref={section}
      aria-labelledby="growth-engine-heading"
      aria-roledescription="carousel"
      data-home-section="growth-engine"
      className="overflow-hidden bg-[#1a1a1a] py-20 text-white lg:py-[140px]"
      // Keyboard focus pauses; a mouse click on an arrow (which also focuses it) must not stop autoplay for good.
      onFocus={(e) => setFocused(e.target.matches(":focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div className="mx-auto w-full max-w-[1220px] px-4 md:px-10">
        <div className="flex items-center justify-between gap-6">
          {data.heading ? (
            <h2 id="growth-engine-heading" className="text-[34px] font-medium leading-[1.2] md:text-5xl lg:text-[62px] lg:leading-[96px]">
              {data.heading}
            </h2>
          ) : null}
          {count > 1 ? (
            <div className="flex shrink-0 items-center gap-4 lg:gap-10">
              <button type="button" onClick={() => go(-1)} aria-label="Previous step" className="rounded-full transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                <HomeAsset name="growth-arrow.svg" width={58} height={58} className="size-12 rotate-180 lg:size-[58px]" />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next step" className="rounded-full transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                <HomeAsset name="growth-arrow.svg" width={58} height={58} className="size-12 lg:size-[58px]" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="mt-10 touch-pan-y lg:mt-[60px]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onPointerDown={(e) => {
            swipeStart.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeStart.current === null) return;
            const dx = e.clientX - swipeStart.current;
            swipeStart.current = null;
            if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            swipeStart.current = null;
          }}
        >
          <ol
            className="relative flex gap-4 transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none lg:gap-[30px]"
            style={{ transform: `translate3d(${-offset}px, 0, 0)` }}
          >
            {steps.map((step, i) => {
              const current = i === active;
              return [
                <li
                  key={`step-${step.order}`}
                  ref={(el) => {
                    cards.current[i] = el;
                  }}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  className="relative flex min-h-[300px] w-[82vw] max-w-[500px] shrink-0 flex-col justify-between rounded-[20px] bg-white px-6 pb-9 pt-8 text-black md:w-[440px] lg:h-[340px] lg:w-[500px] lg:px-[30px] lg:pt-10"
                >
                  <div className="flex flex-col gap-5 lg:gap-[30px]">
                    <div className="flex items-center justify-between text-[22px] font-medium leading-[1.4] lg:text-[26px]">
                      <h3 className="uppercase">{step.title}</h3>
                      <span aria-hidden="true" className="opacity-40">{String(step.order).padStart(2, "0")}</span>
                    </div>
                    {step.description ? <p className="text-lg leading-[1.44] text-black/90 lg:text-[22px]">{step.description}</p> : null}
                  </div>
                  {/* Progress: the design's 4px rounded track (black 10%) with the bright-blue fill growing across it. */}
                  <span aria-hidden="true" className="relative mt-8 block h-1 w-full overflow-hidden rounded-full bg-black/10">
                    {current ? (
                      <span
                        key={active}
                        className="growth-progress absolute inset-y-0 left-0 w-full origin-left rounded-full bg-bright-blue"
                        style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: playing ? "running" : "paused" }}
                        onAnimationEnd={() => go(1)}
                      />
                    ) : null}
                  </span>
                  <Frost on={!current} blur="backdrop-blur-[2px]" />
                </li>,
                <li key={`photo-${step.order}`} aria-hidden="true" className="relative w-[82vw] max-w-[610px] shrink-0 overflow-hidden rounded-[20px] md:w-[520px] lg:h-[340px] lg:w-[610px]">
                  <Image src={PHOTOS[i % PHOTOS.length]} alt="" fill sizes="(min-width: 1024px) 610px, 82vw" className="object-cover" />
                  <Frost on={!current} blur="backdrop-blur-[7px]" />
                </li>,
              ];
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** The design's veil over the cards outside the active pair: white 20% with a backdrop blur (7px on photos, 2px on cards). */
function Frost({ on, blur }: { on: boolean; blur: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[20px] bg-white/20 ${blur} transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`}
    />
  );
}
