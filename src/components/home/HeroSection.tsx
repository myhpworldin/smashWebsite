import { HeroAtmosphere } from "./HeroAtmosphere";
import { HomeAsset, HomeButton } from "./home-ui";
import { isLive, type HomeSection } from "./shared";

/**
 * Home hero (Figma "Smash Redesign" → New Homepage, "Desktop - 1"): blue glows drifting like mist on black (HeroAtmosphere), a centered
 * two-line heading with the sparkle after its last word, supporting text, the two CTAs and the scroll cue.
 * The global header floats over it as a glass pill (HeaderFrame). Words and CTAs come from the CMS hero.
 * The heading's line break is not hard-coded: its 940px measure breaks the CMS heading where the design does.
 */
export function HeroSection({ hero }: { hero: HomeSection<"hero"> }) {
  const { primaryCta, secondaryCta } = hero;
  const words = hero.heading.trim().split(/\s+/);
  const lastWord = words.pop();
  return (
    <section aria-labelledby="hero-heading" data-home-section="hero" className="relative isolate flex min-h-[640px] flex-col items-center overflow-hidden bg-black text-white lg:h-[800px]">
      <HeroAtmosphere />

      <div className="flex w-full max-w-[1440px] flex-col items-center px-4 pb-28 pt-36 text-center md:px-10 lg:pb-0 lg:pt-[221px]">
        <h1 id="hero-heading" className="max-w-[940px] text-[40px] capitalize leading-[1.25] [text-shadow:0_4px_66px_rgba(0,0,0,0.28)] sm:text-[56px] lg:text-[80px] lg:leading-[113px]">
          {words.join(" ")}{" "}
          <span className="whitespace-nowrap">
            {lastWord}
            <HomeAsset name="hero-sparkle.svg" width={28} height={28} className="ml-3 inline-block size-5 align-top lg:ml-[30px] lg:mt-2 lg:size-7" />
          </span>
        </h1>
        {hero.supportingText ? <p className="mt-4 max-w-[654px] text-lg text-white/75 leading-7 lg:mt-2.5 lg:text-[23px] lg:leading-9">{hero.supportingText}</p> : null}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          {primaryCta && isLive(primaryCta.target) ? <HomeButton href={primaryCta.target} tone="red" arrow>{primaryCta.label}</HomeButton> : null}
          {secondaryCta && isLive(secondaryCta.target) ? <HomeButton href={secondaryCta.target} tone="white">{secondaryCta.label}</HomeButton> : null}
        </div>
      </div>

      <div aria-hidden="true" className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col gap-0.5 lg:bottom-[70px]">
        {["scroll-chevron-faded.svg", "scroll-chevron.svg"].map((name) => (
          <span key={name} className="flex h-[9px] w-[18px] items-center justify-center">
            <HomeAsset name={name} width={9} height={18} className="max-w-none rotate-90" />
          </span>
        ))}
      </div>
    </section>
  );
}
