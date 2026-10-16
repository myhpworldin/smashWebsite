"use client";

import { useEffect, useRef } from "react";

/**
 * The Home globe (globe/createGlobe.ts) as the hero's background: a layer filling the hero's sticky stage (z-1,
 * between the hero's mist and its content). The stage stays put while the hero's runway scrolls past, and the globe
 * turns to India and dives to Kerala over that scroll — all inside the hero; About is a separate section.
 *
 * Three.js and the map data are a separate chunk, imported only once the browser is idle, so the hero's text and
 * CTAs render and paint first; without WebGL the page simply has no globe. StrictMode-safe: cleanup cancels a pending
 * start and destroys a built globe, so the second mount starts clean and there is only ever one canvas.
 */
export function HomeGlobe() {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = stage.current;
    const runway = container?.closest<HTMLElement>("[data-hero-runway]");
    if (!container || !runway) return;
    const abort = new AbortController();
    let destroy: (() => void) | undefined;

    const start = () =>
      import("./globe/createGlobe").then(async ({ createGlobe }) => {
        if (abort.signal.aborted) return;
        const done = await createGlobe({ container, runway, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches, signal: abort.signal });
        // Unmounted during the build: the globe has already released itself, so there is nothing left to destroy.
        if (abort.signal.aborted) done();
        else destroy = done;
      });
    // Safari has no requestIdleCallback; a short timeout serves the same purpose there.
    const hasIdle = typeof requestIdleCallback === "function";
    const idle = hasIdle ? requestIdleCallback(start, { timeout: 800 }) : setTimeout(start, 200);

    return () => {
      abort.abort();
      if (hasIdle) cancelIdleCallback(idle as number);
      else clearTimeout(idle);
      destroy?.();
    };
  }, []);

  return <div ref={stage} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" />;
}
