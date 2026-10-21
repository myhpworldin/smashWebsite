"use client";

import { useEffect, useRef } from "react";

/** The clip plays while at least this share of it is actually visible. */
const VISIBLE_SHARE = 0.3;

/**
 * The showcase clip. One rule drives everything: the video should be playing exactly when at least 30% of it can
 * actually be seen — on screen and not covered by the About band above or the Services band below, which both slide over
 * the pinned clip, so plain viewport intersection would keep it "visible" under them — the tab is visible and the
 * visitor has not asked for reduced motion. `sync()` makes the
 * element match that rule, and runs after every event that could break it — an observer firing, the tab being
 * shown or hidden, the browser pausing the clip by itself (Safari and power saving do), the clip becoming
 * playable, a page restored from the back/forward cache — so no sequence of scrolling can leave it stuck.
 * `pause()` keeps `currentTime`, so scrolling back resumes from the same frame; `loop` restarts it at the end.
 * The file starts downloading ~300px before the band, and not at all until the visitor scrolls near it.
 */
export function ShowcaseVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let blockedUntilGesture = false;
    let reloaded = false;

    const load = () => {
      if (!video.getAttribute("src")) video.src = src;
    };
    // The share of the clip left uncovered: its rect clipped to the viewport, the bottom edge of the band above and the top edge of the band below.
    const uncovered = () => {
      const box = video.getBoundingClientRect();
      if (!box.height) return 0;
      const above = document.querySelector('[data-home-section="about"]')?.getBoundingClientRect().bottom ?? 0;
      const below = document.querySelector('[data-home-section="services"]')?.getBoundingClientRect().top ?? window.innerHeight;
      const top = Math.max(box.top, above, 0);
      const bottom = Math.min(box.bottom, below, window.innerHeight);
      return Math.max(bottom - top, 0) / box.height;
    };
    // Measured fresh each time, not remembered from the last scroll: layout can move under a still page (fonts, images, resize).
    const shouldPlay = () => !document.hidden && !motion.matches && uncovered() >= VISIBLE_SHARE;

    const sync = () => {
      if (!shouldPlay()) {
        if (!video.paused) video.pause();
        return;
      }
      load();
      if (!video.paused) return;
      video.play().then(
        () => {
          // Scrolled away while play() was still pending: honour the latest state, not the one it started with.
          if (!shouldPlay()) video.pause();
        },
        (error: unknown) => {
          // AbortError = a newer pause()/load() interrupted it, and sync() already ran for that. Anything else
          // (autoplay refused) is retried on the visitor's first gesture instead of being swallowed.
          if (error instanceof DOMException && error.name === "AbortError") return;
          blockedUntilGesture = true;
        },
      );
    };

    const onGesture = () => {
      if (!blockedUntilGesture) return;
      blockedUntilGesture = false;
      sync();
    };
    // The browser (not us) paused it while it should be playing — resume.
    const onPause = () => {
      if (shouldPlay()) sync();
    };
    // A failed or stalled download: reload the source once, keeping the position.
    const onError = () => {
      if (reloaded || !video.getAttribute("src")) return;
      reloaded = true;
      const at = video.currentTime;
      video.load();
      video.addEventListener("loadedmetadata", () => { video.currentTime = at; sync(); }, { once: true });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) sync();
    };

    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      load();
      preload.disconnect();
    }, { rootMargin: "300px 0px" });
    let frame = 0;
    const measure = () => {
      frame = 0;
      sync();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    preload.observe(video);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    video.addEventListener("canplay", sync);
    // Safety net while playing (~4 times a second): if the clip got covered or scrolled off without a scroll event, stop it.
    video.addEventListener("timeupdate", sync);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("touchstart", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    window.addEventListener("scroll", onGesture, { passive: true });

    return () => {
      preload.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      video.removeEventListener("canplay", sync);
    video.removeEventListener("timeupdate", sync);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("scroll", onGesture);
    };
  }, [src]);

  return <video ref={ref} poster={poster} muted loop playsInline disablePictureInPicture disableRemotePlayback preload="none" aria-label={label} className="absolute left-0 top-1/2 aspect-video w-full -translate-y-1/2 object-cover" />;
}
