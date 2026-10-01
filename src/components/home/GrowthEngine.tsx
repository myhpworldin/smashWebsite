import { Asset, WRAP, type HomeSection } from "./shared";

/** "The SMASH Growth Engine": six frosted step cards on the deep-blue band (3 + 3, the second row mirrored as designed). */
export function GrowthEngine({ data, className = "" }: { data: HomeSection<"growthEngine">; className?: string }) {
  const rows = [data.steps.slice(0, 3), data.steps.slice(3)];
  const columns = ["lg:grid-cols-[354fr_380fr_478fr]", "lg:grid-cols-[478fr_380fr_354fr]"];
  return (
    <section aria-labelledby="growth-engine-heading" className={`bg-[linear-gradient(89deg,var(--brand-deep-blue),#1e40af)] text-white ${className}`}>
      <div className={`${WRAP} py-16 lg:py-[100px]`}>
        <div data-reveal="fade-up" className="mx-auto flex max-w-[837px] flex-col items-center gap-4 text-center">
          {data.eyebrow ? <p className="font-inter text-sm font-semibold uppercase">{data.eyebrow}</p> : null}
          {data.heading ? <h2 id="growth-engine-heading" className="font-inter text-[32px] font-medium capitalize leading-[1.15] md:text-[42px] md:leading-[54px]">{data.heading}</h2> : null}
          {data.description ? <p className="font-inter text-xl leading-9">{data.description}</p> : null}
        </div>
        <ol className="mx-auto mt-[60px] flex max-w-[1272px] flex-col gap-[30px]">
          {rows.map((row, r) => (
            <li key={r} className="contents">
              <ol data-reveal-group className={`grid gap-[30px] md:grid-cols-2 ${columns[r]}`}>
                {row.map((step, i) => {
                  const n = r * 3 + i + 1;
                  return (
                    <li
                      key={`${step.order}-${step.title}`}
                      className="relative flex min-h-[298px] flex-col justify-end gap-2 rounded-2xl border border-white/20 bg-white/20 p-6 backdrop-blur-[5px] transition-[transform,background-color] duration-300 ease-out hover:-translate-y-1 hover:bg-white/25"
                    >
                      <Asset name="layers.svg" width={102} height={70} className="absolute left-[30px] top-[30px]" />
                      <span className="absolute right-[22px] top-[22px] grid size-[60px] place-items-center rounded-2xl border border-black/20 bg-white/40 font-manrope text-2xl font-semibold">
                        {String(n).padStart(2, "0")}
                      </span>
                      <h3 className="font-manrope text-2xl font-semibold leading-9">{step.title}</h3>
                      {step.description ? <p className="max-w-[416px] font-inter text-[15px] leading-[22px]">{step.description}</p> : null}
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
