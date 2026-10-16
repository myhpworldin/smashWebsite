import { diveEnd } from "../hero-runway";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLOBE_GEO } from "./geo-data";

/**
 * The Home dot-matrix globe (Three.js), framework-free: `createGlobe(...)` builds it into a canvas that fills
 * `container` (the hero's viewport-sized sticky stage, which sits inside `runway`, the tall hero section) and
 * returns a `destroy` that removes every listener, tween, trigger and GPU resource.
 *
 *   - Land is a field of dots (a Fibonacci sphere kept where the land mask says so), with sparse ocean dots,
 *     coastlines, country borders and a faint graticule as lines; India is a denser field with a 1:10m outline.
 *   - Land masks are rasterised from the embedded vectors (geo-data.ts) onto an in-memory canvas — no image or
 *     texture is ever fetched, so there is nothing to fail on CORS.
 *   - On start every dot is scattered as dust and a shader mixes it onto the globe; then the outlines fade in.
 *   - One scrubbed timeline from the top of the runway to the end of its pinned stretch rises the globe from the
 *     stage's bottom edge to the centre, turns it to India and dives to Kerala, where a red pin lands. The effect
 *     finishes inside the hero; About is a separate section that slides over the finished stage. Scrolling back
 *     runs the same timeline backwards.
 *   - It only renders while `runway` is on screen. Reduced motion: no dust, no spin, no scroll dive.
 *
 * Performance (the page scrolls through this, so every frame counts):
 *   - The build is async and yields to the browser between stages, so no single task blocks scrolling or input, and
 *     shaders compile off-thread (`compileAsync`) before the first frame instead of stalling it.
 *   - One render per GSAP tick (after the scroll scrubs have updated), not a second rAF loop a frame behind them. While
 *     nothing moves but the slow idle spin it renders at 30fps; while scrolling or assembling, at the display's rate.
 *   - The pixel ratio steps down when frames run slow, and starts lower on low-end phones, which also get fewer dots.
 *   - Once the dust has assembled the vertex shader skips its flight maths; the canvas has no MSAA on dense screens.
 *   - Nothing reads layout per frame: sizes are cached by the ResizeObserver.
 */

const DEG = Math.PI / 180;
const KERALA = { lat: 10.85, lon: 76.27 };

type Ring = [number, number][];
type Box = [number, number, number, number];

const decode = (str: string, scale: number): Ring[] =>
  str.split("|").map((line) => {
    const n = line.split(",");
    const pts: Ring = [];
    let x = 0;
    let y = 0;
    for (let i = 0; i < n.length; i += 2) {
      x += +n[i];
      y += +n[i + 1];
      pts.push([x / scale, y / scale]);
    }
    return pts;
  });

/** lon/lat (degrees) → point on a sphere of radius r. Lon 0 / lat 0 faces +z (the camera); east is +x, north +y. */
function toXYZ(lon: number, lat: number, r: number, out = new THREE.Vector3()) {
  const φ = lat * DEG;
  const λ = lon * DEG;
  return out.set(r * Math.cos(φ) * Math.sin(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.cos(λ));
}

/** Seeded PRNG so the dot field is identical on every load. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fills `rings` (even-odd, so inner rings cut lakes) into a w×h land mask and returns a lon/lat → land lookup.
 * A scanline fill over typed arrays: the 2D canvas `fill("evenodd")` this replaces took ~1s of main thread for the
 * world outline (it is software-rendered once the canvas is read back), and this takes a few milliseconds.
 */
function rasterMask(rings: Ring[], [x0, y0, x1, y1]: Box, w: number, h: number) {
  const mask = new Uint8Array(w * h);
  const sx = w / (x1 - x0);
  const sy = h / (y1 - y0);
  // Every ring edge adds the x where it crosses each pixel row's centre; each row's crossings then pair up into spans.
  const rows: number[][] = Array.from({ length: h }, () => []);
  for (const ring of rings) {
    for (let i = 0, n = ring.length; i < n; i++) {
      const [lonA, latA] = ring[i];
      const [lonB, latB] = ring[(i + 1) % n]; // rings close back onto their first point
      let ax = (lonA - x0) * sx;
      let ay = (y1 - latA) * sy;
      let bx = (lonB - x0) * sx;
      let by = (y1 - latB) * sy;
      if (ay === by) continue; // horizontal edges cross no row centre
      if (ay > by) [ax, ay, bx, by] = [bx, by, ax, ay];
      const slope = (bx - ax) / (by - ay);
      const last = Math.min(h - 1, Math.ceil(by - 0.5) - 1);
      for (let r = Math.max(0, Math.ceil(ay - 0.5)); r <= last; r++) rows[r].push(ax + (r + 0.5 - ay) * slope);
    }
  }
  rows.forEach((xs, r) => {
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
      if (to >= from) mask.fill(1, r * w + from, r * w + to + 1);
    }
  });
  return (lon: number, lat: number) => {
    const x = Math.floor((lon - x0) * sx);
    const y = Math.floor((y1 - lat) * sy);
    return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  };
}

