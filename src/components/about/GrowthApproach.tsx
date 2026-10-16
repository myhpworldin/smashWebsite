import { WRAP } from "@/components/home/shared";
import styles from "./about.module.css";

const STAGES = [
  { title: "Diagnose", description: "Clarify the commercial goal, customer reality and real constraint." },
  { title: "Align", description: "Choose the focus, the shared priorities and the evidence that matters." },
  { title: "Build", description: "Bring strategy, creative, technology and teams into one delivery rhythm." },
  { title: "Launch", description: "Move deliberately, instrument the work and establish the baseline." },
  { title: "Learn", description: "Read the signals, share the insight and improve the next move." },
  { title: "Scale", description: "Expand what works, remove friction and build repeatable momentum." },
] as const;

/**
 * "Insight Into Movement" (Figma node 107:642): the intro and the six numbered stages. Redesigned as a guided walk
 * through the rhythm: on large screens the intro stays pinned at the left, with a counter, while the stages scroll
 * past on the right; the stage in the middle of the screen lights up (its number turns red and slides across, its
 * title goes deep-blue) and the rest dim, and a hairline beside the list fills as you move down it. The sheet is
 * white, over the blue Values band. With no JavaScript or with reduced motion every stage is simply shown in full.
 */
export function GrowthApproach({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="growth-approach-heading" className={`relative bg-white pb-20 pt-20 lg:pb-[140px] lg:pt-[140px] ${className}`}>
      <div className={`${WRAP} flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16`}>
        <div className="flex max-w-[504px] flex-col gap-8 lg:sticky lg:top-[140px] lg:w-[460px] lg:shrink-0">
          <div className="flex flex-col gap-5">
            <div data-reveal="fade-up" className="flex flex-col gap-4">
              <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-smash-red">How we grow</p>
              <h2 id="growth-approach-heading" className="font-inter text-[32px] font-medium leading-[1.15] text-black md:text-[42px] md:leading-[53px]">Insight Into Movement</h2>
            </div>
            <p data-reveal="fade-up" className="font-inter text-xl leading-[1.65] text-black/90">
              A connected growth rhythm keeps the work practical. Senior thinkers stay close, specialists collaborate early and learning never waits for a big reveal.
            </p>
          </div>
          <p aria-hidden="true" className="hidden items-baseline gap-3 font-manrope lg:flex">
            <span className="block h-[72px] overflow-hidden text-[72px] font-semibold leading-none text-deep-blue">
              <span data-stage-current className="block">01</span>
            </span>
            <span className="text-xl font-medium text-black/40">/ {String(STAGES.length).padStart(2, "0")}</span>
          </p>
        </div>

        <ol data-stage-list className={`${styles.stageList} relative flex flex-1 flex-col lg:max-w-[700px] lg:pl-10`}>
          <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 hidden w-px bg-black/10 lg:block">
            <span data-stage-rail className="block size-full origin-top scale-y-0 bg-smash-red" />
          </span>
          {STAGES.map((s, i) => (
            <li key={s.title} data-stage className={`${styles.stage} flex gap-[22px] border-t border-[#d9dce3] py-8 first:border-t-0 lg:gap-8 lg:py-[44px]`}>
              <span className={`${styles.num} w-[56px] shrink-0 font-inter text-xl font-bold text-black/40 lg:w-[72px] lg:text-[28px]`}>{String(i + 1).padStart(2, "0")}</span>
              <div className="flex flex-col gap-2.5">
                <h3 className={`${styles.title} font-inter text-[28px] font-medium leading-[normal] text-black lg:text-[40px]`}>{s.title}</h3>
                <p className="max-w-[460px] font-inter text-base leading-[1.6] text-black/80 lg:text-lg">{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
