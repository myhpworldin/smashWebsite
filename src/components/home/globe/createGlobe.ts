import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GLOBE_GEO } from "./geo-data";

/**
 * The Home dot-matrix globe (Three.js), framework-free: `createGlobe(...)` builds it into a canvas that fills
 * `container` (a viewport-sized sticky stage inside `layer`, which spans Hero + About) and returns a `destroy` that
 * removes every listener, tween, trigger and GPU resource.
 *
 *   - Land is a field of dots (a Fibonacci sphere kept where the land mask says so), with sparse ocean dots,
 *     coastlines, country borders and a faint graticule as lines; India is a denser field with a 1:10m outline.
 *   - Land masks are rasterised from the embedded vectors (geo-data.ts) onto an in-memory canvas — no image or
 *     texture is ever fetched, so there is nothing to fail on CORS.
 *   - On start every dot is scattered as dust and a shader mixes it onto the globe; then the outlines fade in.
 *   - One scrubbed timeline from the top of the hero to the top of About turns the globe to India and dives to
 *     Kerala, where a red pin lands. Scrolling back runs the same timeline backwards.
 *   - It starts straddling the hero's bottom edge — half in the hero, half in About — and rises as the hero scrolls.
 *   - Two looks, split per pixel at the hero's bottom edge (`uSeam`): over the dark hero it glows light-on-navy;
 *     over white About it is a light navy watermark, so About's black text stays readable. As the hero scrolls up
 *     the edge sweeps across the globe and it passes from one section into the other.
 *   - It only renders while `layer` is on screen. Reduced motion: no dust, no spin, no scroll dive.
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

/** Fills `rings` (even-odd, so inner rings cut lakes) on an offscreen canvas and returns a lon/lat → land lookup. */
function rasterMask(rings: Ring[], [x0, y0, x1, y1]: Box, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return () => false;
  g.fillStyle = "#fff";
  g.beginPath();
  for (const ring of rings) {
    ring.forEach(([lon, lat], i) => {
      const x = ((lon - x0) / (x1 - x0)) * w;
      const y = ((y1 - lat) / (y1 - y0)) * h;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.closePath();
  }
  g.fill("evenodd");
  const px = g.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4] > 127 ? 1 : 0;
  return (lon: number, lat: number) => {
    const x = Math.floor(((lon - x0) / (x1 - x0)) * w);
    const y = Math.floor(((y1 - lat) / (y1 - y0)) * h);
    return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  };
}

/** GLSL shared by every layer: which look a fragment gets — 1 below the seam (over About), 0 above (over the hero). */
const LOOK = /* glsl */ `
  uniform float uSeam;
  float lightLook() { return gl_FragCoord.y < uSeam ? 1.0 : 0.0; }
`;

const KIND = { OCEAN: 0, LAND: 1, INDIA: 2 } as const;

type Options = { container: HTMLElement; layer: HTMLElement; hero: HTMLElement; reducedMotion: boolean };

export function createGlobe({ container, layer, hero, reducedMotion }: Options): () => void {
  const small = container.clientWidth < 768;
  const rand = mulberry32(20240611);

  /* ---------- Geography ---------- */
  const worldRings = decode(GLOBE_GEO.world, 100);
  const borderLines = decode(GLOBE_GEO.borders, 100);
  const indiaRings = decode(GLOBE_GEO.india, 1000);
  const isLand = rasterMask(worldRings, [-180, -90, 180, 90], 2048, 1024);
  const indiaBox = indiaRings.flat().reduce<Box>((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [999, 999, -999, -999]);
  const IND_RES = 0.02; // degrees per mask pixel
  const isIndia = rasterMask(indiaRings, indiaBox, Math.ceil((indiaBox[2] - indiaBox[0]) / IND_RES), Math.ceil((indiaBox[3] - indiaBox[1]) / IND_RES));

  /* ---------- Dot field: world (Fibonacci sphere) + a denser matrix over India ---------- */
  const dots: [number, number, number, number][] = []; // lon, lat, kind, density (relative to the world field)
  {
    const N = small ? 60000 : 110000;
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
        if (isIndia(jl, jt)) dots.push([jl, jt, KIND.INDIA, density]);
      }
    }
  }

  /* ---------- Renderer / scene ---------- */
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {}; // no WebGL: the page simply has no globe
  }
  container.appendChild(canvas);
  const DPR = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
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
    uIntro: { value: reducedMotion ? 1 : 0 }, // outlines / body / atmosphere fade-in after the dust assembles
    uLightK: { value: 1 }, // strength of the About (light) look
    uSeam: { value: 0 },
    uCenter: { value: new THREE.Vector3() },
  };

  const disposables: { dispose(): void }[] = [];

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
      delay[i] = rand() * 0.4;
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
        uniform float uProgress, uTime, uSize, uZoom, uAlt;
        uniform vec3 uCenter;
        attribute vec3 aStart;
        attribute float aDelay, aKind, aRand, aDensity;
        varying vec4 vDark;
        varying vec4 vLight;
        void main() {
          float t = clamp((uProgress - aDelay) / 0.6, 0.0, 1.0);
          t = t * t * (3.0 - 2.0 * t);
          // Dust drifts in a slow swirl that unwinds as it assembles.
          float ang = (uTime * 0.06 + aRand * 6.2831) * (1.0 - t) * 0.6;
          vec3 s = aStart;
          s.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * s.xz;
          vec3 p = mix(s, position, t);

          vec4 world = modelMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewMatrix * world;

          // Facing the camera → full strength; far hemisphere → a faint see-through shell.
          float facing = dot(normalize(world.xyz - uCenter), normalize(cameraPosition - world.xyz));
          float side = mix(0.07, 1.0, smoothstep(-0.15, 0.3, facing)) ;
          float shown = mix(0.55, side, t);
          // India is denser than the world field; dim it by its on-screen density (∝ density × altitude²) so it is a
          // highlighted region from afar, not a solid patch, and full-strength single dots up close.
          float dw = aKind > 1.5 ? min(1.0, 27.0 / (aDensity * uAlt * uAlt)) : 1.0;
          float twinkle = aKind < 0.5 ? 1.0 : 0.8 + 0.2 * sin(uTime * 1.6 + aRand * 40.0);

          vec3 dOcean = vec3(0.10, 0.25, 0.55), dLand = vec3(0.40, 0.68, 1.0), dIndia = vec3(0.78, 0.9, 1.0);
          vec3 lOcean = vec3(0.62, 0.70, 0.84), lLand = vec3(0.20, 0.38, 0.72), lIndia = vec3(0.04, 0.22, 0.60);
          vDark = vec4(aKind < 0.5 ? dOcean : (aKind < 1.5 ? dLand : dIndia), (aKind < 0.5 ? 0.4 : (aKind < 1.5 ? 0.85 : 0.95)) * twinkle * dw * shown);
          vLight = vec4(aKind < 0.5 ? lOcean : (aKind < 1.5 ? lLand : lIndia), (aKind < 0.5 ? 0.18 : (aKind < 1.5 ? 0.32 : 0.34)) * dw * shown);

          gl_PointSize = uSize * (aKind < 0.5 ? 0.9 : 1.0) * mix(1.0, 1.9, uZoom) * mix(1.5, 1.0, t);
        }`,
      fragmentShader: /* glsl */ `
        ${LOOK}
        uniform float uLightK;
        varying vec4 vDark;
        varying vec4 vLight;
        void main() {
          float shape = smoothstep(0.5, 0.12, length(gl_PointCoord - 0.5));
          float l = lightLook();
          vec4 c = mix(vDark, vec4(vLight.rgb, vLight.a * uLightK), l);
          float a = shape * c.a;
          if (a < 0.01) discard;
          gl_FragColor = vec4(c.rgb, a);
        }`,
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = 2;
    globe.add(points);
    disposables.push(geo, mat);
  }

  /* Lines: coastlines, borders, India outline and graticule, each with a dark-look and a light-look colour. */
  type Look = { color: string; opacity: number };
  function lineLayer(polylines: Ring[], dark: Look, light: Look, { radius, skip, maxSeg = 1.5, fadeOnZoom = false }: { radius: number; skip?: (x0: number, y0: number, x1: number, y1: number) => boolean; maxSeg?: number; fadeOnZoom?: boolean }) {
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
        uLightK: uniforms.uLightK,
        uSeam: uniforms.uSeam,
        uZoom: uniforms.uZoom,
        uZoomFade: { value: fadeOnZoom ? 1 : 0 },
        uDark: { value: new THREE.Vector4(...new THREE.Color(dark.color).toArray(), dark.opacity) },
        uLight: { value: new THREE.Vector4(...new THREE.Color(light.color).toArray(), light.opacity) },
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
        ${LOOK}
        uniform float uIntro, uLightK, uZoom, uZoomFade;
        uniform vec4 uDark, uLight;
        varying float vFacing;
        void main() {
          float l = lightLook();
          vec4 c = mix(uDark, vec4(uLight.rgb, uLight.a * uLightK), l);
          float zoomFade = 1.0 - uZoomFade * smoothstep(0.4, 0.85, uZoom);
          gl_FragColor = vec4(c.rgb, c.a * uIntro * zoomFade * mix(0.05, 1.0, smoothstep(-0.1, 0.3, vFacing)));
        }`,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 3;
    globe.add(lines);
    disposables.push(geo, mat);
  }
  const nearIndia = (x: number, y: number) => isIndia(x + 0.08, y) || isIndia(x - 0.08, y) || isIndia(x, y + 0.08) || isIndia(x, y - 0.08);

  const grat: Ring[] = [];
  for (let lat = -75; lat <= 75; lat += 15) grat.push(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat] as [number, number]));
  for (let lon = -180; lon < 180; lon += 15) grat.push(Array.from({ length: 35 }, (_, i) => [lon, -85 + i * 5] as [number, number]));
  lineLayer(grat, { color: "#2a5cb0", opacity: 0.28 }, { color: "#9fb3d6", opacity: 0.35 }, { radius: 1.0, maxSeg: 5, fadeOnZoom: true });
  lineLayer(worldRings, { color: "#5aa4ff", opacity: 0.7 }, { color: "#3f6cc0", opacity: 0.4 }, { radius: 1.002 });
  lineLayer(borderLines, { color: "#3f7bd4", opacity: 0.45 }, { color: "#8aa3cf", opacity: 0.4 }, { radius: 1.002, skip: (x0, y0, x1, y1) => nearIndia(x0, y0) && nearIndia(x1, y1) });
  lineLayer(indiaRings, { color: "#cfe9ff", opacity: 1 }, { color: "#1d4fa8", opacity: 0.5 }, { radius: 1.003 });

  /* Body (dark look only — over About the globe stays an open watermark) and the atmosphere rim. */
  const sphereLook = (dark: string, light: string) =>
    new THREE.ShaderMaterial({
      uniforms: { uIntro: uniforms.uIntro, uLightK: uniforms.uLightK, uSeam: uniforms.uSeam },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */ `
        ${LOOK}
        uniform float uIntro, uLightK;
        varying vec3 vN; varying vec3 vV;
        void main() {
          float l = lightLook();
          vec4 dark = ${dark};
          vec4 light = ${light};
          vec4 c = mix(dark, vec4(light.rgb, light.a * uLightK), l);
          gl_FragColor = vec4(c.rgb, c.a * uIntro);
        }`,
    });
  const bodyMat = sphereLook("vec4(0.008, 0.047, 0.133, 0.78)", "vec4(1.0, 1.0, 1.0, 0.0)");
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.995, 96, 64), bodyMat);
  body.renderOrder = 1;
  globe.add(body);
  // Rim glow: a back-faced shell whose edge brightens; dark look glows blue, light look is a soft blue haze.
  const rim = "pow(clamp(1.0 + dot(vN, vV), 0.0, 1.0), 3.0)";
  const atmoMat = sphereLook(`vec4(0.25, 0.55, 1.0, ${rim} * 0.6)`, `vec4(0.35, 0.55, 0.95, ${rim} * 0.25)`);
  atmoMat.side = THREE.BackSide;
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.14, 96, 64), atmoMat);
  atmo.renderOrder = 0;
  scene.add(atmo); // in the scene, not the globe, so its rim stays round; it follows globe.position
  disposables.push(body.geometry, bodyMat, atmo.geometry, atmoMat);

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

  /* ---------- Motion ---------- */
  const tweens: gsap.core.Animation[] = [];
  if (!reducedMotion) {
    tweens.push(gsap.to(uniforms.uProgress, { value: 1, duration: 3.4, ease: "power2.inOut", delay: 0.15 }));
    tweens.push(gsap.to(uniforms.uIntro, { value: 1, duration: 1.6, ease: "power2.out", delay: 2.3 }));
  }

  // Scroll: one scrubbed timeline from the top of the hero until the hero has fully scrolled away (or, if About is
  // short, until the stage un-sticks at About's end), so the dive lands on Kerala as About fills the screen and is
  // still pinned. Scrolling back reverses it exactly.
  const view = { rot: 0, zoom: 0, center: 0, pin: 0 };
  if (!reducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    tweens.push(
      gsap
        .timeline({ defaults: { ease: "none" }, scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: () => {
              const heroTop = hero.getBoundingClientRect().top + window.scrollY;
              const unstick = layer.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
              return Math.min(heroTop + hero.offsetHeight, unstick);
            },
            invalidateOnRefresh: true,
            scrub: 1.2,
          },
        })
        .to(view, { center: 1, duration: 0.6, ease: "power1.inOut" }, 0)
        .to(view, { rot: 1, duration: 0.55, ease: "power2.inOut" }, 0)
        .to(view, { zoom: 1, duration: 0.9, ease: "power2.inOut" }, 0.1)
        .to(view, { pin: 1, duration: 0.15, ease: "power1.out" }, 0.85),
    );
  }

  const HERO_TILT = 0.38;
  const SPIN = reducedMotion ? 0 : 0.045; // rad/s
  let idleY = -20 * DEG; // Africa / Europe → Asia in view
  let lockedTurn: number | null = null;
  const FOV = 40 * DEG;
  const CLOSE_ALT = 0.2; // camera height above the surface at the Kerala close-up
  let heroH = hero.offsetHeight;
  let pinT = 0;

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
    // (capped at 75% of the hero's height). The camera distance giving that silhouette radius R (in px) is exact for
    // a sphere: R = (vh / 2) / (√(d² − 1) · tan(fov / 2)).
    const vh = container.clientHeight || 1;
    const vw = container.clientWidth || 1;
    const radiusPx = Math.min(0.25 * vw, 0.75 * heroH);
    const heroDist = Math.sqrt(1 + (vh / (2 * radiusPx * Math.tan(FOV / 2))) ** 2);
    // Camera altitude interpolated in log space, so the dive feels like a steady hyper-zoom.
    const heroAlt = heroDist - 1;
    const alt = Math.exp(Math.log(heroAlt) + (Math.log(CLOSE_ALT) - Math.log(heroAlt)) * view.zoom);
    // At load the globe is centred on the hero's bottom edge — its top half in the hero, its bottom half in About.
    // While the hero scrolls away the globe rises to the screen centre more slowly than the page (the parallax), so
    // the hero/About edge sweeps up across it; it is centred before the dive gets close, so Kerala lands dead centre.
    const worldPerPx = (2 * heroDist * Math.tan(FOV / 2)) / vh;
    const heroOffset = (vh / 2 - heroH) * worldPerPx;
    globe.position.y = heroOffset * (1 - view.center);
    // Portrait screens stack About's stats down the middle, so Kerala lands right of centre (72% across) instead,
    // in the open space beside them. The shift is a fraction of the visible half-width at the current altitude.
    const landX = camera.aspect < 1 ? 0.72 : 0.5;
    globe.position.x = (landX - 0.5) * 2 * alt * Math.tan(FOV / 2) * camera.aspect * view.zoom * view.zoom;
    camera.position.set(0, 0, 1 + alt);
    camera.lookAt(0, 0, 0);
    atmo.position.copy(globe.position);
    uniforms.uCenter.value.copy(globe.position);
    uniforms.uAlt.value = alt;
    uniforms.uZoom.value = view.zoom;

    // The seam: the hero's bottom edge, in drawing-buffer pixels from the canvas bottom (gl_FragCoord's origin).
    const stageTop = container.getBoundingClientRect().top;
    const heroBottom = hero.getBoundingClientRect().bottom - stageTop;
    uniforms.uSeam.value = Math.max(0, (vh - heroBottom) * DPR);

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
    heroH = hero.offsetHeight;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  ro.observe(hero);

  const clock = new THREE.Clock();
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    frame(dt);
    renderer.render(scene, camera);
  };
  // Render only while Hero/About are on screen (the browser already pauses rAF in background tabs).
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      clock.getDelta(); // don't count the off-screen time as one huge frame
      renderer.setAnimationLoop(loop);
    } else renderer.setAnimationLoop(null);
  });
  io.observe(layer);

  return () => {
    io.disconnect();
    ro.disconnect();
    renderer.setAnimationLoop(null);
    tweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    canvas.remove();
  };
}