const KIND = { OCEAN: 0, LAND: 1, INDIA: 2, KERALA: 3 } as const;

/**
 * Kerala's state outline (lon, lat), clockwise from its north-west tip: down the Malabar coast to Kanyakumari's border,
 * then back up along the Tamil Nadu and Karnataka boundary (the Western Ghats). Hand-traced and simplified — it only has
 * to read as "this is Kerala" at the close-up, where it is drawn as a red outline over a red-tinted dot field.
 */
const KERALA_RING: Ring = [
  [74.86, 12.8], [74.99, 12.49], [75.37, 11.87], [75.78, 11.25], [75.92, 10.77], [76.24, 9.97], [76.32, 9.49], [76.6, 8.89],
  [76.95, 8.5], [77.1, 8.3], [77.25, 8.55], [77.3, 8.75], [77.25, 9.0], [77.3, 9.3], [77.2, 9.6], [77.25, 9.85], [77.1, 10.2],
  [76.95, 10.3], [76.85, 10.5], [76.85, 10.8], [76.7, 11.1], [76.5, 11.5], [76.45, 11.8], [76.05, 12.0], [75.8, 12.15],
  [75.55, 12.4], [75.3, 12.65], [75.2, 12.8],
];
const KERALA_BOX: Box = [74.7, 8.1, 77.5, 13];

type Options = { container: HTMLElement; runway: HTMLElement; reducedMotion: boolean; signal: AbortSignal };

/** Hands the main thread back so input and paint can run between build stages (scheduler.yield where it exists). */
const yieldToMain = (): Promise<void> => {
  const sched = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return sched?.yield ? sched.yield() : new Promise((resolve) => setTimeout(resolve, 0));
};

/** Phones that are likely to struggle: few cores or little memory (both are hints, either may be missing). */
const isLowEnd = () => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
};

