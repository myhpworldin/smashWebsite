"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/** How long each shown value stays on screen while counting up, and while settling back down from the overshoot. */
const SECONDS_PER_STEP_UP = 0.11;
const SECONDS_PER_STEP_DOWN = 0.16;

/** A "round" counting step about a quarter of the target (400 → 100), so a count reads 0, 100, 200 … 600, 500, 400. */
function niceStep(target: number, decimals: number) {
  const rough = target / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const n = rough / pow;
  const step = (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
  return Math.max(step, 10 ** -decimals);
}

/**
 * One About figure's count as a timeline: 0 → ~1.5× the target (snapped up to a round step) → back down to the
 * target, in real time — a fixed time per shown value, so every number is readable. Text is written straight to
 * the DOM (no React state) and only when the shown value actually changes. Whenever the count lands on the target
 * the CMS's own string is shown again, so the resting figure is always exactly the content.
 */
function countTimeline(el: HTMLElement) {
  const raw = el.dataset.count ?? "";
  const target = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(target) || target <= 0) return null;

  const decimals = raw.split(".")[1]?.length ?? 0;
  const grouped = raw.includes(",");
  const step = niceStep(target, decimals);
  const peak = Math.ceil((target * 1.5) / step) * step;
  const format = (v: number) =>
    grouped
      ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : v.toFixed(decimals);

  const proxy = { v: 0 };
  let shown = raw;
  const render = () => {
    const snapped = Math.max(0, Math.round(proxy.v / step) * step);
    const text = Math.abs(proxy.v - target) < 1e-9 || Math.abs(snapped - target) < 1e-9 ? raw : format(snapped);
    if (text !== shown) el.textContent = shown = text;
  };

  // Linear rise so every value gets the same screen time (0, 100, 200 …); the overshoot eases out as it settles.
  const tl = gsap.timeline({ onComplete: render, onReverseComplete: render });
  tl.fromTo(
    proxy,
    { v: 0 },
    { v: peak, duration: (peak / step) * SECONDS_PER_STEP_UP, ease: "none", onUpdate: render, immediateRender: true },
  );
  tl.to(proxy, { v: target, duration: ((peak - target) / step) * SECONDS_PER_STEP_DOWN, ease: "power1.out", onUpdate: render });
  render(); // immediateRender doesn't fire onUpdate, so paint the starting value now
  const restore = () => {
    el.textContent = raw;
  };
  return { tl, restore };
}

/**
 * Plays a count on its own clock — not scrubbed — once its figures are on screen (`top 85%`), so the numbers always
 * run at their readable pace however fast the page is scrolled. It rewinds only after the figures have gone fully
 * back below the viewport, never while they are visible, so the count replays on the next pass down.
 */
function playWhenVisible(tl: gsap.core.Timeline, trigger: Element) {
  tl.pause(0);
  const play = ScrollTrigger.create({ trigger, start: "top 85%", onEnter: () => tl.play() });
  const rewind = ScrollTrigger.create({ trigger, start: "top bottom", onLeaveBack: () => tl.pause(0) });
  return () => {
    tl.kill();
    play.kill();
    rewind.kill();
  };
}

/**
 * Home page motion layer (Stage — GSAP animation enhancement). Renders nothing; it only orchestrates animation
 * over markup the Home sections already render, via two small, additive conventions those sections opt into:
 *
 *   `data-reveal="fade-up" | "image"` — a single element that fades/translates (or fades/scales, for images)
 *   in the first time it enters the viewport. `SectionHeading` and `FillImage` (when passed `reveal`) set this
 *   themselves, so most sections get it for free.
 *
 *   `data-reveal-group` — a container whose *direct children* (a card grid, a two-item heading+CTA block) stagger
 *   in together as one group, instead of each being wired up individually.
 *
 * Kept as one central component (rather than converting every Home section to "use client" and animating itself)
 * so the sections stay server-rendered exactly as before — this file is the only "use client" boundary Home's
 * motion needed.
 *
 * Why not a GSAP entrance for the global Header: Header lives in the root layout, not Home, so it persists across
 * client-side navigation — animating it here would replay the entrance every time a user navigates back to "/"
 * even though it never actually left the screen. Skipped deliberately; see the final report's Remaining Issues.
 */
