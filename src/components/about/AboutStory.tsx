import Image from "next/image";
import { Asset, WRAP } from "@/components/home/shared";

/**
 * "Our Story" heading (Figma node 107:812): a single sentence, "SMASH" set in deep-blue, the closing clause
 * ("and the lessons...") faded to black/60 as in the design, everything else full-strength black.
 */
export function StoryHeading({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="story-heading" className={`${WRAP} ${className}`}>
      <div className="mx-auto flex max-w-[1152px] flex-col items-center gap-3 text-center">
        <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-smash-red">Our Story</p>
        <p id="story-heading" className="font-inter text-[26px] font-medium leading-[1.4] md:text-[38px] md:leading-[58px]">
          <span className="text-deep-blue">SMASH</span>
          <span className="text-black"> was born from the experience of building businesses from the ground up. The wins, the mistakes, the experiments, </span>
          <span className="text-black/60">and the lessons that taught us what growth really looks like beyond marketing.</span>
        </p>
      </div>
    </section>
  );
}

/**
 * "Team culture" band (Figma node 107:586): the "We Plan . We Create . We Grow Brands ." card on deep-blue,
 * beside the two culture photos.
 */
export function CultureBanner({ className = "" }: { className?: string }) {
  return (
    <section aria-label="How we work" className={`${WRAP} ${className}`}>
      <div className="flex flex-col gap-[22px] md:flex-row md:h-[240px]">
        <div className="flex h-[240px] shrink-0 flex-col justify-between rounded-[28px] bg-deep-blue p-[25px] text-white md:w-[406px] lg:w-[510px]">
          <p className="font-inter text-sm font-semibold uppercase leading-[normal]">Built to move</p>
          <p className="font-inter text-[26px] font-medium leading-[1.35] md:text-[30px] md:leading-[41px]">
            We Plan . We Create . We Grow Brands .
          </p>
        </div>
        <div className="relative h-[220px] shrink-0 overflow-hidden rounded-[20px] md:h-[240px] md:w-[406px]">
          <Image src="/media/about-team-collaboration.jpg" alt="Two SMASH team members reviewing work together" fill sizes="(min-width: 768px) 406px, 100vw" className="object-cover" />
        </div>
        <div className="relative h-[220px] shrink-0 overflow-hidden rounded-[20px] md:h-[240px] md:w-[360px]">
          <Image src="/media/about-culture-moment.jpg" alt="SMASH team collaborating around a desk" fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}

function MissionVisionPanel({ eyebrow, heading, description }: { eyebrow: string; heading: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-5 rounded-[18px] border border-deep-blue/[0.08] bg-[#f7f8fb] p-8">
      <div className="flex flex-col gap-3.5">
        <p className="font-inter text-sm font-semibold leading-[normal] text-[#f01616]">{eyebrow}</p>
        <p className="font-inter text-[28px] font-normal leading-[1.12] text-black md:text-[36px]">{heading}</p>
      </div>
      <p className="font-inter text-lg leading-[1.68] text-black/90">{description}</p>
    </div>
  );
}

/** Mission/Vision panels with the design's connector line + target icon between them (Figma node 107:592). */
export function MissionVision({ className = "" }: { className?: string }) {
  return (
    <section aria-label="Our mission and vision" className={`${WRAP} ${className}`}>
      <div className="flex flex-col gap-8 rounded-[24px] border border-deep-blue/[0.08] bg-white p-6 shadow-[0px_14px_196px_-120px_rgba(11,27,77,0.12)] lg:flex-row lg:items-stretch lg:gap-0 lg:p-8">
        <MissionVisionPanel eyebrow="01 / MISSION" heading="Make growth clearer, more connected and more executable." description="We align decisions, disciplines and delivery around what customers do next and what the business needs next." />
        <div className="hidden shrink-0 flex-col items-center justify-center gap-3 px-8 lg:flex">
          <span aria-hidden="true" className="h-[120px] w-px bg-black/[0.08]" />
          <span className="grid size-[60px] place-items-center rounded-2xl border border-black/30 bg-white">
            <Asset name="about-target-goal.svg" width={28} height={28} />
          </span>
          <span aria-hidden="true" className="h-[120px] w-px bg-black/[0.08]" />
        </div>
        <MissionVisionPanel eyebrow="02 / VISION" heading="A better agency model for businesses that are ready to move." description="Senior thinking stays close to execution, learning is shared and every part of the system works in the same direction." />
      </div>
    </section>
  );
}
