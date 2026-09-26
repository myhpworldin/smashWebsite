import type { HeroSection } from "@/server/api/sections";
import { Media } from "@/components/ui/Media";
import { CtaButton } from "@/components/content/CtaButton";

/**
 * Home hero: a full-bleed image under a red/white glow and a dark scrim, with
 * the global header floating on top (see HeaderFrame). Renders whatever
 * `HeroSection` data it's given; without an image the glow sits on a dark base.
 */
export function Hero({ hero }: { hero: HeroSection }) {
  if (!hero) return null;
  return (
    <div className="relative isolate flex min-h-[640px] items-center overflow-hidden rounded-b-[20px] bg-zinc-900 text-white lg:min-h-[884px]">
      <div aria-hidden="true" className="absolute inset-0 -z-30 [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
        <Media media={hero.image} sizes="100vw" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute right-[-5%] top-[35%] h-[500px] w-[505px] rounded-full bg-red-700/90 blur-[212px]" />
        <div className="absolute left-[35%] top-[15%] h-60 w-80 rounded-full bg-red-700/90 blur-[122px]" />
        <div className="absolute bottom-[10%] right-[10%] h-72 w-[644px] rounded-full bg-white blur-[302px]" />
        <div className="absolute -top-14 left-[4%] h-72 w-[644px] rotate-[16deg] rounded-full bg-white blur-[302px]" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-zinc-800/40 backdrop-blur-sm" />

      <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-32 md:px-[60px] lg:px-[110px]">
        <div className="flex max-w-[658px] flex-col gap-10">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-5">
              <h1 className="font-inter text-4xl font-bold capitalize leading-tight md:text-6xl md:leading-[76px]">{hero.heading}</h1>
              {hero.supportingText ? <p className="text-lg leading-7 md:text-xl">{hero.supportingText}</p> : null}
            </div>
            {hero.primaryCta || hero.secondaryCta ? (
              <div className="flex flex-wrap items-center gap-5">
                <CtaButton cta={hero.primaryCta} variant="primary" />
                <CtaButton cta={hero.secondaryCta} variant="secondary" />
              </div>
            ) : null}
          </div>
          {hero.eyebrow ? (
            <p className="inline-flex w-fit rounded-[10px] bg-white/20 px-4 py-2.5 text-lg font-medium leading-5 backdrop-blur-xs">{hero.eyebrow}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
