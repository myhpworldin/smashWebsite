import Link from "next/link";
import { Asset, FillImage, isLive, PillLink, SectionHeading, WRAP, type HomeSection } from "./shared";

/** "Case Studies": one 640x448 image card per referenced case study (title, summary, glass arrow), each linking to its own page. */
export function CaseStudies({ data, className = "" }: { data: HomeSection<"selectedWork">; className?: string }) {
  const cta = data.cta;
  return (
    <section aria-labelledby="case-studies-heading" className={className}>
      <div className={WRAP}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="case-studies-heading" className="max-w-[819px]" />
          {cta && isLive(cta.target) ? <PillLink href={cta.target} tone="outline">{cta.label}</PillLink> : null}
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:gap-10">
          {data.items.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className="group relative isolate flex aspect-[640/448] flex-col justify-end overflow-hidden rounded-[18px] bg-navy p-[22px] text-white no-underline"
            >
              {item.image ? <FillImage media={item.image} sizes="(min-width: 1440px) 640px, (min-width: 768px) 50vw, 100vw" className="-z-20 object-cover" /> : null}
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[68%] rounded-b-[18px] bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.9)_82.143%)]" />
              {/* Glass arrow: the design's 500px blurred-ellipse artwork is centred on a 60px slot. */}
              <span aria-hidden="true" className="absolute right-[22px] top-[22px] size-[60px]">
                <Asset name="arrow-card.svg" width={500} height={500} className="pointer-events-none absolute left-[-220px] top-[-216px] max-w-none" />
              </span>
              <div className="relative flex max-w-[502px] flex-col gap-2.5">
                <h3 className="font-manrope text-[22px] font-semibold leading-[1.4] md:text-[26px]">{item.title}</h3>
                <p className="font-inter text-[15px] leading-[22px]">{item.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
