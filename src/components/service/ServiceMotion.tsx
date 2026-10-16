"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The service pages' scroll choreography. Renders nothing; it animates the `data-sv-*` / `data-pr-*` hooks the
 * (server-rendered) sections carry, so they stay server components — the same split as AboutMotion. The hero's
 * scroll-out and the pointer light on cards are the shared SheetMotion; the hero's load-in is CSS.
 *
 *   words      every heading's words rise out of their masks, one after another, as it comes into view (once)
 *   rule/line  the eyebrow rule and the takeaways' hairlines draw across (once)
 *   up/stagger copy fades up; grids of cards rise in a ripple (once). The cards' own hover transitions are paused while
 *              they move, so the two never fight over the same transform
 *   media      a photo unmasks as it scrolls in and drifts at its own speed; an interface picture (`data-sv-flat`) rises and fades
 *              in whole, never zoomed or clipped; the red frame slides into place either way (scrubbed)
 *   process    the rail fills with the scroll and the stage in the middle of the screen lights up (scrubbed)
 *   outcome    the highlight's bar draws down
 *
 * Only transform / opacity / clip-path move. Reduced motion builds nothing: every section stays as rendered.
 */
export function ServiceMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ ok: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 1024px)" }, (context) => {
      const { ok, desktop } = context.conditions as { ok: boolean; desktop: boolean };
      if (!ok) return;
      const all = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector);
      const first = <T extends Element>(selector: string) => document.querySelector<T>(selector);
      const cleanups: (() => void)[] = [];
      const once = (trigger: Element, start = "top 88%") => ({ trigger, start, once: true });

      /* ---- Headings: words rise out of their masks ---- */
      all<HTMLElement>("[data-sv-words]").forEach((heading) => {
        gsap.fromTo(heading.querySelectorAll("[data-sv-w]"), { yPercent: 118 }, { yPercent: 0, duration: 1, ease: "power3.out", stagger: 0.055, scrollTrigger: once(heading) });
      });

      /* ---- Rules and hairlines draw across ---- */
      all<HTMLElement>("[data-sv-rule]").forEach((rule) => {
        gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut", scrollTrigger: once(rule, "top 92%") });
      });
      all<HTMLElement>("[data-sv-line]").forEach((line, i) => {
        gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.inOut", delay: (i % 6) * 0.08, scrollTrigger: once(line, "top 92%") });
      });

      /* ---- Copy fades up; card grids rise in a ripple ---- */
      all<HTMLElement>("[data-sv-up]").forEach((el) => {
        gsap.fromTo(el, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", clearProps: "transform,opacity,visibility", scrollTrigger: once(el, "top 92%") });
      });
      all<HTMLElement>("[data-sv-stagger]").forEach((group) => {
        const kids = gsap.utils.toArray<HTMLElement>(group.children);
        kids.forEach((kid) => (kid.style.transition = "none"));
        gsap.fromTo(
          kids,
          { y: desktop ? 60 : 36, autoAlpha: 0, scale: 0.97 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.95,
            ease: "power3.out",
            stagger: { each: 0.09, from: "start" },
            scrollTrigger: once(group, "top 86%"),
            onComplete: () => {
              gsap.set(kids, { clearProps: "transform,opacity,visibility" });
              kids.forEach((kid) => (kid.style.transition = ""));
            },
          },
        );
      });

      /* ---- Pictures: unmask, drift, and the frame slides into place ---- */
      all<HTMLElement>("[data-sv-media]").forEach((media) => {
        const frame = media.parentElement?.querySelector("[data-sv-frame]");
        if (frame) gsap.fromTo(frame, { x: 0, y: 0, autoAlpha: 0 }, { x: desktop ? -8 : 0, y: desktop ? -8 : 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: media, start: "top 85%", end: "top 35%", scrub: 0.6 } });
        if (media.hasAttribute("data-sv-flat")) {
          // An interface picture is never zoomed, drifted or clipped (that crops its labels): it rises and fades in whole.
          gsap.fromTo(media, { y: 48, autoAlpha: 0, scale: 0.97 }, { y: 0, autoAlpha: 1, scale: 1, ease: "power2.out", scrollTrigger: { trigger: media, start: "top 94%", end: "top 52%", scrub: 0.6 } });
          return;
        }
        gsap.fromTo(media, { clipPath: "inset(14% 6% 14% 6% round 40px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "power2.out", scrollTrigger: { trigger: media, start: "top 94%", end: "top 40%", scrub: 0.6 } });
        const img = media.querySelector("[data-sv-img]");
        if (img) gsap.fromTo(img, { scale: 1.3, yPercent: -5 }, { scale: 1, yPercent: 5, ease: "none", scrollTrigger: { trigger: media, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      });

      /* ---- Process: the rail fills, the middle stage lights up ---- */
      const list = first<HTMLElement>("[data-pr-list]");
      if (list) {
        list.setAttribute("data-live", "");
        cleanups.push(() => list.removeAttribute("data-live"));
        all<HTMLElement>("[data-pr-stage]").forEach((stage) => {
          ScrollTrigger.create({ trigger: stage, start: "top 62%", end: "bottom 62%", onToggle: ({ isActive }) => stage.toggleAttribute("data-active", isActive) });
        });
        gsap.fromTo(all("[data-pr-rail]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 62%", end: "bottom 62%", scrub: 0.4 } });
      }

      /* ---- Outcome: the highlight's bar draws down ---- */
      all<HTMLElement>("[data-sv-bar]").forEach((bar) => {
        gsap.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: "power3.inOut", delay: 0.25, scrollTrigger: once(bar, "top 92%") });
      });

      return () => cleanups.forEach((fn) => fn());
    });

    // Pictures below the fold settle after mount; one extra measurement keeps every trigger position accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  return null;
}
