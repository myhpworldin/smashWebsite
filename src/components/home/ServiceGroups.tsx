import Link from "next/link";
import { ROUTES } from "@/lib/routes";
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
        <div data-reveal-group className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((service, i) => (
            <article
              key={service.path}
              className="group relative flex flex-col gap-6 rounded-lg border border-black/20 p-[22px] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-smash-red/40 hover:shadow-[0_12px_30px_-12px_rgba(1,18,74,0.18)]"
            >
              <div className="flex items-center gap-4">
                <IconTile className="transition-transform duration-300 ease-out group-hover:scale-110">
                  <Asset name={`${ICONS[i % ICONS.length]}.svg`} width={27} height={27} />
                </IconTile>
                <h3 className="font-manrope text-2xl font-semibold leading-8">
                  {/* Goes to the category's own section on the Services page (not a /services/<slug> route — that
                      page is the catalogue for a category, this card is just a shortcut into it) — `after:inset-0`
                      stretches the link over the whole card, matching ServicesCatalogue's own card-link pattern.
                      A query param, not a `#hash`: a raw hash makes the browser/Next jump there instantly before
                      any of our JS runs, which is exactly the "no animation" behaviour being fixed here.
                      `ServicesCatalogue` reads `scrollTo`, so the page lands at the top first, then animates down. */}
                  <Link href={`${ROUTES.SERVICES}?scrollTo=${service.slug}-heading`} className="text-deep-blue no-underline after:absolute after:inset-0 after:content-['']">
                    {service.name}
                  </Link>
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
