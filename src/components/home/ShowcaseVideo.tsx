"use client";

import { useEffect, useRef } from "react";

/**
 * The showcase clip. One rule drives everything: the video should be playing exactly when the band is on screen
 * (at least 30% visible), the tab is visible and the visitor has not asked for reduced motion. `sync()` makes the
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

    let inView = false;
    let blockedUntilGesture = false;
    let reloaded = false;

    const load = () => {
      if (!video.getAttribute("src")) video.src = src;
    };
    const shouldPlay = () => inView && !document.hidden && !motion.matches;

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
    const playback = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: 0.3 });
    preload.observe(video);
    playback.observe(video);

    video.addEventListener("canplay", sync);
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
      playback.disconnect();
      video.removeEventListener("canplay", sync);
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

  return <video ref={ref} poster={poster} muted loop playsInline disablePictureInPicture disableRemotePlayback preload="none" aria-label={label} className="absolute inset-0 size-full object-cover" />;
}
