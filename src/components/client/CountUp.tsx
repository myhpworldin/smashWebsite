"use client";

import { useEffect, useRef } from "react";
import { formatCount, formatMoney, type ClientCurrency } from "@/lib/client-options";

/**
 * A figure that counts up from zero when it first appears on screen. The server renders the final value, so it is correct with
 * no JavaScript and under reduced motion, and the animation only ever rewrites the text on screen: it starts when the element is
 * in view, eases out, and `aria-label` carries the real figure so a screen reader never hears the numbers in between.
 */
export function CountUp({ value, kind = "count", currency = "INR", suffix = "", durationMs = 1100 }: { value: number; kind?: "count" | "money" | "percent"; currency?: ClientCurrency; suffix?: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const format = (n: number) => (kind === "money" ? formatMoney(n, currency) : kind === "percent" ? `${Math.round(n)}%` : `${formatCount(n, currency)}${suffix}`);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || value <= 0) return;
    let frame = 0;
    el.textContent = format(0);
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        el.textContent = format(value * (1 - Math.pow(1 - t, 4)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      run();
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // `format` is derived from the props listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, kind, currency, suffix, durationMs]);

  return <span ref={ref} aria-label={format(value)}>{format(value)}</span>;
}
