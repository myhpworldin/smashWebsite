import Image from "next/image";
import { Asset, WRAP } from "@/components/home/shared";
import { HomeAsset } from "@/components/home/home-ui";
import { MaskLine, StoryWords } from "./AboutWords";
import sheet from "@/components/layout/sheet.module.css";
import styles from "./about.module.css";
import { SHEET } from "@/components/layout/SheetHero";

/**
 * "Our Story" (Figma node 107:812): a single sentence, "SMASH" set in deep-blue, the closing clause ("and the
 * lessons...") faded to black/60 as in the design, everything else full-strength black. It is the first sheet: it
 * slides up over the sticky hero (AboutHero) and, as it crosses the screen, the sentence is read in word by word
 * (AboutMotion scrubs each word from dim up to its resting opacity), so the story is paced by the scroll.
 */
export function StoryHeading({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="story-heading" className={`relative z-10 flex min-h-svh items-center bg-white py-24 lg:py-[140px] ${SHEET} ${className}`}>
      <div className={WRAP}>
        <div className="mx-auto flex max-w-[1152px] flex-col items-center gap-6 text-center">
          <p data-reveal="fade-up" className="font-inter text-sm font-semibold uppercase leading-[normal] text-smash-red">Our Story</p>
          <h2 id="story-heading" data-story-text className="font-inter text-[28px] font-medium leading-[1.4] md:text-[42px] md:leading-[1.38] lg:text-[54px]">
            <StoryWords text="SMASH" className="text-deep-blue" />{" "}
            <StoryWords text="was born from the experience of building businesses from the ground up. The wins, the mistakes, the experiments," className="text-black" />{" "}
            <StoryWords text="and the lessons that taught us what growth really looks like beyond marketing." className="text-black" rest={0.6} />
          </h2>
        </div>
      </div>
    </section>
  );
}

/** One photograph in the "Built to move" band: it unmasks as it arrives and its picture drifts inside the frame (AboutMotion). */
function MovePhoto({ src, alt, sizes, className, speed }: { src: string; alt: string; sizes: string; className: string; speed: number }) {
  return (
    <div data-move-speed={speed} className={className}>
      <div data-move-photo className="relative size-full overflow-hidden rounded-[20px]">
        <Image data-move-img src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    </div>
  );
}

/**
 * "Team culture" band (Figma node 107:586): the "We Plan . We Create . We Grow Brands ." card on deep-blue,
 * beside the two culture photos. Redesigned as a staggered row: the card and the two photos sit at different heights
 * and drift at different speeds as the page scrolls, the card's three lines rise out of their masks one by one, and
 * the photos unmask from the bottom.
 */
export function CultureBanner({ className = "" }: { className?: string }) {
  return (
    <section aria-label="How we work" data-move className={`relative bg-white pb-20 lg:pb-[150px] ${className}`}>
      <div className={`${WRAP} grid gap-5 md:grid-cols-[1.15fr_1fr_0.85fr] md:gap-6 lg:items-start lg:gap-[22px]`}>
        <div data-move-speed={0.4} className="relative isolate flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[28px] bg-deep-blue p-[25px] text-white md:min-h-[460px] lg:min-h-[540px] lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -z-10 size-full">
            <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[420px] -top-[420px] max-w-none opacity-80" />
            <span className="absolute inset-x-8 top-[72px] h-px bg-white/15" />
          </div>
          <p className="font-inter text-sm font-semibold uppercase leading-[normal]">Built to move</p>
          <p className="whitespace-nowrap font-inter text-[32px] font-medium leading-[1.2] md:text-[30px] lg:text-[44px] lg:leading-[1.2] xl:text-[50px]">
            <MaskLine>We Plan <span className="text-smash-red">.</span></MaskLine>
            <MaskLine>We Create <span className="text-smash-red">.</span></MaskLine>
            <MaskLine>We Grow Brands <span className="text-smash-red">.</span></MaskLine>
          </p>
        </div>
        <MovePhoto src="/media/about-team-collaboration.jpg" alt="Two SMASH team members reviewing work together" sizes="(min-width: 768px) 33vw, 100vw" speed={1} className="h-[300px] md:mt-[70px] md:h-[400px] lg:mt-[90px] lg:h-[470px]" />
        <MovePhoto src="/media/about-culture-moment.jpg" alt="SMASH team collaborating around a desk" sizes="(min-width: 768px) 28vw, 100vw" speed={1.8} className="h-[300px] md:mt-[20px] md:h-[360px] lg:mt-[30px] lg:h-[420px]" />
      </div>
    </section>
  );
}

function MissionVisionPanel({ side, eyebrow, heading, description }: { side: "left" | "right"; eyebrow: string; heading: string; description: string }) {
  const [number] = eyebrow.split(" ");
  return (
    <div data-mv-panel={side} data-spot className={`${sheet.spot} relative flex flex-1 flex-col justify-between gap-10 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-7 lg:min-h-[480px] lg:p-12`}>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-4 select-none text-[140px] font-semibold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.09)] lg:-bottom-10 lg:text-[220px]">{number}</span>
      <div className="relative flex flex-col gap-4">
        <p data-reveal="fade-up" className="font-inter text-sm font-semibold leading-[normal] text-[#ff4a4a]">{eyebrow}</p>
        <p data-reveal="fade-up" className="font-inter text-[30px] font-normal leading-[1.12] text-white md:text-[40px] lg:text-[46px]">{heading}</p>
      </div>
      <p data-reveal="fade-up" className="relative max-w-[520px] font-inter text-lg leading-[1.68] text-white/70">{description}</p>
    </div>
  );
}

/**
 * Mission/Vision panels with the design's connector line + target icon between them (Figma node 107:592). Now a dark
 * sheet over the "Built to move" band (like Home's Services): the panels slide in from either side, the connector
 * draws itself down to the target, whose rings keep breathing out, and a light follows the pointer across each panel.
 */
export function MissionVision({ className = "" }: { className?: string }) {
  return (
    <section aria-label="Our mission and vision" data-mv className={`relative bg-[#1a1a1a] pb-20 pt-20 text-white lg:pb-[140px] lg:pt-[130px] ${className}`}>
      <div className={`${WRAP} flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0`}>
        <MissionVisionPanel side="left" eyebrow="01 / MISSION" heading="Make growth clearer, more connected and more executable." description="We align decisions, disciplines and delivery around what customers do next and what the business needs next." />
        <div className="hidden shrink-0 flex-col items-center justify-center gap-3 px-8 lg:flex">
          <span aria-hidden="true" data-mv-line className="h-[130px] w-px origin-top bg-white/25" />
          <span data-mv-icon className="relative grid size-[60px] place-items-center rounded-2xl border border-white/30 bg-white">
            <span aria-hidden="true" className={styles.ring} />
            <span aria-hidden="true" className={styles.ring} />
            <Asset name="about-target-goal.svg" width={28} height={28} />
          </span>
          <span aria-hidden="true" data-mv-line className="h-[130px] w-px origin-bottom bg-white/25" />
        </div>
        <MissionVisionPanel side="right" eyebrow="02 / VISION" heading="A better agency model for businesses that are ready to move." description="Senior thinking stays close to execution, learning is shared and every part of the system works in the same direction." />
      </div>
    </section>
  );
}
