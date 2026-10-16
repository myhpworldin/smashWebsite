"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/** Counts a `data-count` element's number up to its final text, keeping its commas and decimals. */
function countUp(el: HTMLElement) {
  const final = el.dataset.count ?? el.textContent ?? "0";
  const target = parseFloat(final.replace(/,/g, ""));
  if (!Number.isFinite(target)) return;
  const decimals = final.includes(".") ? final.split(".")[1].length : 0;
  const grouped = final.includes(",");
  const fmt = (v: number) => (grouped ? v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals));
  el.textContent = fmt(0);
  const o = { v: 0 };
  gsap.to(o, { v: target, duration: 1.8, ease: "power2.out", onUpdate: () => void (el.textContent = fmt(o.v)), onComplete: () => void (el.textContent = final), scrollTrigger: { trigger: el, start: "top 88%", once: true } });
}

/**
 * Scroll choreography for the Our Work pages, in the moves the rest of the site uses. Renders nothing; it animates the
 * `data-*` hooks the (server-rendered) pages carry. The hero's scroll-out and the pointer light are the shared SheetMotion,
 * and the generic `data-reveal` fade-ups are HomeAnimations'.
 *
 *   mask lines    `data-mask-line` headings rise out of their masks, once (as About's do)
 *   photo         `data-work-photo` opens like About's photos — a window growing to the full frame — as it comes up the
 *                 screen, with its picture (`data-work-img`) settling from a zoom
 *   rise          `data-work-rise` parts of a card, and the cards of a `data-work-rise-group`, come up in a cascade, once
 *   count         `data-count` figures count up to their value, once
 *   draw          a `data-work-draw` line draws itself across (with its `data-work-dot` end point popping in), once
 *   ring          `data-work-ring` outlines drift and swell slowly as their section passes (Careers' closing section)
 *   steps         `data-work-step` blocks of a case study light up (their outline number fills red) as they pass the middle
 *
 * Only transform / opacity / clip-path move. Reduced motion builds nothing: every part stays as rendered.
 */
export function WorkMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const all = <T extends Element>(sel: string) => gsap.utils.toArray<T>(sel);

      const lines = all<HTMLElement>("[data-mask-line]");
      if (lines.length) gsap.fromTo(lines, { yPercent: 115 }, { yPercent: 0, duration: 1, ease: "power3.out", stagger: 0.14, scrollTrigger: { trigger: lines[0], start: "top 88%", once: true } });

      all<HTMLElement>("[data-work-photo]").forEach((photo) => {
        gsap.fromTo(photo, { clipPath: "inset(14% 14% 14% 14% round 40px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.out", scrollTrigger: { trigger: photo, start: "top 92%", end: "top 40%", scrub: 0.6 } });
        const img = photo.querySelector("[data-work-img]");
        if (img) gsap.fromTo(img, { scale: 1.3 }, { scale: 1, ease: "none", scrollTrigger: { trigger: photo, start: "top bottom", end: "bottom 35%", scrub: 0.6 } });
      });

      all<HTMLElement>("[data-work-card]").forEach((card) => {
        const parts = gsap.utils.toArray<HTMLElement>("[data-work-rise]", card);
        if (parts.length) gsap.fromTo(parts, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.1, clearProps: "transform", scrollTrigger: { trigger: card, start: "top 70%", once: true } });
      });
      all<HTMLElement>("[data-work-rise-group]").forEach((group) => {
        const parts = gsap.utils.toArray<HTMLElement>(":scope > [data-work-rise]", group);
        if (parts.length) gsap.fromTo(parts, { y: 60, autoAlpha: 0, scale: 0.97 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.14, clearProps: "transform", scrollTrigger: { trigger: group, start: "top 82%", once: true } });
      });

      all<HTMLElement>("[data-count]").forEach(countUp);

      all<HTMLElement>("[data-careers-cta]").forEach((cta) => {
        gsap.fromTo(gsap.utils.toArray<HTMLElement>("[data-work-ring]", cta), { scale: 0.8 }, { scale: 1.12, ease: "none", stagger: 0.12, scrollTrigger: { trigger: cta, start: "top bottom", end: "bottom top", scrub: 0.8 } });
      });

      all<SVGPathElement>("[data-work-draw]").forEach((path) => {
        const dot = path.closest("[data-work-result]")?.querySelector("[data-work-dot]");
        // pathLength="1" on the path: the dash is measured in that unit, so it is right however the line is stretched.
        gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
        if (dot) gsap.set(dot, { opacity: 0, scale: 0 });
        const tl = gsap.timeline({ scrollTrigger: { trigger: path, start: "top 85%", once: true } });
        tl.to(path, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut" });
        if (dot) tl.to(dot, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "-=0.3");
      });

      all<HTMLElement>("[data-work-step]").forEach((step) =>
        ScrollTrigger.create({ trigger: step, start: "top 60%", end: "bottom 40%", onToggle: (self) => step.toggleAttribute("data-lit", self.isActive) }),
      );
    });

    // Fonts and images settle after mount; one extra measurement keeps every trigger position accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  return null;
}