export function HomeAnimations() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        reduced: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 1024px)",
        tablet: "(min-width: 768px) and (max-width: 1023px)",
      },
      (context) => {
        const { reduced, desktop, tablet } = context.conditions as { reduced: boolean; desktop: boolean; tablet: boolean };

        // Reduced motion: skip all movement, just make sure everything is at its resting, fully visible state.
        if (reduced) {
          gsap.set("[data-reveal], [data-reveal-group] > *, [data-reveal-item], [data-hero-el]", {
            clearProps: "opacity,visibility,transform",
          });
          return;
        }

        const dist = desktop ? 32 : tablet ? 26 : 18;
        const dur = 0.6;
        const stagger = desktop ? 0.12 : 0.08;
        const ease = "power2.out";

        // ---- Hero entrance (plays once on mount, not scroll-triggered — it's already in view on load) ----
        const heroTl = gsap.timeline({ defaults: { ease, duration: 0.7 } });
        const heroSequence: [string, number][] = [
          ['[data-hero-el="heading"]', 24],
          ['[data-hero-el="text"]', 18],
          ['[data-hero-el="cta"]', 14],
          ['[data-hero-el="eyebrow"]', 10],
        ];
        heroSequence.forEach(([selector, y], i) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) return;
          heroTl.fromTo(el, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0 }, i === 0 ? 0 : "-=0.45");
        });
        const pills = document.querySelectorAll<HTMLElement>('[data-hero-el="pill"]');
        if (pills.length) heroTl.fromTo(pills, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, "-=0.3");

        // ---- Generic single-element reveals: `data-reveal="fade-up"` (default) or `data-reveal="image"` ----
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          const isImage = el.dataset.reveal === "image";
          gsap.fromTo(
            el,
            { autoAlpha: 0, y: isImage ? 0 : dist, scale: isImage ? 1.04 : 1 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: isImage ? dur + 0.2 : dur,
              ease,
              clearProps: "transform",
              scrollTrigger: { trigger: el, start: "top 85%", once: true },
            },
          );
        });

        // ---- Group reveals: a grid/row's direct children stagger in together ----
        gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
          const children = Array.from(group.children) as HTMLElement[];
          if (!children.length) return;
          gsap.fromTo(
            children,
            { autoAlpha: 0, y: dist },
            {
              autoAlpha: 1,
              y: 0,
              duration: dur,
              ease,
              stagger,
              clearProps: "transform",
              scrollTrigger: { trigger: group, start: "top 85%", once: true },
            },
          );
        });

        // ---- Brand Story manifesto cascade: each line keeps its own design-specified resting opacity
        //      (the `OPACITY` cascade in BrandStory.tsx) instead of settling at 1 like every other reveal ----
        const storyItems = gsap.utils.toArray<HTMLElement>("[data-reveal-item]");
        if (storyItems.length) {
          const targets = storyItems.map((el) => parseFloat(el.style.opacity || "1"));
          gsap.set(storyItems, { opacity: 0, y: 16 });
          ScrollTrigger.create({
            trigger: storyItems[0].parentElement ?? storyItems[0],
            start: "top 85%",
            once: true,
            onEnter: () => {
              storyItems.forEach((el, i) => {
                gsap.to(el, { opacity: targets[i], y: 0, duration: dur, ease, delay: i * stagger });
              });
            },
          });
        }
      },
    );

    // Case studies ("Real campaigns…"): the heading is a CSS-sticky backdrop and the cards scroll up over it natively;
    // this only adds the scrubbed polish on top — the heading recedes a little as the cards cover it (and returns
    // once the last has passed), and each card rises and settles as it comes up. All tied to scroll position, so scrolling back runs it in reverse. Every
    // screen size (phones included); reduced motion builds nothing and keeps the plain sticky layout.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const heading = document.querySelector<HTMLElement>("[data-work-heading]");
      const cards = document.querySelector<HTMLElement>("[data-work-cards]");
      if (heading && cards) {
        gsap.fromTo(
          heading,
          { scale: 1, autoAlpha: 1 },
          {
            scale: 0.94,
            autoAlpha: 0.55,
            ease: "none",
            scrollTrigger: { trigger: cards, start: "top 85%", end: "top 15%", scrub: 0.6 },
          },
        );
        // …and comes back to full strength as the last card moves off above it.
        const last = cards.querySelector<HTMLElement>(":scope > li:last-child");
        if (last) {
          // Explicit from-values, not applied until scrolled to: a `.to` here would capture the undimmed heading at load.
          gsap.fromTo(
            heading,
            { scale: 0.94, autoAlpha: 0.55 },
            {
              scale: 1,
              autoAlpha: 1,
              ease: "none",
              immediateRender: false,
              scrollTrigger: { trigger: last, start: "bottom 70%", end: "bottom 30%", scrub: 0.6 },
            },
          );
        }
      }
      gsap.utils.toArray<HTMLElement>("[data-work-cards] > li").forEach((card) => {
        gsap.fromTo(
          card,
          { y: 70, scale: 0.95 },
          { y: 0, scale: 1, ease: "power1.out", scrollTrigger: { trigger: card, start: "top bottom", end: "top 55%", scrub: 0.6 } },
        );
      });
    });

    // Our Story (large screens): the stage pins while the photo shrinks from filling the band into its window at the
    // left, re-framing from the wide shot to the design's closer crop, and the story text rises up into place beside it.
    // OurStory.module.css is the END state; this only describes the start — the full-bleed photo — relative to it, so
    // no JS / reduced motion simply shows the finished layout. Scrubbed, so scrolling back opens it out again.
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const section = document.querySelector<HTMLElement>("[data-story]");
      const stage = section?.querySelector<HTMLElement>("[data-story-stage]");
      const frame = section?.querySelector<HTMLElement>("[data-story-frame]");
      const photo = section?.querySelector<HTMLElement>("[data-story-photo]");
      const text = section?.querySelector<HTMLElement>("[data-story-text]");
      if (!section || !stage || !frame || !photo || !text) return;

      // End state (CSS): a square photo of side max(58% W, 93% H) centred at (27.17% W, 43.87% H). Full bleed: a W×W
      // square centred on the stage. So the start is that same element moved to the centre and scaled up to W.
      const W = () => stage.clientWidth;
      const H = () => stage.clientHeight;
      const side = () => Math.max(0.58 * W(), 0.93 * H());

      // The shrink follows the scroll (scrubbed) and leads with an ease-out, so the photo's edge clears the text column
      // early — it is about 61% across half-way through — and the text, which sits beneath the photo as designed, is seen
      // rising into place from below while the photo is still shrinking; it settles just before the photo does.
      gsap
        .timeline({
          defaults: { ease: "none" },
          // Starts as the section's top reaches the middle of the screen — half of it already in view — rather than only
          // once it has fully arrived, and finishes as the pinned stage lets go.
          scrollTrigger: { trigger: section, start: "top 50%", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
        })
        .fromTo(frame, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(10% 51.25% 10% 0%)", ease: "power2.out", duration: 0.8 }, 0)
        .fromTo(
          photo,
          { x: () => 0.2283 * W(), y: () => 0.0613 * H(), scale: () => W() / side(), transformOrigin: "50% 50%" },
          { x: 0, y: 0, scale: 1, ease: "power2.out", duration: 0.8 },
          0,
        )
        .fromTo(text, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, ease: "power1.out", duration: 0.5 }, 0.3)
        .to({}, { duration: 0.2 }); // a short hold on the finished layout before the stage lets go
    });

    // About gets its own block because it must also run on phones, where none of the conditions above match (a
    // matchMedia callback only runs while at least one of its conditions does). Reduced motion builds nothing, so the
    // watermark and figures stay exactly as server-rendered.
    mm.add(
      {
        reduced: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 1024px)",
        tablet: "(min-width: 768px) and (max-width: 1023px)",
        mobile: "(max-width: 767px)",
      },
      (context) => {
        const { reduced, desktop, tablet } = context.conditions as { reduced: boolean; desktop: boolean; tablet: boolean };
        if (reduced) return;

        // ---- About (Hero → About): the ABOUT watermark slides in from the right, behind the statement, into its
        //      design position, and the figures count up past their value and settle on it. The watermark is scrubbed — its
        //      position is a function of scroll, so stopping halfway holds halfway and scrolling up runs it back; the
        //      counts play on their own clock once visible (see playWhenVisible). ----
        const aboutRow = document.querySelector<HTMLElement>("[data-about-row]");
        const aboutWord = aboutRow?.querySelector<HTMLElement>("[data-about-word]");
        if (aboutRow && aboutWord) {
          // Desktop: ABOUT and the statement share a row, so it starts flush right — right behind the statement — and
          // travels the row. Tablet/mobile stack them, so it starts about half off the right edge (the section clips it).
          const startX = () =>
            desktop ? Math.max(aboutRow.offsetWidth - aboutWord.offsetWidth, 0) : aboutRow.offsetWidth * 0.45;
          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: aboutRow, // the row, not the moving word, so its own transform never skews the measurement
                start: "clamp(top bottom)", // tablet/short heroes: the row can already be in view at load
                end: desktop ? "top 30%" : "top 40%",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            })
            .fromTo(
              aboutWord,
              { x: startX, y: desktop ? 28 : 14, scale: desktop ? 1.06 : 1 },
              { x: 0, y: 0, scale: 1, ease: "power2.out", duration: 1 },
              0,
            )
            .fromTo(aboutWord, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0);
        }

        const aboutStats = document.querySelector<HTMLElement>("[data-about-stats]");
        if (aboutStats) {
          const counters = Array.from(aboutStats.querySelectorAll<HTMLElement>("[data-count]"))
            .map((el) => ({ el, count: countTimeline(el) }))
            .filter((c): c is { el: HTMLElement; count: NonNullable<ReturnType<typeof countTimeline>> } => !!c.count);

          const stops: (() => void)[] = [];
          if (desktop || tablet) {
            // Three columns side by side: one timeline, each figure starting a beat after the one before.
            const statsTl = gsap.timeline();
            counters.forEach(({ count }, i) => statsTl.add(count.tl, i * 0.15));
            stops.push(playWhenVisible(statsTl, aboutStats));
          } else {
            // Stacked on mobile: one shared start would finish the lower figures off screen, so each counts as it arrives.
            counters.forEach(({ el, count }) => {
              stops.push(playWhenVisible(count.tl, el.closest("li") ?? el));
            });
          }
          // On revert (unmount, breakpoint change), put the CMS figures back as rendered.
          return () => {
            stops.forEach((stop) => stop());
            counters.forEach(({ count }) => count.restore());
          };
        }
      },
    );

    // Fonts/images can still settle a beat after mount; one extra measurement keeps trigger positions accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  return null;
}
