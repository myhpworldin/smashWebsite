import { SectionHeading, type HomeSection } from "./shared";

/** The design lays the sector chips out in rows of five. */
const PER_ROW = 5;

/** "Sectors We Scale": centered rows of sector chips. */
export function Industries({ data, className = "" }: { data: HomeSection<"industries">; className?: string }) {
  const rows = Array.from({ length: Math.ceil(data.items.length / PER_ROW) }, (_, r) => data.items.slice(r * PER_ROW, (r + 1) * PER_ROW));
  return (
    <section aria-labelledby="industries-heading" className={`bg-[rgba(217,217,217,0.2)] ${className}`}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-[50px] px-4 py-16 md:px-10 lg:px-[82px] lg:py-[100px]">
        <SectionHeading eyebrow={data.eyebrow} heading={data.heading} id="industries-heading" align="center" />
        <div className="flex flex-col items-center gap-[30px]">
          {rows.map((row, r) => (
            <ul key={r} data-reveal-group className="flex flex-wrap justify-center gap-[30px] lg:flex-nowrap">
              {row.map(({ name }) => (
                <li key={name} className="flex h-[76px] shrink-0 items-center whitespace-nowrap rounded-[18px] border border-black/20 bg-white px-[30px] font-manrope text-2xl font-semibold leading-[1.4] text-deep-blue">
                  {name}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
