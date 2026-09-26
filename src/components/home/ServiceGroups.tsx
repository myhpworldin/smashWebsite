import Link from "next/link";
import { Asset, IconTile, isLive, PillLink, SectionHeading, WRAP, type HomeSection } from "./shared";

const ICONS = ["trending-up", "share", "monitor", "message-circle"];

/** "Our Services": one card per referenced service (name, its deliverables as the list). Icons are presentation, by position. */
export function ServiceGroups({ data, className = "" }: { data: HomeSection<"services">; className?: string }) {
  const cta = data.cta;
  return (
    <section aria-labelledby="services-heading" className={className}>
      <div className={WRAP}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="services-heading" className="max-w-[819px]" />
          {cta && isLive(cta.target) ? <PillLink href={cta.target} tone="outline">{cta.label}</PillLink> : null}
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((service, i) => (
            <article key={service.path} className="flex flex-col gap-6 rounded-lg border border-black/20 p-[22px]">
              <div className="flex items-center gap-4">
                <IconTile>
                  <Asset name={`${ICONS[i % ICONS.length]}.svg`} width={27} height={27} />
                </IconTile>
                <h3 className="font-manrope text-2xl font-semibold leading-8">
                  <Link href={service.path} className="text-deep-blue no-underline">{service.name}</Link>
                </h3>
              </div>
              <hr className="border-black/10" />
              <ul className="flex flex-col gap-3">
                {service.highlights.map((item) => (
                  <li key={item} className="flex gap-2.5 font-inter text-base leading-[1.2] text-black/90">
                    <span aria-hidden="true" className="text-sm text-smash-red">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
