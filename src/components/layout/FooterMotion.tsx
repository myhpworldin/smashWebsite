"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The footer's "Let'sTalk" watermark moves like the Home About watermark (HomeAnimations): scrubbed to scroll, it
 * slides in from the right, behind the call to action, into its resting place as the footer comes into view, and runs
 * back when scrolled up. Renders nothing; it animates the `data-footer-row` / `data-footer-word` markup the (server
 * rendered) Footer already has, so the footer stays a server component and works on every page. Reduced motion
 * builds nothing and leaves the watermark where it is rendered.
 *
 * The footer lives in the root layout, so it is not remounted when the visitor navigates between pages — but every
 * page has a different height (Home pins sections and is ~15,000px tall). The scroll trigger is therefore rebuilt on
 * every route change, after the new page has mounted, and measured last (`refreshPriority: -1`) so Home's pinned sections
 * above it are counted; left alone it kept stale measurements and the watermark never moved on a page reached by a link
 * rather than a fresh load.
 */
export function FooterMotion() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add({ ok: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 1024px)" }, (context) => {
      const { ok, desktop } = context.conditions as { ok: boolean; desktop: boolean };
      if (!ok) return;
      const row = document.querySelector<HTMLElement>("[data-footer-row]");
      const word = row?.querySelector<HTMLElement>("[data-footer-word]");
      if (!row || !word) return;
      // Desktop: starts flush right, right behind the call to action, and travels the row. Narrower screens stack the
      // two, so it starts about half off the right edge (the footer clips it).
      // The watermark rests at the design's faint opacity (a class); the fade must end there, not at 1.
      const rest = parseFloat(getComputedStyle(word).opacity) || 1;
      const startX = () => (desktop ? Math.max(row.offsetWidth - word.offsetWidth, 0) : row.offsetWidth * 0.45);
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: row,
            start: "clamp(top bottom)",
            end: desktop ? "clamp(top 55%)" : "clamp(top 70%)", // clamped: the footer ends the page, so the row may never climb higher
            scrub: 0.8,
            invalidateOnRefresh: true,
            // The footer ends the page: its positions must be measured after every pin above it has added its scroll
            // distance. ScrollTrigger measures in creation order, and a layout that outlives the page is created first.
            refreshPriority: -1,
          },
        })
        .fromTo(word, { x: startX, y: desktop ? 28 : 14, scale: desktop ? 1.06 : 1 }, { x: 0, y: 0, scale: 1, ease: "power2.out", duration: 1 }, 0)
        .fromTo(word, { autoAlpha: 0 }, { autoAlpha: rest, duration: 0.3 }, 0);
    });
    // Images and pinned sections below the fold settle a beat after the page mounts; measure once more when they have.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      window.clearTimeout(refresh);
      mm.revert();
    };
  }, [pathname]);

  return null;
}
