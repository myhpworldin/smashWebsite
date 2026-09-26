import { Asset, IconTile, SectionHeading, WRAP, type HomeSection } from "./shared";

const ICONS = ["users", "indian-rupee", "map-pin"];

/** Business proof: one card per verified metric (label = the "from" line, value = the highlighted figure). Icons are presentation, by position. */
export function ProofSection({ data, className = "" }: { data: HomeSection<"businessProof">; className?: string }) {
  return (
    <section aria-labelledby="proof-heading" className={className}>
      <div className={WRAP}>
        <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="proof-heading" className="max-w-[819px]" />
        <div className="mt-[50px] grid max-w-[1272px] gap-[30px] md:grid-cols-2 lg:grid-cols-[354fr_380fr_478fr]">
          {data.items.map((card, i) => (
            <article key={`${card.label}-${card.value}`} className="relative flex min-h-[298px] flex-col justify-end gap-2 rounded-2xl border border-black/30 p-[22px]">
              <IconTile className="absolute right-[22px] top-[22px]">
                <Asset name={`${ICONS[i % ICONS.length]}.svg`} width={27} height={27} />
              </IconTile>
              <p className="font-manrope font-semibold">
                <span className="block text-xl leading-8 text-black/90">{card.label}</span>
                <span className="block text-2xl leading-9 text-smash-red">{card.value}</span>
              </p>
              {card.description ? <p className="max-w-[428px] font-inter text-[15px] leading-[22px] text-black/80">{card.description}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
