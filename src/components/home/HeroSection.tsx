import { HeroAtmosphere } from "./HeroAtmosphere";
import { HeroMotion } from "./HeroMotion";
import { HomeGlobe } from "./HomeGlobe";
import { HomeAsset, HomeButton } from "./home-ui";
import { isLive, type HomeSection } from "./shared";
import styles from "@/components/layout/sheet.module.css";

/**
 * Home hero (Figma "Smash Redesign" → New Homepage, "Desktop - 1"): blue glows drifting like mist on black (HeroAtmosphere) under the
 * dot-matrix globe (HomeGlobe), a centered two-line heading with the sparkle after its last word, supporting text,
 * the two CTAs and the scroll cue.
 *
 * The hero is a scroll runway: the section is several screens tall and its stage is `sticky`, so it stays on screen
 * while the page scrolls past it. That scroll is what drives the globe's dive to Kerala (createGlobe) and the
 * hero's own choreography (HeroMotion), and the whole effect ends inside the hero — About follows as an ordinary
 * section that follows the finished stage. Reduced motion has no runway: the hero is one screen with the
 * globe at rest. Layering inside the stage: mist (-z-10) < globe (z-1) < content (z-2); the global header floats over it as a glass pill
 * (HeaderFrame). Words and CTAs come from the CMS hero. The heading and intro load in like the inner pages' heroes (SheetHero):
 * each word rises out of its own mask, one after another, then the intro fades up — pure CSS (sheet.module.css), so it runs
 * before hydration and is off under reduced motion; HeroMotion's scroll-out acts on the elements around them. The heading's line break is not hard-coded: its 940px measure
 * breaks the CMS heading where the design does.
 */
export function HeroSection({ hero }: { hero: HomeSection<"hero"> }) {
  const { primaryCta, secondaryCta } = hero;
  const words = hero.heading.trim().split(/\s+/);
  const lastIndex = words.length - 1;
  // The intro follows the last word's rise: the words start 90ms apart (sheet.module.css), so it waits for the last one.
  const introDelay = 250 + 90 * lastIndex + 150;
  return (
    <section aria-labelledby="hero-heading" data-home-section="hero" data-hero-runway className="relative h-[360svh] bg-black text-white motion-reduce:h-auto">
      <HeroMotion />
      <div className="sticky top-0 isolate flex h-svh min-h-[560px] flex-col items-center overflow-hidden">
        <HeroAtmosphere />
        <HomeGlobe />

        <div className="relative z-[2] flex w-full max-w-[1440px] flex-col items-center px-4 pt-[15.5rem] text-center md:px-10 lg:pt-[max(221px,calc(50svh-290px))]">
          <h1 id="hero-heading" data-hero-heading className="max-w-[940px] will-change-[transform,opacity] text-[40px] capitalize leading-[1.25] [text-shadow:0_4px_66px_rgba(0,0,0,0.28)] sm:text-[56px] lg:text-[80px] lg:leading-[113px]">
            {words.map((word, i) => (
              <span key={`${word}-${i}`}>
                <span className={styles.word}>
                  <span className={`${styles.wordInner} ${i === lastIndex ? "whitespace-nowrap" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                    {word}
                    {i === lastIndex ? <HomeAsset name="hero-sparkle.svg" width={28} height={28} className="ml-3 inline-block size-5 align-top lg:ml-[30px] lg:mt-2 lg:size-7" /> : null}
                  </span>
                </span>
                {i < lastIndex ? " " : null}
              </span>
            ))}
          </h1>
          {hero.supportingText ? (
            // The wrapper carries HeroMotion's scroll-out (GSAP); the paragraph inside carries the load-in (CSS), so the two never fight over one element.
            <div data-hero-text className="mt-4 will-change-[transform,opacity] lg:mt-2.5">
              <p style={{ "--d": `${introDelay}ms` } as React.CSSProperties} className={`${styles.fadeUp} max-w-[654px] text-lg text-white/75 leading-7 lg:text-[23px] lg:leading-9`}>{hero.supportingText}</p>
            </div>
          ) : null}
          <div data-hero-cta className="will-change-[transform,opacity] mt-10 flex flex-wrap items-center justify-center gap-5">
            {primaryCta && isLive(primaryCta.target) ? <HomeButton href={primaryCta.target} tone="red" arrow>{primaryCta.label}</HomeButton> : null}
            {secondaryCta && isLive(secondaryCta.target) ? <HomeButton href={secondaryCta.target} tone="white">{secondaryCta.label}</HomeButton> : null}
          </div>
        </div>

        <div aria-hidden="true" data-hero-cue className="absolute bottom-10 left-1/2 z-[2] flex -translate-x-1/2 flex-col gap-0.5 lg:bottom-[70px]">
          {["scroll-chevron-faded.svg", "scroll-chevron.svg"].map((name) => (
            <span key={name} data-hero-chevron className="flex h-[9px] w-[18px] items-center justify-center">
              <HomeAsset name={name} width={9} height={18} className="max-w-none rotate-90" />
            </span>
          ))}
        </div>

        {/* Dive progress: a hairline rail down the right edge that fills as the globe closes in on Kerala. */}
        <div aria-hidden="true" className="absolute right-4 top-1/2 z-[2] h-24 w-px -translate-y-1/2 bg-white/15 motion-reduce:hidden md:right-8">
          <div data-hero-rail-fill className="size-full origin-top scale-y-0 bg-white/80" />
        </div>

        {/* Kerala caption: below the pin (screen centre) on small screens; on lg and up it sits in the ocean to its left, so it never covers the highlighted state. The brand, then where it is. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 z-[2] flex flex-col items-center px-4 pt-20 text-center motion-reduce:hidden lg:inset-x-auto lg:right-1/2 lg:mr-28 lg:-translate-y-1/2 lg:items-end lg:px-0 lg:pt-0 lg:text-right">
          <p data-hero-locale-item className="text-[26px] font-semibold leading-[1.15] tracking-wide opacity-0 lg:text-[40px]">SMASH International</p>
          <p data-hero-locale-item className="mt-3 text-xs uppercase leading-[1] tracking-[0.24em] text-white/60 opacity-0 lg:mt-4 lg:text-sm">Kerala, India</p>
        </div>
      </div>
    </section>
  );
}
