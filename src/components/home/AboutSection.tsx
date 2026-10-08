import { HOME_WRAP } from "./home-ui";
import type { HomeSection } from "./shared";

/**
 * The figure's black→red gradient, as Figma draws it: black until ~0.4em in, full SMASH red by ~2.65em (or 90% of a
 * shorter figure such as "400+"), so the red always lands on the figure's last characters. The design sets a
 * leading rupee sign smaller (56px) than the figure that follows it (74px).
 */
function StatValue({ value }: { value: string }) {
  const rupee = value.startsWith("₹");
  return (
    <p className="inline-block bg-[linear-gradient(90deg,#000_0.4em,var(--brand-smash-red)_min(2.65em,90%))] bg-clip-text text-[52px] leading-[1.05] text-transparent lg:text-[74px]">
      {rupee ? <span className="text-[40px] lg:text-[56px]">₹</span> : null}
      {rupee ? value.slice(1) : value}
    </p>
  );
}

/**
 * "About" (Figma New Homepage, y 800–1710): the faded ABOUT watermark beside the CMS statement, then the three
 * growth stories from `businessProof` — "from" label, the figure (black→red gradient), its unit (`context`) and
 * the story. The watermark is decoration only; the statement is the section's heading.
 */
export function AboutSection({ data }: { data: HomeSection<"businessProof"> }) {
  return (
    <section aria-labelledby="about-heading" data-home-section="about" className={`relative isolate overflow-hidden pb-20 pt-20 text-main-black lg:pb-[130px] lg:pt-[150px]`}>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[316px] bg-[linear-gradient(180deg,#fff_0%,#f3f3f3_84.18%)]" />
      <div className={HOME_WRAP}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <p aria-hidden="true" className={`shrink-0 text-[96px] font-bold leading-[0.6] text-black/5 md:text-[140px] xl:text-[198px]`}>ABOUT</p>
          {data.heading ? (
            <h2 id="about-heading" className="max-w-[563px] text-[28px] leading-[1.3] md:text-[37px] lg:mt-[55px]">{data.heading}</h2>
          ) : null}
        </div>
        <ul className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8 lg:mt-[120px] xl:gap-[118px]">
          {data.items.map((item) => (
            <li key={item.order} className="flex max-w-[348px] flex-col gap-6">
              <div className="flex flex-col gap-4">
                {item.label ? <p className="text-2xl leading-normal opacity-70 lg:text-[28px]">{item.label}</p> : null}
                <div className="flex flex-col gap-2">
                  <StatValue value={item.value} />
                  {item.context ? <p className="text-xl leading-[1.25] lg:text-2xl">{item.context}</p> : null}
                </div>
              </div>
              {item.description ? <p className="text-base leading-[1.65] opacity-70">{item.description}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
