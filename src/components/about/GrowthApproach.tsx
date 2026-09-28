import { WRAP } from "@/components/home/shared";

const STAGES = [
  { title: "Diagnose", description: "Clarify the commercial goal, customer reality and real constraint." },
  { title: "Align", description: "Choose the focus, the shared priorities and the evidence that matters." },
  { title: "Build", description: "Bring strategy, creative, technology and teams into one delivery rhythm." },
  { title: "Launch", description: "Move deliberately, instrument the work and establish the baseline." },
  { title: "Learn", description: "Read the signals, share the insight and improve the next move." },
  { title: "Scale", description: "Expand what works, remove friction and build repeatable momentum." },
] as const;

/** "Insight Into Movement" (Figma node 107:642): the intro on the left, a two-column numbered stage list on the right. */
export function GrowthApproach({ className = "" }: { className?: string }) {
  const columns = [STAGES.slice(0, 3), STAGES.slice(3)];
  return (
    <section aria-labelledby="growth-approach-heading" className={className}>
      <div className={`${WRAP} flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-10`}>
        <div className="flex max-w-[504px] flex-col gap-5">
          <div className="flex flex-col gap-4">
            <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-smash-red">How we grow</p>
            <h2 id="growth-approach-heading" className="font-inter text-[32px] font-medium leading-[1.15] text-black md:text-[42px] md:leading-[53px]">Insight Into Movement</h2>
          </div>
          <p className="font-inter text-xl leading-[1.65] text-black/90">
            A connected growth rhythm keeps the work practical. Senior thinkers stay close, specialists collaborate early and learning never waits for a big reveal.
          </p>
        </div>
        <div className="grid gap-x-[50px] gap-y-0 sm:grid-cols-2 lg:w-[710px] lg:shrink-0">
          {columns.map((stages, c) => (
            <ol key={c} className="flex flex-col">
              {stages.map((s, i) => (
                <li key={s.title} className={`flex gap-[22px] py-[22px] ${i > 0 ? "border-t border-[#d9dce3]" : ""}`}>
                  <span className="w-[42px] shrink-0 font-inter text-lg font-bold text-smash-red">{String(c * 3 + i + 1).padStart(2, "0")}</span>
                  <div className="flex flex-col gap-[7px]">
                    <h3 className="font-inter text-[22px] font-medium leading-[normal] text-deep-blue">{s.title}</h3>
                    <p className="font-inter text-sm leading-[1.55] text-black/90">{s.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
    </section>
  );
}
