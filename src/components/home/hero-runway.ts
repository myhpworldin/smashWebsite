/**
 * The Home hero is a scroll runway: a tall section (360svh, HeroSection) whose stage is `sticky`. The stage stays
 * pinned for the runway's height minus one screen, and that whole stretch is the globe's dive and the hero's own
 * choreography. When the stage lets go, the hero scrolls away like any other section and About follows normally.
 */

/** ScrollTrigger `end` for the dive: it finishes exactly where the stage lets go. */
export const diveEnd = (runway: HTMLElement) => () => `+=${Math.max(runway.offsetHeight - window.innerHeight, 1)}`;
