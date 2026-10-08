"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * A Gaussian-blurred disc as a radial gradient: full colour until two blur radii inside the edge, half at the edge,
 * gone two blur radii outside it — the same falloff as Figma's layer blur, without a per-frame `filter: blur()`.
 * `edge` and `sigma` are fractions of the layer's half-size.
 */
const mist = (rgb: string, edge: number, sigma: number) => {
  const at = (k: number) => `${Math.max(0, (edge + k * sigma) * 100).toFixed(1)}%`;
  return `radial-gradient(closest-side, rgba(${rgb},0.98) ${at(-2)}, rgba(${rgb},0.84) ${at(-1)}, rgba(${rgb},0.5) ${at(0)}, rgba(${rgb},0.16) ${at(1)}, rgba(${rgb},0) ${at(2)})`;
};

const BRIGHT = "0,88,200"; // #0058C8
const DEEP = "6,26,158"; // #061A9E

/**
 * The hero's four glows (Figma "Desktop - 1": Ellipse 9, 12, 10, 11, in the design's paint order), each placed as
 * its blur box on the 1440×800 frame in percentages so they scale with the hero.
 *
 * `drift` is each layer's motion, all as GSAP loops: `x`/`y` are how far it travels each way (percent of its own
 * size), `scale` how much it swells, `fade` the lowest opacity it breathes down to, and `t` the seconds each of
 * those four loops takes (x, y, scale, opacity). Because the four loops have different lengths, the glow traces a
 * slow curving path rather than a straight back-and-forth, and the layers never fall into step.
 */
const LAYERS = [
  // Ellipse 9 — the main bright field, upper left.
  { style: { left: "-30.6%", top: "-20.6%", width: "99.7%", height: "179.5%", background: mist(BRIGHT, 0.652, 0.174) }, drift: { x: 24, y: 10, scale: 1.15, fade: 0.8, t: [5, 4, 4.5, 3.5] } },
  // Ellipse 12 — bright, bottom right.
  { style: { left: "39.1%", top: "45.5%", width: "69.7%", height: "125.8%", background: mist(BRIGHT, 0.5, 0.25) }, drift: { x: -28, y: -14, scale: 1.2, fade: 0.65, t: [4.5, 6, 4, 3.5] } },
  // Ellipse 10 — deep blue, lower centre.
  { style: { left: "10.6%", top: "36.8%", width: "71.8%", height: "129.3%", background: mist(DEEP, 0.625, 0.188) }, drift: { x: 22, y: -12, scale: 1.18, fade: 0.75, t: [6.5, 4, 5, 4] } },
  // Ellipse 11 — deep blue, lower right edge.
  { style: { left: "67.1%", top: "30%", width: "67.6%", height: "131.4%", background: mist(DEEP, 0.61, 0.19) }, drift: { x: -26, y: 12, scale: 1.12, fade: 0.7, t: [5, 6, 4, 4.5] } },
];

/**
 * Home hero background: black with the design's blue glows drifting like mist (GSAP). Every motion is a
 * `sine.inOut` yoyo loop, so it eases smoothly at each turn and there is never a reset. Layers sit behind the hero
 * content (-z-10) and are clipped by the hero. With reduced motion the glows stay still in the design's resting
 * composition. The loops are scoped to this component's matchMedia and reverted on unmount (StrictMode-safe: the
 * second mount starts from a clean revert, so there are never duplicate loops).
 */
export function HeroAtmosphere() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.utils.toArray<HTMLElement>("[data-mist]").forEach((el, i) => {
          const { x, y, scale, fade, t } = LAYERS[i].drift;
          const loop = { ease: "sine.inOut", repeat: -1, yoyo: true } as const;
          // Each loop starts half-way through its first leg, from the design's resting place, so nothing jumps on load.
          gsap.fromTo(el, { xPercent: -x }, { xPercent: x, duration: t[0], ...loop }).progress(0.5);
          gsap.fromTo(el, { yPercent: -y }, { yPercent: y, duration: t[1], ...loop }).progress(0.5);
          gsap.fromTo(el, { scale: 1 }, { scale, duration: t[2], ...loop });
          gsap.fromTo(el, { opacity: 1 }, { opacity: fade, duration: t[3], ...loop });
        });
      },
      root,
    );
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      {LAYERS.map((layer, i) => (
        <div key={i} data-mist className="absolute will-change-[transform,opacity]" style={layer.style} />
      ))}
      {/* The design's 10% #1E1E1E veil over the glows. */}
      <div className="absolute inset-0 bg-[#1e1e1e]/10" />
    </div>
  );
}
