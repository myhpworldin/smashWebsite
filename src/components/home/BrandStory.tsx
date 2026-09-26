import { isLive, paragraphs, PillLink, type HomeSection } from "./shared";

/** The design's fading opacity per manifesto line, by position (the last value repeats), and the one highlighted line. */
const OPACITY = [0.25, 0.3, 0.5, 0.7, 1, 0.9];
const HIGHLIGHT = 4;

/** The SMASH story: the manifesto cascade on the left (story points), the narrative on the right. The heading's last word is the accent. */
export function BrandStory({ data, className = "" }: { data: HomeSection<"story">; className?: string }) {
  const words = (data.heading ?? "").split(" ");
  const accent = words.length > 1 ? words.pop() : null;
  const lead = words.join(" ");
  const cta = data.cta;
  return (
    <section aria-labelledby="brand-story-heading" className={`bg-linear-to-b from-neutral-100/50 to-neutral-400/10 ${className}`}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-4 py-16 md:px-10 lg:flex-row lg:justify-between lg:px-20 lg:py-[100px]">
        <ul className="flex flex-col gap-4 pt-[50px] lg:w-[620px]" aria-label="How we learned">
          {data.supportingPoints.map((point, i) => (
            <li
              key={`${point.order}-${point.title}`}
              style={{ opacity: OPACITY[Math.min(i, OPACITY.length - 1)] }}
              className={`font-inter text-2xl font-semibold leading-10 md:text-4xl md:leading-[44px] ${i === HIGHLIGHT ? "text-eyebrow" : "text-gray-900"}`}
            >
              {point.title}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-8 lg:w-[581px]">
          <div className="flex flex-col gap-6">
            {data.heading ? (
              <h2 id="brand-story-heading" className="font-inter text-[32px] font-medium capitalize leading-[1.15] text-black md:text-[42px] md:leading-[54px]">
                {accent ? `${lead} ` : lead}
                {accent ? <span className="text-deep-blue">{accent}</span> : null}
              </h2>
            ) : null}
            {paragraphs(data.description).map((p) => (
              <p key={p} className="font-inter text-xl leading-[34px] text-black">{p}</p>
            ))}
          </div>
          {cta && isLive(cta.target) ? <PillLink href={cta.target} tone="red" arrow="white" className="w-fit">{cta.label}</PillLink> : null}
        </div>
      </div>
    </section>
  );
}
