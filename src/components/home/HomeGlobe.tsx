"use client";

import { useEffect, useRef } from "react";

/**
 * The Home globe (globe/createGlobe.ts) as a background spanning Hero + About. It is the first child of the page's
 * Hero+About wrapper: an absolute layer the height of both sections (z-1, between their backgrounds and their
 * content) holding a viewport-sized sticky stage, so the globe stays put while the hero scrolls away over it and
 * keeps going — turning to India and diving to Kerala — behind About.
 *
 * Three.js and the map data are a separate chunk, imported only once the browser is idle, so the hero's text and
 * CTAs render and paint first; without WebGL the page simply has no globe. StrictMode-safe: cleanup cancels a pending
 * start and destroys a built globe, so the second mount starts clean and there is only ever one canvas.
 */
export function HomeGlobe() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = root.current;
    const container = stage.current;
    const hero = layer?.parentElement?.querySelector<HTMLElement>('[data-home-section="hero"]');
    if (!layer || !container || !hero) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;

    const start = () =>
      import("./globe/createGlobe").then(({ createGlobe }) => {
        if (cancelled) return;
        destroy = createGlobe({ container, layer, hero, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
      });
    // Safari has no requestIdleCallback; a short timeout serves the same purpose there.
    const hasIdle = typeof requestIdleCallback === "function";
    const idle = hasIdle ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 200);

    return () => {
      cancelled = true;
      if (hasIdle) cancelIdleCallback(idle as number);
      else clearTimeout(idle);
      destroy?.();
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
      <div ref={stage} className="sticky top-0 h-screen w-full overflow-hidden" />
    </div>
  );
}
