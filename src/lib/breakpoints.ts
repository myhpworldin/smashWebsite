/**
 * The device widths the project is required to QA against (developer
 * requirements). CSS media queries below use the same numbers directly
 * (a media query cannot reference a CSS custom property); this file exists so
 * any JS that needs a breakpoint (e.g. a future matchMedia check) uses the same
 * values instead of a second, drifting set of numbers.
 */
export const BREAKPOINTS = {
  mobileSmall: 360,
  mobile: 390,
  mobileLarge: 430,
  tablet: 768,
  laptop: 1024,
  desktop: 1366,
  desktopLarge: 1440,
} as const;
