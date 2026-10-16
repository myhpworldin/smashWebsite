import Image from "next/image";
import { WRAP } from "@/components/home/shared";

/**
 * "Built on Collaboration, Ownership, and Shared Growth" (Figma node 107:745): copy on the left, photo on the right.
 * The photo unmasks from the bottom as it arrives and drifts inside its frame (AboutMotion), with an outlined frame
 * behind it that slides into place; the copy rises in, as the rest of the page's sections do. `showEyebrow={false}` drops the
 * red "Our Culture" label (Careers does).
 */
export function Culture({ className = "", showEyebrow = true }: { className?: string; showEyebrow?: boolean }) {
  return (
    <section aria-labelledby="culture-heading" data-culture className={`overflow-hidden bg-white ${className}`}>
      <div className={`${WRAP} flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:justify-between lg:gap-10`}>
        <div className="flex max-w-[651px] flex-col gap-[26px]">
          <div data-reveal="fade-up" className="flex flex-col gap-4">
            {showEyebrow ? <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">Our Culture</p> : null}
            <h2 id="culture-heading" className="font-inter text-[32px] font-medium leading-[1.2] text-ink md:text-[42px]">Built on Collaboration, Ownership, and Shared Growth.</h2>
          </div>
          <div data-reveal="fade-up" className="flex flex-col gap-2.5 font-inter text-xl leading-[1.7]">
            <p className="font-medium text-black/60">We Work Together to Own the Outcome.</p>
            <p className="text-black">
              At SMASH, culture is how we show up every day. We collaborate with intention, take ownership with confidence, and learn from every win and challenge. We believe
              that when individuals grow, teams grow, and the business grows with them. That&rsquo;s why we build an environment where everyone can contribute, learn, and
              thrive together.
            </p>
          </div>
        </div>
        <div className="relative w-full shrink-0 lg:w-[569px]">
          <span aria-hidden="true" data-culture-frame className="absolute inset-0 translate-x-4 translate-y-4 rounded-[20px] border border-smash-red/60 lg:translate-x-6 lg:translate-y-6" />
          <div data-culture-photo className="relative h-[320px] w-full overflow-hidden rounded-[20px] border border-black/20 bg-black/5 md:h-[400px] lg:h-[466px]">
            <Image data-culture-img src="/media/about-team-culture.png" alt="SMASH team laughing together around a table" fill sizes="(min-width: 1024px) 569px, 100vw" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}
