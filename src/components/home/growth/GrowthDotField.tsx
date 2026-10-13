"use client";

import { useEffect, useRef } from "react";

/** The Growth Engine's interactive dot-field background (growth/createDotField.ts), loaded once the browser is idle so it never delays the section's text. */
export function GrowthDotField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    const start = () =>
      import("./createDotField").then(({ createDotField }) => {
        if (!cancelled) destroy = createDotField({ container, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches });
      });
    const hasIdle = typeof requestIdleCallback === "function";
    const idle = hasIdle ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300);
    return () => {
      cancelled = true;
      if (hasIdle) cancelIdleCallback(idle as number);
      else clearTimeout(idle);
      destroy?.();
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_35%,transparent_95%)]" />;
}
