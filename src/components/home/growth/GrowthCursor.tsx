"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * The Growth Engine's own cursor, for mouse users only: the system arrow is hidden over the section and replaced by a
 * small bright dot exactly at the pointer plus a thin ring that trails it, swelling a little with speed, pulsing red
 * on click, and fading out when the pointer leaves. Placed inside the section (which positions it) and sized by GSAP;
 * touch screens and `pointer: coarse` devices never see it. Reduced motion: the ring follows without trailing or swelling.
 */
export function GrowthCursor() {
  const ring = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ringEl = ring.current;
    const dotEl = dot.current;
    const section = ringEl?.parentElement;
    if (!ringEl || !dotEl || !section || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.set([ringEl, dotEl], { xPercent: -50, yPercent: -50, opacity: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 });
    const ringX = gsap.quickTo(ringEl, "x", { duration: reduced ? 0 : 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ringEl, "y", { duration: reduced ? 0 : 0.45, ease: "power3.out" });
    const ringSX = gsap.quickTo(ringEl, "scaleX", { duration: 0.5, ease: "power2.out" });
    const ringSY = gsap.quickTo(ringEl, "scaleY", { duration: 0.5, ease: "power2.out" });
    const ringScale = (v: number) => {
      ringSX(v);
      ringSY(v);
    };
    let lastX = 0;
    let lastY = 0;
    let visible = false;
    let settle: gsap.core.Tween | undefined;

    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (!visible) {
        visible = true;
        gsap.set([ringEl, dotEl], { x, y });
        gsap.to([ringEl, dotEl], { opacity: 1, duration: 0.3 });
        section.style.cursor = "none";
      }
      gsap.set(dotEl, { x, y });
      ringX(x);
      ringY(y);
      if (!reduced) {
        ringScale(1 + Math.min(Math.hypot(x - lastX, y - lastY) / 60, 0.7));
        settle?.kill();
        settle = gsap.delayedCall(0.08, () => ringScale(1));
      }
      lastX = x;
      lastY = y;
    };
    const onLeave = () => {
      visible = false;
      section.style.cursor = "";
      gsap.to([ringEl, dotEl], { opacity: 0, duration: 0.25 });
    };
    const onDown = () => {
      if (!visible) return;
      gsap.fromTo(ringEl, { borderColor: "#e90101", boxShadow: "0 0 24px rgba(233,1,1,0.7)" }, { borderColor: "rgba(120,180,255,0.55)", boxShadow: "0 0 18px rgba(0,88,200,0.55)", duration: 0.6, ease: "power2.out" });
      gsap.fromTo(dotEl, { scaleX: 2.4, scaleY: 2.4 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "back.out(2)" });
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    section.addEventListener("pointerdown", onDown);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("pointerdown", onDown);
      section.style.cursor = "";
      settle?.kill();
      gsap.killTweensOf([ringEl, dotEl]);
    };
  }, []);

  return (
    <>
      <span ref={ring} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[5] size-9 rounded-full border border-[rgba(120,180,255,0.55)] opacity-0 shadow-[0_0_18px_rgba(0,88,200,0.55)]" />
      <span ref={dot} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[5] size-1.5 rounded-full bg-[#7cc4ff] opacity-0 shadow-[0_0_10px_3px_rgba(90,164,255,0.8)]" />
    </>
  );
}
