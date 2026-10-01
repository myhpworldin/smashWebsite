import { Asset, FillImage, isLive, PillLink, type HomeSection } from "./shared";

const PILLS = [
  { className: "left-[853px] top-[435px]" },
  { className: "left-[903px] top-[516px]" },
  { className: "left-[963px] top-[596px]" },
];

/**
 * Home hero (Figma "Main Banner"): the banner photo under four blurred glow ellipses and a dark scrim,
 * with the global header floating over it (HeaderFrame). The glow ellipses and the three glass pills are
 * (the pills are the "Why SMASH" reasons) positioned on the design's 1440px canvas, centered, so they keep their place on wider screens.
 */
export function HomeHero({ hero, pills }: { hero: HomeSection<"hero">; pills: string[] }) {
  const { primaryCta, secondaryCta } = hero;
  return (
    <section aria-labelledby="hero-heading" className="relative isolate flex min-h-[720px] items-start overflow-hidden bg-navy text-white lg:h-[884px]">
      {hero.image ? <FillImage media={hero.image} sizes="100vw" className="-z-30 object-cover" /> : null}

      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-20 h-full w-[1440px] -translate-x-1/2">
        <div className="absolute left-[767.28px] top-[614.86px] h-[275px] w-[644px]">
          <Asset name="ellipse-4.svg" width={644} height={275} className="absolute inset-[-219.64%_-93.79%] size-auto max-w-none" />
        </div>
        <div className="absolute left-[829px] top-[349px] h-[502px] w-[505px]">
          <Asset name="ellipse-2.svg" width={505} height={502} className="absolute inset-[-84.46%_-83.96%] size-auto max-w-none" />
        </div>
        <div className="absolute left-[504px] top-[138px] h-[234px] w-[325px]">
          <Asset name="ellipse-3.svg" width={325} height={234} className="absolute inset-[-104.27%_-75.08%] size-auto max-w-none" />
        </div>
        <div className="absolute left-[-20.95px] top-[-56.88px] flex h-[448.758px] w-[695.905px] items-center justify-center">
          <div className="relative h-[275px] w-[644px] rotate-[16.73deg]">
            <Asset name="ellipse-1.svg" width={644} height={275} className="absolute inset-[-219.64%_-93.79%] size-auto max-w-none" />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[rgba(50,50,50,0.4)] backdrop-blur-[7.5px]" />

      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[1440px] -translate-x-1/2 min-[1200px]:block">
        {pills.slice(0, PILLS.length).map((text, i) => (
          <div key={text} data-hero-el="pill" className={`absolute flex h-[66px] w-[331px] items-center rounded-2xl border-[0.81px] border-white bg-white/10 px-6 backdrop-blur-[29.83px] ${PILLS[i].className}`}>
            <span className="whitespace-nowrap font-inter text-xl font-medium">{text}</span>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-36 md:px-10 lg:pt-[278px] xl:px-[110px]">
        <div className="flex max-w-[658px] flex-col gap-10">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-5">
              <h1 id="hero-heading" data-hero-el="heading" className="font-inter text-[40px] font-bold capitalize leading-[1.15] md:text-6xl md:leading-[76px]">{hero.heading}</h1>
              {hero.supportingText ? <p data-hero-el="text" className="max-w-[610px] font-inter text-lg leading-7 md:text-xl">{hero.supportingText}</p> : null}
            </div>
            <div data-hero-el="cta" className="flex flex-wrap items-center gap-5">
              {primaryCta && isLive(primaryCta.target) ? <PillLink href={primaryCta.target} tone="red" arrow="white">{primaryCta.label}</PillLink> : null}
              {secondaryCta && isLive(secondaryCta.target) ? <PillLink href={secondaryCta.target} tone="white" className="!text-smash-red">{secondaryCta.label}</PillLink> : null}
            </div>
          </div>
          {hero.eyebrow ? <p data-hero-el="eyebrow" className="w-fit rounded-[10px] bg-white/20 px-4 py-2.5 font-inter text-lg font-medium leading-5 backdrop-blur-xs">{hero.eyebrow}</p> : null}
        </div>
      </div>
    </section>
  );
}
