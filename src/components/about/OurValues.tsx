import { WRAP } from "@/components/home/shared";

const VALUES = [
  { title: "Move with speed", description: "We act fast, simplify decisions, and keep momentum ahead of perfect." },
  { title: "Speak with clarity", description: "We cut through complexity with simple language, clear roles, and honest feedback." },
  { title: "Own the outcome", description: "We take accountability from the first idea through launch, measurement, and improvement." },
] as const;

/** "Principles That Survive The Pressure" (Figma node 107:617): three glass cards on a deep-blue gradient band. */
export function OurValues({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="values-heading" className={`bg-[linear-gradient(179deg,var(--brand-deep-blue)_1.5%,#022bb0_143.5%)] text-white ${className}`}>
      <div className={`${WRAP} flex flex-col items-center gap-[60px] py-16 lg:py-[100px]`}>
        <div className="flex max-w-[837px] flex-col items-center gap-4 text-center">
          <p className="font-inter text-sm font-semibold uppercase leading-[normal]">03 / Our Values</p>
          <h2 id="values-heading" className="font-inter text-[32px] font-medium capitalize leading-[1.15] md:text-[42px] md:leading-[54px]">Principles that survive the pressure</h2>
          <p className="font-inter text-xl leading-[1.74]">Practical values that shape how we scope, decide, create, measure and communicate when the work gets complex.</p>
        </div>
        <ul className="grid w-full max-w-[1270px] gap-[30px] md:grid-cols-3">
          {VALUES.map((v, i) => (
            <li key={v.title} className="relative flex min-h-[248px] flex-col justify-end gap-2 rounded-[18px] border border-white/20 bg-white/20 p-6 backdrop-blur-[5px]">
              <span className="absolute right-6 top-[21px] grid size-[60px] place-items-center rounded-2xl border border-black/20 bg-white/40 font-manrope text-2xl font-semibold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-manrope text-2xl font-semibold leading-[1.4]">{v.title}</h3>
              <p className="max-w-[328px] font-inter text-[15px] leading-[22px]">{v.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
