import * as THREE from "three";
import gsap from "gsap";

type Options = { container: HTMLElement; reducedMotion: boolean };

const VERT = /* glsl */ `
  uniform vec2 uRes, uMouse, uRippleC;
  uniform float uTime, uEnergy, uReveal, uDpr, uRippleT, uPresence;
  attribute vec2 aGrid;
  attribute float aRand;
  varying vec4 vColor;
  void main() {
    // Idle: every dot floats a pixel or two on its own slow orbit.
    vec2 p = aGrid + 1.6 * vec2(sin(uTime * 0.4 + aRand * 30.0 + aGrid.y * 0.01), cos(uTime * 0.35 + aRand * 20.0 + aGrid.x * 0.01));

    // Cursor: dots near it are pushed away (a soft lens), swell and light up. Faster movement pushes harder.
    vec2 d = p - uMouse;
    float dist = length(d);
    float f = smoothstep(190.0, 0.0, dist) * uPresence;
    p += normalize(d + 1e-4) * f * f * (14.0 + 26.0 * uEnergy);

    // A click sends one ring across the field.
    float rt = uTime - uRippleT;
    float ring = rt > 0.0 ? smoothstep(52.0, 0.0, abs(length(aGrid - uRippleC) - rt * 460.0)) * exp(-rt * 1.5) : 0.0;
    p += normalize(aGrid - uRippleC + 1e-4) * ring * 16.0;

    // Blinking: a steady shimmer on every dot, plus now and then a bright, short blink.
    float ph = aRand * 6.2831;
    float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aRand * 1.6) + ph);
    float blink = pow(max(0.0, sin(uTime * (0.22 + aRand * 0.5) + ph * 3.0)), 28.0);

    // Reveal sweeps in from the left when the section first appears.
    float shown = smoothstep(0.0, 1.0, uReveal * 1.8 - (aGrid.x / uRes.x) * 0.8 - aRand * 0.15);

    float a = (0.3 + 0.24 * tw + 0.75 * blink + 0.6 * f + 0.8 * ring) * shown;
    vec3 blue = mix(vec3(0.0, 0.35, 0.78), vec3(0.45, 0.72, 1.0), clamp(tw * 0.6 + f + blink, 0.0, 1.0));
    vec3 red = vec3(0.95, 0.12, 0.12); // a few brand-red dots
    vec3 col = aRand > 0.972 ? mix(red, vec3(1.0, 0.5, 0.45), blink + f * 0.5) : blue;
    vColor = vec4(col, a);

    vec2 ndc = (p / uRes) * 2.0 - 1.0;
    gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
    gl_PointSize = uDpr * (1.8 + 0.9 * tw) * (1.0 + 1.1 * f + 1.2 * blink + 0.9 * ring);
  }`;

const FRAG = /* glsl */ `
  varying vec4 vColor;
  void main() {
    float s = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
    if (s * vColor.a < 0.01) discard;
    gl_FragColor = vec4(vColor.rgb, s * vColor.a);
  }`;

/**
 * The Growth Engine's background: a field of small blue dots (a few brand red) that shimmer and blink on their own,
 * and answer the cursor — dots near it are pushed away and light up, a fast sweep pushes harder, and a click sends a
 * ring across the field. Three.js points with all motion in the vertex shader; GSAP only eases the cursor (so it
 * glides rather than snaps) and plays the one-time reveal. Renders only while the section is on screen; with reduced
 * motion it draws one still frame. Returns a `destroy`; without WebGL it returns a no-op and the section keeps its
 * static CSS dot grid.
 */
export function createDotField({ container, reducedMotion }: Options): () => void {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "low-power" });
  } catch {
    return () => {};
  }
  container.appendChild(canvas);
  const small = container.clientWidth < 768;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera(); // positions are written to clip space directly
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(-9999, -9999) },
    uRippleC: { value: new THREE.Vector2(0, 0) },
    uTime: { value: 0 },
    uEnergy: { value: 0 },
    uReveal: { value: reducedMotion ? 1 : 0 },
    uDpr: { value: DPR },
    uRippleT: { value: -100 },
    uPresence: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  let points: THREE.Points | null = null;

  // One dot per grid cell, rebuilt whenever the section's size changes.
  const build = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
    const gap = small ? 20 : 18;
    const cols = Math.ceil(w / gap) + 1;
    const rows = Math.ceil(h / gap) + 1;
    const grid = new Float32Array(cols * rows * 2);
    const rnd = new Float32Array(cols * rows);
    let n = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[n * 2] = c * gap + (r % 2 ? gap / 2 : 0); // offset rows: a softer, less rigid lattice
        grid[n * 2 + 1] = r * gap;
        rnd[n] = Math.random();
        n++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
    if (points) {
      scene.remove(points);
      points.geometry.dispose();
    }
    points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);
  };
  build();

  /* ---------- Cursor ---------- */
  // The raw pointer, and an eased copy of it that the shader uses.
  const eased = { x: -9999, y: -9999 };
  const toX = gsap.quickTo(eased, "x", { duration: 0.35, ease: "power3.out" });
  const toY = gsap.quickTo(eased, "y", { duration: 0.35, ease: "power3.out" });
  let lastX = 0;
  let lastY = 0;
  let energy = 0;
  const presence = gsap.quickTo(uniforms.uPresence, "value", { duration: 0.6, ease: "power2.out" });
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
  };
  const onMove = (e: PointerEvent) => {
    const { x, y, inside } = local(e);
    if (!inside) return void presence(0);
    if (uniforms.uPresence.value < 0.01) {
      eased.x = x; // coming in: appear at the pointer instead of sliding in from the last place
      eased.y = y;
    }
    toX(x);
    toY(y);
    presence(1);
    energy = Math.min(1, energy + Math.hypot(x - lastX, y - lastY) / 80);
    lastX = x;
    lastY = y;
  };
  const onLeave = () => presence(0);
  const onDown = (e: PointerEvent) => {
    const { x, y, inside } = local(e);
    if (!inside) return;
    uniforms.uRippleC.value.set(x, y);
    uniforms.uRippleT.value = uniforms.uTime.value;
  };
  if (!reducedMotion) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerleave", onLeave);
  }

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  const draw = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;
    energy *= Math.pow(0.04, dt); // settles to nothing in about a second
    uniforms.uEnergy.value = energy;
    uniforms.uMouse.value.set(eased.x, eased.y);
    renderer.render(scene, camera);
  };
  let revealed = false;
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      clock.getDelta();
      if (!reducedMotion) {
        renderer.setAnimationLoop(draw);
        if (!revealed) {
          revealed = true;
          gsap.to(uniforms.uReveal, { value: 1, duration: 2.2, ease: "power2.out" });
        }
      } else draw();
    } else renderer.setAnimationLoop(null);
  });
  io.observe(container);
  const ro = new ResizeObserver(() => {
    build();
    if (reducedMotion) draw();
  });
  ro.observe(container);

  return () => {
    io.disconnect();
    ro.disconnect();
    renderer.setAnimationLoop(null);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointerleave", onLeave);
    gsap.killTweensOf([eased, uniforms.uPresence, uniforms.uReveal]);
    points?.geometry.dispose();
    material.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
