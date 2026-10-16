"use client";

import { useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The Services page's scroll choreography. Renders nothing; it animates the `data-svc-*` hooks the catalogue's sheets
 * carry. The hero's scroll-out and the pointer light on the cards are the shared SheetMotion.
 *
 *   number    each service's large outline number slides in from the left as its sheet rises into view (scrubbed)
 *   heading   the eyebrow fades up and the name rises out of its mask
 *   cards     the offerings come up in a quick cascade when their grid arrives
 *
 * Built once, on first paint. Typing in the search box later only adds or removes cards and sheets — cards that appear
 * are simply shown (re-running the entrance on every keystroke would be noise), and `signature`, which changes when the
 * visible set does, only asks ScrollTrigger to re-measure so the triggers still fire at the right scroll positions.
 * Only transform / opacity move. Reduced motion builds nothing: everything stays as rendered.
 */
export function ServicesMotion({ signature }: { signature: string }) {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-svc-group]").forEach((group) => {
        const q = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector, group);
        const num = q("[data-svc-num]");
        if (num.length) gsap.fromTo(num, { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: group, start: "top 92%", end: "top 45%", scrub: 0.6 } });
        const eyebrow = q("[data-svc-eyebrow]");
        if (eyebrow.length) gsap.fromTo(eyebrow, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: group, start: "top 62%", once: true } });
        gsap.fromTo(q("[data-mask-line]"), { yPercent: 115 }, { yPercent: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: group, start: "top 62%", once: true } });
        const cards = q("[data-svc-card]");
        if (cards.length) gsap.fromTo(cards, { y: 60, scale: 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.09, clearProps: "transform", scrollTrigger: { trigger: q("[data-svc-cards]")[0] ?? group, start: "top 85%", once: true } });
      });
    });
    // Images and fonts settle after mount; one extra measurement keeps every trigger position accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  // The visible set changed (search): sheets moved, so triggers are re-measured — not rebuilt.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [signature]);

  return null;
}
