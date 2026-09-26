import { FillImage, isLive, PillLink, SectionHeading, type HomeSection } from "./shared";

/** "Our Story": the photo on the left, the story on the right. */
export function OurStory({ data, className = "" }: { data: HomeSection<"ourStory">; className?: string }) {
  const cta = data.cta;
  return (
    <section aria-labelledby="our-story-heading" className={className}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-10 px-4 md:px-10 lg:flex-row lg:gap-20 lg:px-[70px]">
        <div className="relative aspect-[569/573] w-full max-w-[569px] shrink-0 overflow-hidden rounded-[20px] border border-black/20">
          {data.image ? <FillImage media={data.image} sizes="(min-width: 1024px) 569px, 100vw" className="object-cover" /> : null}
          <div aria-hidden="true" className="absolute inset-0 bg-black/10" />
        </div>
        <div className="flex max-w-[651px] flex-col gap-[50px]">
          <div className="flex flex-col gap-[26px]">
            <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="our-story-heading" className="max-w-[624px]" />
            <div className="flex flex-col gap-2.5">
              {data.lead ? <p className="font-inter text-xl font-medium leading-9 text-black/60">{data.lead}</p> : null}
              {data.description ? <p className="whitespace-pre-line font-inter text-xl leading-9 text-black">{data.description}</p> : null}
            </div>
          </div>
          {cta && isLive(cta.target) ? <PillLink href={cta.target} tone="red" arrow="white" className="w-fit">{cta.label}</PillLink> : null}
        </div>
      </div>
    </section>
  );
}
