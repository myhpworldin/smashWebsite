import Link from "next/link";
import { HOME_WRAP, HomeAsset } from "./home-ui";
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
 * alternating blue/red cards, staggered left/right down a 1160px column on desktop, stacked below. The heading is a
 * sticky backdrop the cards scroll up over; HomeAnimations adds the scrubbed heading recede and card rise. As a card
 * scrolls into view its title glides from the bottom to the top and the case study's summary and "Know More" slide in
 * from the right — the card's former hover effect, now driven by scroll (HomeAnimations sets `--t`, the title's
 * progress, and `--s`, the summary's, on each card). Without that script, or with reduced motion, both default to 1: the
 * finished state, so nothing is ever hidden.
 */
export function CaseStudiesSection({ data }: { data: HomeSection<"selectedWork"> }) {
  return (
    <section aria-labelledby="work-heading" data-home-section="case-studies" className={data.heading ? undefined : "pb-20 pt-20 lg:pb-[120px] lg:pt-[160px]"}>
      <div className={HOME_WRAP}>
        {data.heading ? (
          // A screen-tall sticky frame with the heading centred in it: the section opens on the heading in the middle of
          // a screen of white, the frame pins as the section reaches the top, and the cards (z-10, after the frame)
          // scroll up over the still-centred heading. Scrolling back simply reverses it.
          <div data-work-stage className="sticky top-0 z-0 flex h-svh items-center justify-center">
            <h2 id="work-heading" data-work-heading className="mx-auto max-w-[1042px] text-center text-[36px] leading-[1.3] text-[#0b0f19] md:text-[56px] lg:text-[74px] lg:leading-[96px]">{data.heading}</h2>
          </div>
        ) : null}
        {/* With the heading, the bottom padding (half a screen plus about half the heading) keeps the frame pinned until
            the last card has passed above the heading — so the section closes the way it opened, on the heading centred
            in white, and the frame's lower half is the same white space below it before the next section. */}
        <ul data-work-cards className={`relative z-10 mx-auto flex max-w-[1160px] flex-col gap-6 lg:gap-[100px] ${data.heading ? "pb-[calc(50svh+6rem)]" : "mt-12 lg:mt-[100px]"}`}>
          {data.items.map((item, i) => {
            const tone = i % 2 === 0 ? "blue" : "red";
            const linked = isLive(item.path);
            return (
              <li key={item.slug} className={`group relative aspect-[535/415] w-full overflow-hidden border lg:w-[535px] ${tone === "blue" ? "border-white/26 bg-bright-blue lg:self-start" : "border-white/30 bg-smash-red lg:self-end"}`}>
                <svg aria-hidden="true" viewBox="0 0 535 415" className="absolute inset-0 size-full">{SWIRLS[tone]}</svg>
                {/* Text area (the card's padding box). It is a size container, so the title can rest at its bottom —
                    translated down by the area's height (100cqh) less its own — and glide to the top with one transform
                    (`--t`: 0 at rest, 1 at the top), whatever the card's size or the title's length. The summary sits
                    under the title's top position and slides in from the right (`--s`) once the title is most of the way up. */}
                <div className="absolute inset-x-[5.79%] bottom-[7.23%] top-[10%] [container-type:size]">
                  <h3 id={`work-${item.slug}`} className="text-2xl leading-[1.3] text-white [translate:0_calc((1-var(--t,1))*(100cqh-100%))] md:text-[32px]">
                    {item.title}
                  </h3>
                  {item.summary ? (
                    <p className="mt-3 whitespace-pre-line text-base leading-[1.45] text-white opacity-[calc(0.75*var(--s,1))] [translate:calc((1-var(--s,1))*40px)_0] md:mt-4 md:text-xl lg:text-[22px]">
                      {item.summary}
                    </p>
                  ) : null}
                </div>
                {linked ? (
                  // "Know More" is its own link (same page as the card) layered above the card link, so it can react to
                  // being hovered itself; the card link stays the one keyboard / screen-reader entry, hence the hiding.
                  // It slides in with the summary (`--s`). Hover: a white underline draws in from the left (and retracts
                  // to the right), the arrow flies out to the top-right as a fresh one slides in from the bottom-left,
                  // and both brighten to full white.
                  <Link
                    href={item.path}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="group/more absolute bottom-[9%] right-[5.79%] z-20 inline-flex items-center gap-4 py-2 text-lg leading-none text-white no-underline opacity-[var(--s,1)] [translate:calc((1-var(--s,1))*40px)_0] md:text-xl"
                  >
                    <span className="relative pb-1.5 opacity-80 transition-opacity duration-300 group-hover/more:opacity-100">
                      Know More
                      <span className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-white transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:origin-left group-hover/more:scale-x-100 motion-reduce:transition-none" />
                    </span>
                    <span className="relative size-[21px] shrink-0 overflow-hidden opacity-80 transition-opacity duration-300 group-hover/more:opacity-100">
                      <HomeAsset name="arrow-up-right-large.svg" width={21} height={21} className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:-translate-y-full group-hover/more:translate-x-full motion-reduce:transition-none" />
                      <HomeAsset name="arrow-up-right-large.svg" width={21} height={21} className="absolute inset-0 -translate-x-full translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:translate-x-0 group-hover/more:translate-y-0 motion-reduce:transition-none" />
                    </span>
                  </Link>
                ) : null}
                {/* The whole card is the link (named by its title), above everything else. */}
                {linked ? <Link href={item.path} aria-labelledby={`work-${item.slug}`} className="absolute inset-0 z-10" /> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
