"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

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
