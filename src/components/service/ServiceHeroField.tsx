"use client";

import { useEffect, useRef } from "react";

/**
 * The service pages' hero backdrop: a receding field of points rolling in slow waves, like a data landscape, in the
 * brand's blue with the crests picking up red. The pointer raises a soft swell under it and scrolling lifts the camera,
 * so the field reads as live without competing with the heading.
 *
 * Three.js is imported on demand (the rest of the site's bundle never carries it for this page), the loop only runs
 * while the hero is on screen and the tab is visible, and nothing is built at all with reduced motion or without
 * WebGL — the hero then keeps its drifting glows alone. Fewer points and a lower pixel ratio on small screens.
 */
export function ServiceHeroField() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let dispose = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed) return;
      const small = window.innerWidth < 768;
      const cols = small ? 60 : 120;
      const rows = small ? 30 : 56;
      const WIDTH = 26;
      const DEPTH = 15;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
      } catch {
        return; // no WebGL: the glows carry the hero
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x000000, 9, 24);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);

      const count = cols * rows;
      const base = new Float32Array(count * 2); // x, z of every point
      const position = new Float32Array(count * 3);
      const color = new Float32Array(count * 3);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          base[i * 2] = (c / (cols - 1) - 0.5) * WIDTH;
          base[i * 2 + 1] = -(r / (rows - 1)) * DEPTH;
        }
      }
      const geometry = new THREE.BufferGeometry();
      const positionAttr = new THREE.BufferAttribute(position, 3);
      const colorAttr = new THREE.BufferAttribute(color, 3);
      geometry.setAttribute("position", positionAttr);
      geometry.setAttribute("color", colorAttr);
      const material = new THREE.PointsMaterial({
        size: small ? 0.06 : 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);

      const deep = new THREE.Color("#0b3f9e");
      const bright = new THREE.Color("#4d8dff");
      const red = new THREE.Color("#ff3b30");
      const tint = new THREE.Color();

      const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      const onPointer = (e: PointerEvent) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      const resize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(el);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
      io.observe(el);

      let raf = 0;
      let first = true;
      const clock = new THREE.Clock();
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) {
          clock.getDelta(); // do not let the wave jump when it comes back
          return;
        }
        const t = clock.getElapsedTime();
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        // The pointer's swell is centred where the pointer is, mapped onto the field's plane.
        const sx = pointer.x * (WIDTH / 2) * 0.8;
        const sz = -(0.35 + (pointer.y + 1) * 0.28) * DEPTH * 0.55;

        for (let i = 0; i < count; i++) {
          const x = base[i * 2];
          const z = base[i * 2 + 1];
          const dx = x - sx;
          const dz = z - sz;
          const swell = 0.9 * Math.exp(-(dx * dx + dz * dz) / 5);
          const y = 0.62 * Math.sin(x * 0.42 + t * 0.7) * Math.cos(z * 0.36 - t * 0.5) + 0.22 * Math.sin(x * 1.05 + z * 0.8 + t * 1.2) + swell;
          position[i * 3] = x;
          position[i * 3 + 1] = y;
          position[i * 3 + 2] = z;
          const k = Math.min(1, Math.max(0, (y + 0.9) / 1.9));
          tint.copy(deep).lerp(bright, k);
          if (k > 0.82) tint.lerp(red, (k - 0.82) / 0.18);
          color[i * 3] = tint.r;
          color[i * 3 + 1] = tint.g;
          color[i * 3 + 2] = tint.b;
        }
        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;

        const lift = Math.min(window.scrollY, window.innerHeight) / window.innerHeight;
        camera.position.set(pointer.x * 0.9, 3.4 + lift * 2.2 - pointer.y * 0.35, 9.4);
        camera.lookAt(0, 1.9 - lift * 0.6, -3.4);
        renderer.render(scene, camera);
        if (first) {
          first = false;
          el.style.opacity = "1";
        }
      };
      frame();

      dispose = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointer);
        observer.disconnect();
        io.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (disposed) dispose();
    })();

    return () => {
      disposed = true;
      dispose();
    };
  }, []);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-1000 [mask-image:linear-gradient(to_bottom,transparent_30%,black_62%,black_86%,transparent_100%)]"
    />
  );
}
