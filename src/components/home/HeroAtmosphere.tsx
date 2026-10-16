"use client";

import { diveEnd } from "./hero-runway";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const BRIGHT = "0,88,200"; // #0058C8
const DEEP = "6,26,158"; // #061A9E

/**
 * The hero's four glows (Figma "Desktop - 1": Ellipse 9, 12, 10, 11, in the design's paint order), each placed as
 * its blur box on the 1440×800 frame in percentages of the hero, so they scale with it.
 *
 * Each glow is a Gaussian-blurred disc drawn as a radial gradient: full colour until two blur radii inside the edge,
 * half at the edge, gone two blur radii outside it — the same falloff as Figma's layer blur. `edge` and `sigma` are
 * fractions of the box's half-size.
 *
 * `drift` is each layer's motion, all as GSAP loops: `x`/`y` are how far it travels each way (percent of its own
 * size), `scale` how much it swells, `fade` the lowest opacity it breathes down to, and `t` the seconds each of
 * those four loops takes (x, y, scale, opacity). Because the four loops have different lengths, the glow traces a
 * slow curving path rather than a straight back-and-forth, and the layers never fall into step.
 */
const LAYERS = [
  // Ellipse 9 — the main bright field, upper left.
  { box: { left: -30.6, top: -20.6, width: 99.7, height: 179.5 }, rgb: BRIGHT, edge: 0.652, sigma: 0.174, drift: { x: 24, y: 10, scale: 1.15, fade: 0.8, t: [5, 4, 4.5, 3.5] } },
  // Ellipse 12 — bright, bottom right.
  { box: { left: 39.1, top: 45.5, width: 69.7, height: 125.8 }, rgb: BRIGHT, edge: 0.5, sigma: 0.25, drift: { x: -28, y: -14, scale: 1.2, fade: 0.65, t: [4.5, 6, 4, 3.5] } },
  // Ellipse 10 — deep blue, lower centre.
  { box: { left: 10.6, top: 36.8, width: 71.8, height: 129.3 }, rgb: DEEP, edge: 0.625, sigma: 0.188, drift: { x: 22, y: -12, scale: 1.18, fade: 0.75, t: [6.5, 4, 5, 4] } },
  // Ellipse 11 — deep blue, lower right edge.
  { box: { left: 67.1, top: 30, width: 67.6, height: 131.4 }, rgb: DEEP, edge: 0.61, sigma: 0.19, drift: { x: -26, y: 12, scale: 1.12, fade: 0.7, t: [5, 6, 4, 4.5] } },
];

/** The gradient's five stops as [position 0–1 along the box's half-size, alpha], position = edge + k·sigma for k = −2…2. */
const stops = ({ edge, sigma }: (typeof LAYERS)[number]): [number, number][] =>
  [[-2, 0.98], [-1, 0.84], [0, 0.5], [1, 0.16], [2, 0]].map(([k, a]) => [Math.min(1, Math.max(0, edge + k * sigma)), a]);

/** The same glow as a CSS gradient, for the server-rendered first paint. */
const cssGradient = (layer: (typeof LAYERS)[number]) =>
  `radial-gradient(closest-side, ${stops(layer).map(([at, a]) => `rgba(${layer.rgb},${a}) ${(at * 100).toFixed(1)}%`).join(", ")})`;

/** The mist is painted at this size and stretched over the hero: it is all soft gradient, so more pixels would add nothing. */
const MIST_W = 640;
const MIST_H = 360;

/**
 * Home hero background: black with the design's blue glows drifting like mist (GSAP). Every motion is a
 * `sine.inOut` yoyo loop, so it eases smoothly at each turn and there is never a reset. It sits behind the hero
 * content (-z-10) and is clipped by the hero. With reduced motion the glows stay still in the design's resting
 * composition. The loops are scoped to this component's matchMedia and reverted on unmount (StrictMode-safe: the
 * second mount starts from a clean revert, so there are never duplicate loops).
 *
 * Why a small canvas and not four gradient divs: each glow is up to 1.8× the hero's size, so as separate composited
 * layers they were four screen-sized-and-larger textures (~9 megapixels each on a Retina display), blended over each
 * other and the globe every frame. When the hero scrolled away the browser freed those tiles, and scrolling back had
 * to rasterise and blend all of them again in the same frames as the title returned — the stutter on the way back
 * up. The glows now draw into one 640×360 canvas (a single small texture the browser never has to re-tile), and the
 * glows only repaint when one has moved. The divs below are just the server-rendered first paint: they are hidden
 * the moment the canvas has drawn, so they cost nothing afterwards.
 */
