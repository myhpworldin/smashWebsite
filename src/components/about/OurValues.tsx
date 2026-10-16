import { WRAP } from "@/components/home/shared";
import { HomeAsset } from "@/components/home/home-ui";
import styles from "@/components/layout/sheet.module.css";

const VALUES = [
  { title: "Move with speed", description: "We act fast, simplify decisions, and keep momentum ahead of perfect." },
  { title: "Speak with clarity", description: "We cut through complexity with simple language, clear roles, and honest feedback." },
  { title: "Own the outcome", description: "We take accountability from the first idea through launch, measurement, and improvement." },
] as const;

/**
 * "Principles That Survive The Pressure" (Figma node 107:617): three glass cards on a deep-blue gradient band. The
 * band is now a sheet over the dark Mission/Vision one, with Home's manifesto glow in its corner. The cards rise in
 * on a scrub (as Home's case-study cards do), a light follows the pointer across each, and each card's number is
 * drawn as a large outline that fills as the card is hovered.
 */
export function OurValues({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="values-heading" data-values className={`relative isolate overflow-hidden bg-[linear-gradient(179deg,var(--brand-deep-blue)_1.5%,#022bb0_143.5%)] text-white ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[480px] -top-[520px] max-w-none opacity-70" />
      </div>
      <div className={`${WRAP} flex flex-col items-center gap-[60px] py-20 lg:py-[130px]`}>
        <div data-reveal="fade-up" className="flex max-w-[837px] flex-col items-center gap-4 text-center">
          <p className="font-inter text-sm font-semibold uppercase leading-[normal]">03 / Our Values</p>
          <h2 id="values-heading" className="font-inter text-[32px] font-medium capitalize leading-[1.15] md:text-[42px] md:leading-[54px]">Principles that survive the pressure</h2>
          <p className="font-inter text-xl leading-[1.74]">Practical values that shape how we scope, decide, create, measure and communicate when the work gets complex.</p>
        </div>
        <ul className="grid w-full max-w-[1270px] gap-[30px] md:grid-cols-3">
          {VALUES.map((v, i) => (
            <li key={v.title} data-values-card data-spot style={{ "--spot": "rgba(120,170,255,0.28)" } as React.CSSProperties} className={`${styles.spot} group relative flex min-h-[280px] flex-col justify-end gap-2 overflow-hidden rounded-[18px] border border-white/20 bg-white/[0.14] p-6 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-white/45 lg:min-h-[340px]`}>
              <span aria-hidden="true" className="absolute right-6 top-4 select-none font-manrope text-[84px] font-semibold leading-none text-transparent transition-[color] duration-500 [-webkit-text-stroke:1px_rgba(255,255,255,0.55)] group-hover:text-white/20 lg:text-[104px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-manrope text-2xl font-semibold leading-[1.4]">{v.title}</h3>
              <p className="max-w-[328px] font-inter text-[15px] leading-[22px]">{v.description}</p>
              <span aria-hidden="true" className="mt-3 h-px w-10 bg-smash-red transition-[width] duration-500 ease-out group-hover:w-24" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
