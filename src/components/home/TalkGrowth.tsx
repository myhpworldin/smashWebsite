import { isLive, PillLink, type HomeSection } from "./shared";

/** "Let's Talk Growth": the closing call to action on the navy band (the footer continues it). */
export function TalkGrowth({ data }: { data: HomeSection<"cta"> }) {
  const cta = data.primaryCta;
  return (
    <section aria-labelledby="talk-growth-heading" className="bg-navy px-4 py-16 text-white lg:pb-[100px] lg:pt-[100px]">
      <div data-reveal-group className="mx-auto flex max-w-[837px] flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <h2 id="talk-growth-heading" className="font-inter text-[32px] font-medium md:text-[42px]">{data.heading}</h2>
          {data.description ? <p className="font-inter text-xl leading-[1.66]">{data.description}</p> : null}
        </div>
        {cta && isLive(cta.target) ? <PillLink href={cta.target} tone="red" arrow="white">{cta.label}</PillLink> : null}
      </div>
    </section>
  );
}