/** Resolves to `destroy`. If `signal` aborts mid-build, everything made so far is released and `destroy` is a no-op. */
export async function createGlobe({ container, runway, reducedMotion, signal }: Options): Promise<() => void> {
  const small = container.clientWidth < 768;
  const lowEnd = small && isLowEnd();
  const rand = mulberry32(20240611);

  /* ---------- Geography ---------- */
  const worldRings = decode(GLOBE_GEO.world, 100);
  const borderLines = decode(GLOBE_GEO.borders, 100);
  const indiaRings = decode(GLOBE_GEO.india, 1000);
  // 0.35° a pixel is finer than the 110k-dot field (~1.9° apart) needs, and a quarter the raster work of 2048×1024.
  const isLand = rasterMask(worldRings, [-180, -90, 180, 90], 1024, 512);
  const indiaBox = indiaRings.flat().reduce<Box>((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [999, 999, -999, -999]);
  const IND_RES = 0.02; // degrees per mask pixel
  const isIndia = rasterMask(indiaRings, indiaBox, Math.ceil((indiaBox[2] - indiaBox[0]) / IND_RES), Math.ceil((indiaBox[3] - indiaBox[1]) / IND_RES));
  const isKerala = rasterMask([KERALA_RING], KERALA_BOX, Math.ceil((KERALA_BOX[2] - KERALA_BOX[0]) / IND_RES), Math.ceil((KERALA_BOX[3] - KERALA_BOX[1]) / IND_RES));

  await yieldToMain();
  if (signal.aborted) return () => {};

  /* ---------- Dot field: world (Fibonacci sphere) + a denser matrix over India ---------- */
  const dots: [number, number, number, number][] = []; // lon, lat, kind, density (relative to the world field)
  {
    const N = lowEnd ? 42000 : small ? 60000 : 110000;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (2 * (i + 0.5)) / N;
      const r = Math.sqrt(1 - y * y);
      const θ = i * golden;
      const lat = Math.asin(y) / DEG;
      const lon = Math.atan2(Math.cos(θ) * r, Math.sin(θ) * r) / DEG;
      if (isIndia(lon, lat)) continue; // India gets its own, denser field below
      if (isLand(lon, lat)) dots.push([lon, lat, KIND.LAND, 1]);
      else if (i % 7 === 0) dots.push([lon, lat, KIND.OCEAN, 1]);
    }
    const step = small ? 0.12 : 0.09; // degrees — fine enough to stay a crisp matrix at the Kerala close-up
    const density = (Math.sqrt((4 * Math.PI) / N) / DEG / step) ** 2;
    for (let lat = indiaBox[1]; lat <= indiaBox[3]; lat += step) {
      const lonStep = step / Math.cos(lat * DEG);
      for (let lon = indiaBox[0]; lon <= indiaBox[2]; lon += lonStep) {
        const jl = lon + (rand() - 0.5) * lonStep * 0.5;
        const jt = lat + (rand() - 0.5) * step * 0.5;
        if (isIndia(jl, jt)) dots.push([jl, jt, isKerala(jl, jt) ? KIND.KERALA : KIND.INDIA, density]);
      }
    }
  }

  await yieldToMain();
  if (signal.aborted) return () => {};

  /* ---------- Renderer / scene ---------- */
  const DPR_MAX = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : small ? 1.5 : 2);
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: DPR_MAX < 1.75, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {}; // no WebGL: the page simply has no globe
  }
  container.appendChild(canvas);
  let DPR = DPR_MAX; // steps down in the loop if frames run slow
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.005, 100);
  const globe = new THREE.Group();
  globe.rotation.order = "XYZ"; // y (longitude) first, then x (latitude) — see the rotation maths in frame()
  scene.add(globe);

  const uniforms = {
    uProgress: { value: reducedMotion ? 1 : 0 }, // dust → globe
    uTime: { value: 0 },
    uSize: { value: 1.7 * DPR },
    uZoom: { value: 0 },
    uAlt: { value: 3 },
    uIntro: { value: reducedMotion ? 1 : 0 }, // outlines / body fade-in after the dust assembles
    uKerala: { value: 0 }, // the Kerala highlight, 0 → 1 as the dive lands on it
    uCenter: { value: new THREE.Vector3() },
  };

  const disposables: { dispose(): void }[] = [];
  /** Releases everything built so far; true (after releasing) once `signal` has aborted, so the build can stop early. */
  const abortedBuild = () => {
    if (!signal.aborted) return false;
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    canvas.remove();
    return true;
  };

  /* Points: every dot starts as dust (aStart) and the shader mixes it onto the globe (position) by uProgress. */
  {
    const n = dots.length;
    const pos = new Float32Array(n * 3);
    const start = new Float32Array(n * 3);
    const delay = new Float32Array(n);
    const kind = new Float32Array(n);
    const rnd = new Float32Array(n);
    const dens = new Float32Array(n);
    const v = new THREE.Vector3();
    dots.forEach(([lon, lat, k, d], i) => {
      toXYZ(lon, lat, 1, v).toArray(pos, i * 3);
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const R = 1.6 + Math.pow(rand(), 0.6) * 5.5;
      start[i * 3] = R * s * Math.cos(a);
      start[i * 3 + 1] = R * u * 0.7;
      start[i * 3 + 2] = R * s * Math.sin(a);
      delay[i] = rand() * 0.35;
      kind[i] = k;
      rnd[i] = rand();
      dens[i] = d;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    geo.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));
    geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute("aDensity", new THREE.BufferAttribute(dens, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 8); // the dust extends well past the globe

    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uProgress, uTime, uSize, uZoom, uAlt, uKerala;
        uniform vec3 uCenter;
        attribute vec3 aStart;
        attribute float aDelay, aKind, aRand, aDensity;
        varying vec4 vColor;
        void main() {
          // Once uProgress reaches 1 every mote has landed (the latest delay + duration is 0.85), so the whole flight
          // below is skipped: the branch is on a uniform, so it is free for the GPU and saves the maths for every dot.
          float t = 1.0;
          float glint = 0.0;
          vec3 p = position;
          if (uProgress < 1.0) {
            // Each mote has its own start and flight time, so the dust gathers in waves instead of all at once.
            float dur = mix(0.35, 0.5, aRand);
            float raw = clamp((uProgress - aDelay) / dur, 0.0, 1.0);
            // Gentle lift-off, long decelerating glide, soft settle.
            t = mix(raw * raw * (3.0 - 2.0 * raw), 1.0 - pow(1.0 - raw, 3.0), 0.6);
            // Dust drifts in a slow swirl that unwinds as it assembles, with a little free-floating wobble.
            float ang = (uTime * 0.06 + aRand * 6.2831) * (1.0 - t) * 0.6;
            vec3 s = aStart;
            s.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * s.xz;
            s += 0.12 * vec3(sin(uTime * 0.7 + aRand * 20.0), cos(uTime * 0.5 + aRand * 31.0), sin(uTime * 0.6 + aRand * 13.0)) * (1.0 - t);
            p = mix(s, position, t);
            // The flight curves: motes spiral in along an arc that is widest mid-way and closes onto the surface.
            vec3 side3 = normalize(cross(s, vec3(0.0, 1.0, 0.1)) + 1e-4);
            p += side3 * sin(3.14159 * t) * (1.0 - t) * length(s - position) * 0.22 * (0.4 + aRand);
            // Landing glint: a brief flash as each mote touches down.
            float g = clamp((uProgress - aDelay - dur) / 0.12, 0.0, 1.0);
            glint = g > 0.0 && g < 1.0 ? sin(3.14159 * g) : 0.0;
          }
          float born = smoothstep(0.0, 1.4, uTime);

          vec4 world = modelMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewMatrix * world;

          // Facing the camera → full strength; far hemisphere → a faint see-through shell.
          float facing = dot(normalize(world.xyz - uCenter), normalize(cameraPosition - world.xyz));
          float side = mix(0.07, 1.0, smoothstep(-0.15, 0.3, facing)) ;
          float shown = mix(0.55 * born, side, t) * (1.0 + 0.9 * glint);
          // India is denser than the world field; dim it by its on-screen density (∝ density × altitude²) so it is a
          // highlighted region from afar, not a solid patch, and full-strength single dots up close.
          float dw = aKind > 1.5 ? min(1.0, 27.0 / (aDensity * uAlt * uAlt)) : 1.0;
          float twinkle = aKind < 0.5 ? 1.0 : 0.8 + 0.2 * sin(uTime * 1.6 + aRand * 40.0);

          // Kerala's dots (aKind 3) turn SMASH red and brighten as the highlight comes in.
          float kerala = aKind > 2.5 ? uKerala : 0.0;
          vec3 dOcean = vec3(0.10, 0.25, 0.55), dLand = vec3(0.40, 0.68, 1.0), dIndia = mix(vec3(0.78, 0.9, 1.0), vec3(1.0, 0.27, 0.32), kerala);
          vColor = vec4(aKind < 0.5 ? dOcean : (aKind < 1.5 ? dLand : dIndia), (aKind < 0.5 ? 0.4 : (aKind < 1.5 ? 0.85 : 0.95)) * twinkle * dw * shown * (1.0 + 0.5 * kerala));

          gl_PointSize = uSize * (aKind < 0.5 ? 0.9 : 1.0) * (1.0 + 0.35 * kerala) * mix(1.0, 1.9, uZoom) * mix(1.5, 1.0, t) * (1.0 + 0.8 * glint);
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vColor;
        void main() {
          float shape = smoothstep(0.5, 0.12, length(gl_PointCoord - 0.5));
          float a = shape * vColor.a;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor.rgb, a);
        }`,
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = 2;
    globe.add(points);
    disposables.push(geo, mat);
  }

  await yieldToMain();
  if (abortedBuild()) return () => {};

  /* Lines: coastlines, borders, India outline and graticule. */
  type Look = { color: string; opacity: number };
  function lineLayer(polylines: Ring[], look: Look, { radius, skip, maxSeg = 1.5, fadeOnZoom = false }: { radius: number; skip?: (x0: number, y0: number, x1: number, y1: number) => boolean; maxSeg?: number; fadeOnZoom?: boolean }) {
    const out: number[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (const pts of polylines) {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        if (Math.abs(x1 - x0) > 180) continue; // never draw across the antimeridian
        if (Math.abs(x0) > 179.99 && Math.abs(x1) > 179.99) continue; // the dataset's own antimeridian cuts
        if (Math.abs(y0) > 89.9 && Math.abs(y1) > 89.9) continue; // Antarctica's closing edge along the pole
        if (skip?.(x0, y0, x1, y1)) continue;
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / maxSeg));
        for (let s = 0; s < steps; s++) {
          const t0 = s / steps;
          const t1 = (s + 1) / steps;
          toXYZ(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0, radius, a);
          toXYZ(x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1, radius, b);
          out.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uCenter: uniforms.uCenter,
        uIntro: uniforms.uIntro,
        uZoom: uniforms.uZoom,
        uZoomFade: { value: fadeOnZoom ? 1 : 0 },
        uColor: { value: new THREE.Vector4(...new THREE.Color(look.color).toArray(), look.opacity) },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform vec3 uCenter;
        varying float vFacing;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vFacing = dot(normalize(world.xyz - uCenter), normalize(cameraPosition - world.xyz));
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uIntro, uZoom, uZoomFade;
        uniform vec4 uColor;
        varying float vFacing;
        void main() {
          float zoomFade = 1.0 - uZoomFade * smoothstep(0.4, 0.85, uZoom);
          gl_FragColor = vec4(uColor.rgb, uColor.a * uIntro * zoomFade * mix(0.05, 1.0, smoothstep(-0.1, 0.3, vFacing)));
        }`,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 3;
    globe.add(lines);
    disposables.push(geo, mat);
    return mat;
  }
  const nearIndia = (x: number, y: number) => isIndia(x + 0.08, y) || isIndia(x - 0.08, y) || isIndia(x, y + 0.08) || isIndia(x, y - 0.08);

  const grat: Ring[] = [];
  for (let lat = -75; lat <= 75; lat += 15) grat.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat] as [number, number]));
  for (let lon = -180; lon < 180; lon += 15) grat.push(Array.from({ length: 35 }, (_, i) => [lon, -85 + i * 5] as [number, number]));
  lineLayer(grat, { color: "#2a5cb0", opacity: 0.28 }, { radius: 1.0, maxSeg: 5, fadeOnZoom: true });
  lineLayer(worldRings, { color: "#5aa4ff", opacity: 0.7 }, { radius: 1.002 });
  lineLayer(borderLines, { color: "#3f7bd4", opacity: 0.45 }, { radius: 1.002, skip: (x0, y0, x1, y1) => nearIndia(x0, y0) && nearIndia(x1, y1) });
  lineLayer(indiaRings, { color: "#cfe9ff", opacity: 1 }, { radius: 1.003 });
  // Kerala's outline: invisible until the highlight comes in (frame() drives its opacity), then SMASH red over the India outline.
  const keralaLine = lineLayer([[...KERALA_RING, KERALA_RING[0]]], { color: "#ff4552", opacity: 0 }, { radius: 1.004, maxSeg: 0.1 });

  /* Body: a dark disc that keeps the far side of the dot field from reading through the near side. No glow ring. */
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { uIntro: uniforms.uIntro },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uIntro;
      void main() {
        gl_FragColor = vec4(0.008, 0.047, 0.133, 0.78 * uIntro);
      }`,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.995, 96, 64), bodyMat);
  body.renderOrder = 1;
  globe.add(body);
  disposables.push(body.geometry, bodyMat);

  /* Kerala pin: core, halo, pulsing radar rings and a short beam along the surface normal (brand red). */
  const pin = new THREE.Group();
  const pinRings: THREE.Mesh[] = [];
  const pinMats: THREE.MeshBasicMaterial[] = [];
  {
    const normal = toXYZ(KERALA.lon, KERALA.lat, 1).normalize();
    pin.position.copy(normal).multiplyScalar(1.004);
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    const red = () => {
      const m = new THREE.MeshBasicMaterial({ color: 0xe8202d, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      pinMats.push(m);
      return m;
    };
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.0016, 32), red());
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.0042, 48), red());
    for (let i = 0; i < 3; i++) pinRings.push(new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), red()));
    pin.add(halo, core, ...pinRings);
    pin.children.forEach((m) => {
      m.renderOrder = 5;
      disposables.push((m as THREE.Mesh).geometry);
    });
    disposables.push(...pinMats);
    pin.userData = { core, halo };
    pin.visible = false;
    globe.add(pin);
  }

  // Compile every shader off the main thread (KHR_parallel_shader_compile) so the first frame does not stall on it, and
  // let the browser paint in between.
  await yieldToMain();
  if (abortedBuild()) return () => {};
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    // The first render compiles them instead — slower, never wrong.
  }
  if (abortedBuild()) return () => {};

  /* ---------- Motion ---------- */
  const tweens: gsap.core.Animation[] = [];
  if (!reducedMotion) {
    tweens.push(gsap.to(uniforms.uProgress, { value: 1, duration: 5, ease: "none", delay: 0.2 }));
    tweens.push(gsap.to(uniforms.uIntro, { value: 1, duration: 2, ease: "power2.out", delay: 3.6 }));
  }

  // Scroll: one scrubbed timeline across the runway's pinned stretch (the stage is stuck for runway height − viewport
  // height of scrolling): the globe rises, turns to India and dives to Kerala, the pin lands, and a short hold keeps
  // Kerala on screen until the stage lets go and About slides over it. Scrolling back reverses it exactly.
  const view = { rot: 0, zoom: 0, center: 0, pin: 0, kerala: 0 };
  if (!reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    tweens.push(
      gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: runway, start: "top top", end: diveEnd(runway), invalidateOnRefresh: true, scrub: 0.25 } })
        .to(view, { center: 1, duration: 0.6, ease: "power1.inOut" }, 0)
        .to(view, { rot: 1, duration: 0.55, ease: "power2.inOut" }, 0)
        .to(view, { zoom: 1, duration: 0.9, ease: "power2.inOut" }, 0.1)
        .to(view, { kerala: 1, duration: 0.2, ease: "power1.out" }, 0.8)
        .to(view, { pin: 1, duration: 0.15, ease: "power1.out" }, 0.85)
        .to({}, { duration: 0.2 }, 1),
    );
  }

  const HERO_TILT = 0.38;
  const SPIN = reducedMotion ? 0 : 0.045; // rad/s
  let idleY = -20 * DEG; // Africa / Europe → Asia in view
  let lockedTurn: number | null = null;
  const FOV = 40 * DEG;
  const CLOSE_ALT = 0.2; // camera height above the surface at the Kerala close-up
  let pinT = 0;
  const size = { w: container.clientWidth || 1, h: container.clientHeight || 1 };
  let dirty = true;

  function frame(dt: number) {
    // Idle spin, blended onto Kerala as `view.rot` → 1. The target turn is fixed once when the blend starts:
    // recomputing it each frame would jump a whole turn whenever the spin crossed the antipode mid-blend.
    if (view.rot <= 0) lockedTurn = null;
    idleY += dt * SPIN * (1 - view.rot);
    const targetY = -KERALA.lon * DEG;
    if (view.rot > 0 && lockedTurn === null) lockedTurn = Math.round((idleY - targetY) / (Math.PI * 2));
    const ty = targetY + Math.PI * 2 * (lockedTurn ?? 0);
    globe.rotation.y = idleY + (ty - idleY) * view.rot;
    globe.rotation.x = HERO_TILT + (KERALA.lat * DEG - HERO_TILT) * view.rot;

    // Hero size: the half-globe is sized to the screen, not a fixed distance — its diameter is half the screen width
    // (capped at 75% of the stage's height). The camera distance giving that silhouette radius R (in px) is exact for
    // a sphere: R = (vh / 2) / (√(d² − 1) · tan(fov / 2)).
    const { w: vw, h: vh } = size;
    const radiusPx = Math.min((vw < 768 ? 0.45 : 0.28) * vw, 0.75 * vh);
    const heroDist = Math.sqrt(1 + (vh / (2 * radiusPx * Math.tan(FOV / 2))) ** 2);
    // Camera altitude interpolated in log space, so the dive feels like a steady hyper-zoom.
    const heroAlt = heroDist - 1;
    const alt = Math.exp(Math.log(heroAlt) + (Math.log(CLOSE_ALT) - Math.log(heroAlt)) * view.zoom);
    // At load the globe is centred on the stage's bottom edge — only its top half is in view. While the hero scrolls
    // it rises to the screen centre, and it is centred before the dive gets close, so Kerala lands dead centre.
    const worldPerPx = (2 * heroDist * Math.tan(FOV / 2)) / vh;
    globe.position.y = -(vh / 2) * worldPerPx * (1 - view.center);
    globe.position.x = 0;
    camera.position.set(0, 0, 1 + alt);
    camera.lookAt(0, 0, 0);
    uniforms.uCenter.value.copy(globe.position);
    uniforms.uAlt.value = alt;
    uniforms.uZoom.value = view.zoom;

    // Kerala highlight: its dots and outline come in together as the dive lands on it.
    uniforms.uKerala.value = view.kerala;
    keralaLine.uniforms.uColor.value.w = view.kerala;

    // Pin: grows in with `view.pin`, then its radar rings keep pulsing outward.
    pin.visible = view.pin > 0.001;
    if (pin.visible) {
      pinT += dt;
      const k = view.pin;
      const { core, halo } = pin.userData as { core: THREE.Mesh; halo: THREE.Mesh };
      (core.material as THREE.MeshBasicMaterial).opacity = k;
      (halo.material as THREE.MeshBasicMaterial).opacity = 0.22 * k;
      pinRings.forEach((ring, i) => {
        const phase = (pinT * 0.55 + i / pinRings.length) % 1;
        ring.scale.setScalar(0.0025 + (0.002 + 0.008 * k) * phase);
        (ring.material as THREE.MeshBasicMaterial).opacity = k * (1 - phase) * 0.7;
      });
    }
  }

  /* ---------- Size, visibility, loop ---------- */
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    size.w = w;
    size.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // One render per GSAP tick, after the scroll scrubs have moved `view` this frame. Full rate while scrolling or while
  // the dust is still assembling; 30fps for the idle spin (it turns 0.045 rad/s — nobody can see the other half);
  // reduced motion renders only when something changed.
  const IDLE_MS = 30;
  let visible = false;
  let lastRender = 0;
  let lastScroll = -1e9;
  const onScroll = () => {
    lastScroll = performance.now();
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  // Adaptive resolution: if full-rate frames average slower than ~38fps, step the pixel ratio down (never back up, so
  // it cannot oscillate). The first frames after the build are ignored — they carry upload and warm-up costs.
  let avgMs = 16.7;
  let sampled = 0;
  const adapt = (ms: number) => {
    if (document.hidden || ms > 250) return; // a tab switch or a stall is not a sign the GPU is too slow
    if (++sampled < 20) return;
    avgMs += (ms - avgMs) * 0.1;
    if (sampled < 60 || avgMs < 26 || DPR <= 1) return;
    DPR = Math.max(1, DPR - 0.25);
    renderer.setPixelRatio(DPR);
    uniforms.uSize.value = 1.7 * DPR;
    sampled = 0;
    avgMs = 16.7;
  };

  const tick = () => {
    if (!visible) return;
    const now = performance.now();
    const since = now - lastRender;
    const busy = now - lastScroll < 400 || uniforms.uProgress.value < 1 || uniforms.uIntro.value < 1;
    if (reducedMotion ? !dirty : !busy && !dirty && since < IDLE_MS) return;
    lastRender = now;
    dirty = false;
    if (busy && !reducedMotion) adapt(since);
    const dt = Math.min(since / 1000, 0.05);
    uniforms.uTime.value += dt;
    frame(dt);
    renderer.render(scene, camera);
  };
  gsap.ticker.add(tick);

  // Render only while the hero is on screen.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    lastRender = performance.now(); // don't count the off-screen time as one huge frame
    dirty = true;
  });
  io.observe(runway);

  return () => {
    io.disconnect();
    ro.disconnect();
    gsap.ticker.remove(tick);
    window.removeEventListener("scroll", onScroll);
    tweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    canvas.remove();
  };
}
