"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The Contact page's scroll choreography. Renders nothing; it animates `data-*` hooks the (server-rendered) page and
 * its form carry. The hero's scroll-out and the pointer light on the Direct Contacts card are the shared SheetMotion.
 *
 *   heading   the eyebrow fades up and the heading rises out of its mask
 *   card      the Direct Contacts card rises on a scrub, then its rows slide in one after another
 *   form      the form card rises on a scrub, then its fields come up in a quick cascade
 *
 * Only transform / opacity move. Reduced motion builds nothing: every part stays as rendered.
 */
export function ContactMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const all = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector);
      const first = <T extends Element>(selector: string) => document.querySelector<T>(selector);

      const section = first("[data-contact]");
      if (section) {
        gsap.fromTo(all("[data-contact-eyebrow]"), { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 60%", once: true } });
        gsap.fromTo(all("[data-mask-line]"), { yPercent: 115 }, { yPercent: 0, duration: 1, ease: "power3.out", stagger: 0.14, scrollTrigger: { trigger: section, start: "top 60%", once: true } });
      }

      const card = first<HTMLElement>("[data-contact-card]");
      if (card) {
        gsap.fromTo(card, { y: 70, scale: 0.96, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, ease: "power1.out", scrollTrigger: { trigger: card, start: "top 96%", end: "top 62%", scrub: 0.6 } });
        const rows = gsap.utils.toArray<HTMLElement>("[data-contact-rows] > *", card);
        if (rows.length) gsap.fromTo(rows, { x: -26, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.1, clearProps: "transform", scrollTrigger: { trigger: card, start: "top 72%", once: true } });
      }

      const form = first<HTMLElement>("[data-contact-form]");
      if (form) {
        gsap.fromTo(form, { y: 90, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: "power1.out", scrollTrigger: { trigger: form, start: "top 96%", end: "top 62%", scrub: 0.6 } });
        // `:scope >` so only the form's own rows and fields cascade, not what is inside them. The honeypot sits off-screen and is skipped.
        const parts = gsap.utils.toArray<HTMLElement>(":scope > *:not([aria-hidden='true'])", form);
        gsap.fromTo(parts, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.06, clearProps: "transform", scrollTrigger: { trigger: form, start: "top 70%", once: true } });
      }
    });

    // Images and fonts settle after mount; one extra measurement keeps every trigger position accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  return null;
}
