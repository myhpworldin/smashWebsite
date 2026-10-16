/**
 * The Home hero is a scroll runway: a tall section (460svh, HeroSection) whose stage is `sticky`. The stage stays
 * pinned for the runway's height minus one screen. The first part of that is the globe's dive and the hero's own
 * choreography; the last screen is the hand-over, during which About slides up over the pinned stage (AboutSection
 * overlaps it by one screen) while the stage darkens. Everything scrubbed over the dive ends one screen early, so the
 * dive keeps its length however long the hand-over is.
 */

/** ScrollTrigger `end` for the dive: it finishes one screen before the stage lets go. */
export const diveEnd = (runway: HTMLElement) => () => `+=${Math.max(runway.offsetHeight - 2 * window.innerHeight, 1)}`;
