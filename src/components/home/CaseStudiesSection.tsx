import Link from "next/link";
import { HOME_WRAP } from "./home-ui";
import { isLive, type HomeSection } from "./shared";

/**
 * The cards' swirl decoration, drawn on the card's own 535×415 Figma canvas so it scales with the card. Positions
 * and rotations are the design's (Figma "Group 1261161378" blue / "Group 1261161379" red); the red card mirrors
 * the blue card's swirl.
 */
const SWIRLS = {
  blue: (
    <>
      <image href="/media/home/case-blue-swirl.svg" x={118.14} y={-117.4} width={218.73} height={454.5} transform="rotate(89.87 227.5 109.85)" />
      <image href="/media/home/case-blue-swirl-small.svg" x={423.6} y={28.1} width={111.38} height={95.5} />
    </>
  ),
  red: (
    <>
      <image href="/media/home/case-red-swirl.svg" x={199.99} y={-117.4} width={218.73} height={454.5} transform="rotate(-89.87 309.35 109.85) translate(618.7 0) scale(-1 1)" />
      <image href="/media/home/case-red-swirl-small.svg" x={0.22} y={0.2} width={74.16} height={154.1} transform="rotate(179.73 37.3 77.25) translate(74.6 0) scale(-1 1)" />
    </>
  ),
};

/**
 * "Real campaigns. Real growth. Measurable results" (Figma New Homepage, y 4180 on): the CMS selected work as
 * alternating blue/red cards, staggered left/right down a 1160px column on desktop, stacked below.
 */
export function CaseStudiesSection({ data }: { data: HomeSection<"selectedWork"> }) {
  return (
    <section aria-labelledby="work-heading" data-home-section="case-studies" className="pb-20 pt-20 lg:pb-[120px] lg:pt-[160px]">
      <div className={HOME_WRAP}>
        {data.heading ? (
          <h2 id="work-heading" className="mx-auto max-w-[1042px] text-center text-[36px] leading-[1.3] text-[#0b0f19] md:text-[56px] lg:text-[74px] lg:leading-[96px]">{data.heading}</h2>
        ) : null}
        <ul className="mx-auto mt-12 flex max-w-[1160px] flex-col gap-6 lg:mt-[100px] lg:gap-[100px]">
          {data.items.map((item, i) => {
            const tone = i % 2 === 0 ? "blue" : "red";
            const linked = isLive(item.path);
            return (
              <li key={item.slug} className={`relative aspect-[535/415] w-full overflow-hidden border lg:w-[535px] ${tone === "blue" ? "border-white/26 bg-bright-blue lg:self-start" : "border-white/30 bg-smash-red lg:self-end"}`}>
                <svg aria-hidden="true" viewBox="0 0 535 415" className="absolute inset-0 size-full">{SWIRLS[tone]}</svg>
                <h3 className="absolute bottom-[7.23%] left-[5.79%] text-2xl leading-[1.3] text-white md:text-[32px]">
                  {linked ? (
                    <Link href={item.path} className="text-white no-underline after:absolute after:inset-0 after:content-['']">{item.title}</Link>
                  ) : (
                    item.title
                  )}
                </h3>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
