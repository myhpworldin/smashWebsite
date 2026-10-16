"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The motion every redesigned inner page (About, Contact) shares. Renders nothing; it animates `data-*` hooks that
 * `SheetHero` and the page's cards carry, so those stay server components.
 *
 *   hero     while the first sheet slides over the sticky hero (`[data-sheet-top]`) the content lifts and fades, the scroll
 *            cue goes and the photo pushes in — scrubbed, so scrolling back runs it in reverse
 *   pointer  a light follows the pointer across any `[data-spot]` card (hover devices only)
 *
 * Only transform / opacity move. Reduced motion builds nothing.
 */
export function SheetMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ ok: "(prefers-reduced-motion: no-preference)", hover: "(hover: hover)" }, (context) => {
      const { ok, hover } = context.conditions as { ok: boolean; hover: boolean };
      if (!ok) return;
      const all = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector);
      const cleanups: (() => void)[] = [];

      const top = document.querySelector("[data-sheet-top]");
      if (top) {
        gsap
          .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: top, start: "top top", end: () => `+=${window.innerHeight}`, scrub: 0.4, invalidateOnRefresh: true } })
          .to(all("[data-sheet-hero-content]"), { y: -90, autoAlpha: 0.1, scale: 0.97, ease: "power1.in" }, 0)
          .to(all("[data-sheet-cue]"), { autoAlpha: 0, y: 10, duration: 0.25 }, 0)
          .to(all("[data-sheet-banner]"), { scale: 1.12, y: 50 }, 0);
      }

      if (hover) {
        let raf = 0;
        let last: PointerEvent | null = null;
        const paint = () => {
          raf = 0;
          const target = (last?.target as Element | null)?.closest<HTMLElement>("[data-spot]");
          if (!target || !last) return;
          const box = target.getBoundingClientRect();
          target.style.setProperty("--mx", `${last.clientX - box.left}px`);
          target.style.setProperty("--my", `${last.clientY - box.top}px`);
        };
        const onMove = (event: PointerEvent) => {
          last = event;
          if (!raf) raf = requestAnimationFrame(paint);
        };
        document.addEventListener("pointermove", onMove, { passive: true });
        cleanups.push(() => {
          document.removeEventListener("pointermove", onMove);
          cancelAnimationFrame(raf);
        });
      }

      return () => cleanups.forEach((fn) => fn());
    });
    return () => mm.revert();
  }, []);

  return null;
}
