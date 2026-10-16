"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll choreography for the Legal pages. Renders nothing; it animates `data-legal-*` hooks on the (server-rendered)
 * document. The hero's load-in is CSS and its scroll-out is the shared SheetMotion.
 *
 *   contents  the list on the left fades in as the sheet arrives, and a red line fills beside it as the text is read
 *   sections  each section's heading and blocks rise in once, in a quick cascade, as it is scrolled to
 *   card      the closing contact card rises on a scrub
 *   active    the contents link of the section in view is marked (`data-active`) — this is state, not motion, so it
 *             also runs for reduced motion
 *
 * Only transform / opacity move. Reduced motion builds none of the movement: every part stays as rendered.
 */
export function LegalMotion() {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const all = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector);
      const links = all<HTMLElement>("[data-legal-link]");
      const sections = all<HTMLElement>("[data-legal-section]");

      // Mark the section in view in both lists (the collapsed one below lg and the pinned one above).
      const mark = (id: string) => links.forEach((a) => (a.dataset.legalLink === id ? a.setAttribute("data-active", "") : a.removeAttribute("data-active")));
      sections.forEach((section) =>
        ScrollTrigger.create({ trigger: section, start: "top 45%", end: "bottom 45%", onToggle: (self) => self.isActive && mark(section.id) }),
      );

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const first = <T extends Element>(selector: string) => document.querySelector<T>(selector);

        const body = first<HTMLElement>("[data-legal]");
        const toc = first<HTMLElement>("[data-legal-toc]");
        if (toc && body) gsap.fromTo(toc, { x: -22, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", clearProps: "transform", scrollTrigger: { trigger: body, start: "top 70%", once: true } });

        const article = first<HTMLElement>("[data-legal-article]");
        const progress = first<HTMLElement>("[data-legal-progress]");
        if (article && progress) gsap.to(progress, { scaleY: 1, ease: "none", scrollTrigger: { trigger: article, start: "top 40%", end: "bottom 70%", scrub: 0.4 } });

        sections.forEach((section) => {
          const parts = gsap.utils.toArray<HTMLElement>("[data-legal-reveal]", section);
          if (parts.length) gsap.fromTo(parts, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.07, clearProps: "transform", scrollTrigger: { trigger: section, start: "top 85%", once: true } });
        });

        const card = first<HTMLElement>("[data-legal-card]");
        if (card) gsap.fromTo(card, { y: 70, scale: 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, ease: "power1.out", scrollTrigger: { trigger: card, start: "top 98%", end: "top 66%", scrub: 0.6 } });
      });
    });

    // Fonts and images settle after mount; one extra measurement keeps every trigger position accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, []);

  return null;
}