export function HeroAtmosphere() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fallback = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = canvas.current;
    const first = fallback.current;
    const ctx = el?.getContext("2d");
    if (!el || !first || !ctx) return; // no 2D canvas: the server-rendered glows simply stay put

    // One gradient per glow, reused for every frame: unit radius, placed and stretched by the transform at paint time.
    const gradients = LAYERS.map((layer) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      stops(layer).forEach(([at, a]) => g.addColorStop(at, `rgba(${layer.rgb},${a})`));
      return g;
    });
    // Each glow's live state, tweened below: offsets in percent of its own box, scale, opacity.
    const state = LAYERS.map(() => ({ x: 0, y: 0, scale: 1, opacity: 1 }));

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, MIST_W, MIST_H);
      LAYERS.forEach(({ box }, i) => {
        const s = state[i];
        const cx = (box.left + box.width / 2 + (s.x * box.width) / 100) / 100; // centre, as a fraction of the hero
        const cy = (box.top + box.height / 2 + (s.y * box.height) / 100) / 100;
        ctx.setTransform((MIST_W * box.width * s.scale) / 200, 0, 0, (MIST_H * box.height * s.scale) / 200, MIST_W * cx, MIST_H * cy);
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = gradients[i];
        ctx.fillRect(-1, -1, 2, 2);
      });
      // The design's 10% #1E1E1E veil over the glows.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(30,30,30,0.1)";
      ctx.fillRect(0, 0, MIST_W, MIST_H);
    };
    draw();
    first.style.display = "none";

    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        let dirty = false;
        let lastDraw = 0;
        const loops: gsap.core.Tween[] = [];
        LAYERS.forEach(({ drift }, i) => {
          const { x, y, scale, fade, t } = drift;
          const loop = { ease: "sine.inOut", repeat: -1, yoyo: true, onUpdate: () => (dirty = true) } as const;
          // Each loop starts half-way through its first leg, from the design's resting place, so nothing jumps on load.
          loops.push(
            gsap.fromTo(state[i], { x: -x }, { x, duration: t[0], ...loop }).progress(0.5),
            gsap.fromTo(state[i], { y: -y }, { y, duration: t[1], ...loop }).progress(0.5),
            gsap.fromTo(state[i], { scale: 1 }, { scale, duration: t[2], ...loop }),
            gsap.fromTo(state[i], { opacity: 1 }, { opacity: fade, duration: t[3], ...loop }),
          );
        });
        // The glows drift over seconds, so 30 repaints a second is as smooth as 60 and half the work.
        const paint = (time: number) => {
          if (!dirty || time - lastDraw < 1 / 30) return;
          dirty = false;
          lastDraw = time;
          draw();
        };
        gsap.ticker.add(paint);

        // The mist is only seen at the top of the hero: once the globe's dive is past half-way it fills the screen and
        // the glows are all but hidden, so they hold still there — and stay held once the hero has scrolled away —
        // instead of repainting under a WebGL canvas for nothing. Back up the page they resume.
        const runway = root.current?.closest<HTMLElement>("[data-hero-runway]");
        const host = root.current?.closest<HTMLElement>("[data-mist-host]");
        if (runway) {
          let live = true;
          ScrollTrigger.create({
            trigger: runway,
            start: "top top",
            end: diveEnd(runway),
            onUpdate: ({ progress }) => {
              const on = progress < 0.5;
              if (on === live) return;
              live = on;
              loops.forEach((tween) => (on ? tween.resume() : tween.pause()));
            },
          });
        } else if (host) {
          // A hero that is not a runway (About): the mist runs while the host is within a screen of the viewport.
          ScrollTrigger.create({
            trigger: host,
            start: "top bottom",
            end: () => `+=${window.innerHeight * 2}`,
            onToggle: ({ isActive }) => loops.forEach((tween) => (isActive ? tween.resume() : tween.pause())),
          });
        }
        return () => gsap.ticker.remove(paint);
      },
      root,
    );
    return () => {
      mm.revert();
      first.style.display = "";
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      <canvas ref={canvas} width={MIST_W} height={MIST_H} className="absolute inset-0 size-full" />
      {/* Server-rendered first paint, identical to the canvas's resting frame; hidden once the canvas has drawn. */}
      <div ref={fallback} className="absolute inset-0">
        {LAYERS.map((layer, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${layer.box.left}%`, top: `${layer.box.top}%`, width: `${layer.box.width}%`, height: `${layer.box.height}%`, background: cssGradient(layer) }}
          />
        ))}
        <div className="absolute inset-0 bg-[#1e1e1e]/10" />
      </div>
    </div>
  );
}
