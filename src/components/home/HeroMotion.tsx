"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { diveEnd } from "./hero-runway";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Phone address bars grow and shrink while scrolling; without this every one of those resizes re-measures every trigger.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/**
 * The hero's scroll choreography, on the same runway as the globe's dive (HomeGlobe). Renders nothing; it animates
 * markup HeroSection already renders, tagged `data-hero-*`:
 *
 *   - the heading, supporting text and CTAs lift away at three different speeds (a layered parallax) and fade out in
 *     the first stretch of the scroll, leaving the globe alone on stage;
 *   - the scroll cue fades with the first touch of scrolling, and its two chevrons keep a slow ripple until then;
 *   - the progress rail on the right fills with the dive;
 *   - as the dive lands on Kerala, its caption rises in: the brand, the company, then the place.
 *
 * Everything but the chevron ripple is scrubbed, so scrolling back runs it in reverse. Reduced motion builds nothing:
 * the runway is then a normal-height hero (no pinned dive), the content stays put, and the Kerala caption stays hidden.
 */
export function HeroMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const runway = document.querySelector<HTMLElement>("[data-hero-runway]");
      if (!runway) return;
      const q = <T extends Element>(sel: string) => gsap.utils.toArray<T>(sel, runway);
      // One scrubbed timeline of length 1 over the runway's pinned scroll; positions below are fractions of the dive.
      const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: runway, start: "top top", end: diveEnd(runway), scrub: 0.4 } });

      // Content leaves over the first ~22%; each layer travels a different distance for depth.
      const layers: [string, number][] = [
        ["[data-hero-heading]", -110],
        ["[data-hero-text]", -70],
        ["[data-hero-cta]", -40],
      ];
      layers.forEach(([sel, y], i) => {
        tl.to(q(sel), { y, autoAlpha: 0, scale: 0.97, duration: 0.2, ease: "power1.in" }, i * 0.015);
      });
      tl.to(q("[data-hero-cue]"), { autoAlpha: 0, y: 12, duration: 0.06 }, 0);

      // Progress rail fills across the whole dive.
      tl.fromTo(q("[data-hero-rail-fill]"), { scaleY: 0 }, { scaleY: 1, transformOrigin: "top", duration: 1 }, 0);

      // Kerala caption: lands with the pin (the globe's timeline puts the pin at 71–83% of the runway).
      tl.fromTo(q("[data-hero-locale-item]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.1, stagger: 0.05 }, 0.74);

      // Chevron ripple on the scroll cue — only while the cue is on screen (it is gone after the first few percent).
      const ripple = gsap.fromTo(q("[data-hero-chevron]"), { opacity: 0.25 }, { opacity: 1, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: 0.25 });
      const gate = ScrollTrigger.create({ trigger: runway, start: "top top", end: () => `+=${0.06 * (runway.offsetHeight - 2 * window.innerHeight)}`, invalidateOnRefresh: true, onToggle: ({ isActive }) => (isActive ? ripple.resume() : ripple.pause()) });
      // Hand-over: once the dive is done About slides up over the pinned stage, which darkens as it is
      // covered (scrubbed, so scrolling back reverses it) — the same cover as the inner pages' hero under their first sheet.
      const cover = gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: runway, start: () => `top+=${runway.offsetHeight - 2 * window.innerHeight} top`, end: "bottom bottom", scrub: 0.4, invalidateOnRefresh: true } })
        .to(q("[data-hero-dim]"), { opacity: 0.7 }, 0);
      return () => {
        cover.kill();
        gate.kill();
        ripple.kill();
      };
    });
    return () => mm.revert();
  }, []);

  return null;
}
