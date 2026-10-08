import { HOME_WRAP, HomeAsset } from "./home-ui";
import type { HomeSection } from "./shared";

/**
 * Each line's resting opacity, by position (Figma "manifesto-cascade"): the lines brighten towards the fifth,
 * which is also set larger as the cascade's peak. Lines past the sixth keep the last value.
 */
const OPACITY = [0.26, 0.32, 0.5, 0.72, 1, 0.72];
const PEAK = 4;

/**
 * Manifesto band (Figma New Homepage, y 2495–3367): blue gradient with grain, the CMS story heading top-left and
 * the story's points as the "WE MADE MISTAKES. … WE EXECUTED." cascade. The outlined SMASH mark (bottom-left)
 * and the red glow (top-right) are decoration, clipped to the band.
 */
export function ManifestoSection({ data }: { data: HomeSection<"story"> }) {
  return (
    <section aria-labelledby="manifesto-heading" data-home-section="manifesto" className="relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <HomeAsset name="manifesto-background.svg" width={1440} height={872} className="absolute inset-0 size-full" />
        <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute right-[-442px] top-[-402px] max-w-none" />
        <div className="absolute bottom-[-15.8px] left-[-12.83px] flex h-[492.39px] w-[509.64px] origin-bottom-left scale-[0.6] items-center justify-center xl:scale-100">
          <HomeAsset name="manifesto-mark.svg" width={478} height={496} className="h-[495.19px] w-[477.39px] max-w-none rotate-[-88.24deg]" />
        </div>
      </div>

      <div className={`${HOME_WRAP} pb-24 pt-20 lg:pb-[146px] lg:pt-[130px]`}>
        {data.heading ? (
          <h2 id="manifesto-heading" className="max-w-[563px] text-[28px] leading-[1.3] md:text-[38px] xl:ml-2.5">{data.heading}</h2>
        ) : null}
        {data.supportingPoints.length ? (
          <ul className="mt-12 flex flex-col gap-4 font-inter font-semibold uppercase lg:ml-auto lg:mt-[65px] lg:w-fit lg:gap-6 xl:ml-[548px]">
            {data.supportingPoints.map((point, i) => (
              <li
                key={point.order}
                style={{ opacity: OPACITY[Math.min(i, OPACITY.length - 1)] }}
                className={`leading-[1.2] md:leading-[44px] ${i === PEAK ? "text-[26px] md:text-[45px]" : "text-[22px] md:text-[40px]"}`}
              >
                {point.title}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
