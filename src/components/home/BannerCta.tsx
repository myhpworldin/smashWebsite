import { FillImage, isLive, PillLink, WRAP, type HomeSection } from "./shared";

/** Full-width photo banner with a heading and one call to action. */
export function BannerCta({ data, className = "" }: { data: HomeSection<"bannerCta">; className?: string }) {
  const cta = data.primaryCta;
  return (
    <section aria-labelledby="banner-cta-heading" className={className}>
      <div className={WRAP}>
        <div className="relative isolate flex min-h-[380px] items-end overflow-hidden lg:items-start rounded-[20px] lg:h-[496px]">
          {data.image ? <FillImage media={data.image} sizes="(min-width: 1440px) 1320px, 100vw" className="-z-20 object-cover" /> : null}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(to_left,rgba(0,0,0,0)_0%,rgba(0,0,0,0.48)_86.477%)]" />
          <div className="flex max-w-[592px] flex-col gap-[30px] p-6 md:p-[60px] lg:pt-[224px]">
            <h2 id="banner-cta-heading" className="font-inter text-4xl font-bold capitalize leading-[1.15] text-white md:text-[58px] md:leading-[66px]">{data.heading}</h2>
            {cta && isLive(cta.target) ? <PillLink href={cta.target} tone="white" arrow="blue" className="w-fit">{cta.label}</PillLink> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
