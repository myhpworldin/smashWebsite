"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The About page's scroll choreography. Renders nothing; it animates markup the (server-rendered) About sections
 * already carry as `data-*` hooks, so the sections stay server components — the same split as HomeAnimations, whose
 * generic `data-reveal` fade-ups the page also mounts. Every motion is tied to scroll position (scrubbed) unless it is
 * a one-off reveal, so stopping holds the frame and scrolling back runs it in reverse. Only transform / opacity /
 * clip-path move — nothing here changes layout. The hero's scroll-out and the pointer light are the shared SheetMotion. Reduced motion builds nothing: every section stays as rendered.
 *
 *   story        the sentence is read in word by word as it crosses the screen
 *   built to move  the card's lines rise, the photos unmask from below, and the three columns drift at their own speeds
 *   mission      the two panels slide in from their sides, the connector draws down to the target
 *   values       the cards rise on a scrub, as Home's case-study cards do
 *   growth       the stage in the middle of the screen lights up, the rail fills and the counter follows
 *   culture      the photo unmasks, its frame slides into place, the picture drifts
 */
export function AboutMotion() {
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ ok: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 1024px)" }, (context) => {
      const { ok, desktop } = context.conditions as { ok: boolean; desktop: boolean };
      if (!ok) return;
      const all = <T extends Element>(selector: string) => gsap.utils.toArray<T>(selector);
      const first = <T extends Element>(selector: string) => document.querySelector<T>(selector);
      const cleanups: (() => void)[] = [];

      /* ---- Story: the sentence is read in word by word ---- */
      const words = all<HTMLElement>("[data-story-word]");
      const sentence = first("[data-story-text]");
      if (words.length && sentence) {
        gsap.set(words, { opacity: 0.14 });
        gsap.to(words, {
          opacity: (_i, el: HTMLElement) => Number(el.dataset.rest ?? 1),
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: sentence, start: "top 80%", end: "bottom 55%", scrub: 0.5 },
        });
      }

      /* ---- Built to move: lines, unmasking photos, drift ---- */
      const move = first("[data-move]");
      if (move) {
        gsap.fromTo(all("[data-mask-line]"), { yPercent: 115 }, { yPercent: 0, duration: 1, ease: "power3.out", stagger: 0.16, scrollTrigger: { trigger: move, start: "top 65%", once: true } });
        all<HTMLElement>("[data-move-photo]").forEach((photo) => {
          gsap.fromTo(photo, { clipPath: "inset(100% 0% 0% 0% round 20px)" }, { clipPath: "inset(0% 0% 0% 0% round 20px)", ease: "power2.out", scrollTrigger: { trigger: photo, start: "top 92%", end: "top 45%", scrub: 0.6 } });
          const img = photo.querySelector("[data-move-img]");
          if (img) gsap.fromTo(img, { scale: 1.35 }, { scale: 1, ease: "none", scrollTrigger: { trigger: photo, start: "top bottom", end: "bottom 30%", scrub: 0.6 } });
        });
        if (desktop) {
          // The card and the two photos travel at different speeds, so the staggered row loosens and re-aligns as it passes.
          all<HTMLElement>("[data-move-speed]").forEach((el) => {
            const speed = Number(el.dataset.moveSpeed ?? 1);
            gsap.fromTo(el, { y: speed * 48 }, { y: speed * -48, ease: "none", scrollTrigger: { trigger: move, start: "top bottom", end: "bottom top", scrub: 0.6 } });
          });
        }
      }

      /* ---- Mission / Vision ---- */
      const mv = first("[data-mv]");
      if (mv) {
        all<HTMLElement>("[data-mv-panel]").forEach((panel) => {
          const from = desktop ? { x: panel.dataset.mvPanel === "left" ? -70 : 70 } : { y: 50 };
          gsap.fromTo(panel, { ...from, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: panel, start: "top 90%", end: "top 50%", scrub: 0.6 } });
        });
        gsap.fromTo(all("[data-mv-line]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: mv, start: "top 60%", end: "top 15%", scrub: 0.6 } });
        gsap.fromTo(all("[data-mv-icon]"), { rotate: -120, scale: 0.4, autoAlpha: 0 }, { rotate: 0, scale: 1, autoAlpha: 1, ease: "back.out(1.6)", scrollTrigger: { trigger: mv, start: "top 45%", end: "top 15%", scrub: 0.6 } });
      }

      /* ---- Values: cards rise on a scrub ---- */
      all<HTMLElement>("[data-values-card]").forEach((card) => {
        gsap.fromTo(card, { y: 90, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, ease: "power1.out", scrollTrigger: { trigger: card, start: "top bottom", end: "top 62%", scrub: 0.6 } });
      });

      /* ---- Growth: light the stage in the middle of the screen ---- */
      const list = first<HTMLElement>("[data-stage-list]");
      if (list) {
        list.setAttribute("data-live", "");
        cleanups.push(() => list.removeAttribute("data-live"));
        const counter = first<HTMLElement>("[data-stage-current]");
        all<HTMLElement>("[data-stage]").forEach((stage, i) => {
          ScrollTrigger.create({
            trigger: stage,
            start: "top 60%",
            end: "bottom 60%",
            onToggle: ({ isActive }) => {
              stage.toggleAttribute("data-active", isActive);
              if (isActive && counter) {
                counter.textContent = String(i + 1).padStart(2, "0");
                gsap.fromTo(counter, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out", overwrite: true });
              }
            },
          });
        });
        gsap.fromTo(all("[data-stage-rail]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 60%", end: "bottom 60%", scrub: 0.4 } });
      }

      /* ---- Culture: photo unmasks, frame slides in, picture drifts ---- */
      const photo = first<HTMLElement>("[data-culture-photo]");
      if (photo) {
        gsap.fromTo(photo, { clipPath: "inset(0% 0% 100% 0% round 20px)" }, { clipPath: "inset(0% 0% 0% 0% round 20px)", ease: "power2.out", scrollTrigger: { trigger: photo, start: "top 90%", end: "top 45%", scrub: 0.6 } });
        gsap.fromTo(all("[data-culture-img]"), { scale: 1.3, yPercent: -6 }, { scale: 1, yPercent: 6, ease: "none", scrollTrigger: { trigger: photo, start: "top bottom", end: "bottom top", scrub: 0.6 } });
        gsap.fromTo(all("[data-culture-frame]"), { x: -40, y: -40, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: photo, start: "top 85%", end: "top 40%", scrub: 0.6 } });
      }

      return () => cleanups.forEach((fn) => fn());
    });

    // Images below the fold settle after mount; one extra measurement keeps every trigger position accurate.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  return null;
}
