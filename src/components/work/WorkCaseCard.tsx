import Link from "next/link";
import type { CaseStudySummary } from "@/server/api/serializers";
import { FillImage } from "@/components/home/shared";
import { HomeAsset } from "@/components/home/home-ui";
import { Chips, FlyArrow, ResultValue } from "./WorkParts";

/**
 * One case study on the Our Work page: a deep-blue sheet card in Home's language (the glow, rounded corners), the photo on
 * one side — it unmasks and settles on scroll (WorkMotion) — and the story on the other: the industry, the title, the
 * summary, the headline result as a large figure that counts up, the SMASH services involved and a link. Sides alternate
 * down the page. Everything comes from the case study; a field it does not have is simply not shown. The client's own
 * name, logo and website are deliberately never rendered here — the title is the project's name, nothing more.
 */
export function WorkCaseCard({ caseStudy, index }: { caseStudy: CaseStudySummary; index: number }) {
  const flip = index % 2 === 1;
  const lines = caseStudy.summary.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return (
    <li data-work-card className="group relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,var(--brand-deep-blue)_0%,#022bb0_160%)] text-white lg:rounded-[40px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className={`absolute max-w-none opacity-60 ${flip ? "-left-[560px] -top-[560px]" : "-right-[560px] -top-[560px]"}`} />
      </div>
      <div className="grid lg:grid-cols-2">
        <div data-work-photo className={`relative aspect-[640/448] overflow-hidden bg-navy lg:aspect-auto lg:min-h-[540px] ${flip ? "lg:order-2" : ""}`}>
          {caseStudy.image ? (
            <div data-work-img className="absolute inset-0">
              <FillImage media={caseStudy.image} sizes="(min-width: 1440px) 640px, (min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(1,18,74,0.55),transparent_55%)]" />
        </div>

        <div className="relative flex flex-col justify-center gap-6 p-7 lg:p-14">
          <div data-work-rise className="flex flex-col gap-4">
            {caseStudy.industry ? <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-white/70">{caseStudy.industry}</p> : null}
            <h3 className="font-manrope text-[32px] font-semibold leading-[1.2] md:text-[44px]">{caseStudy.title}</h3>
            {lines.map((line, i) => <p key={i} className={`font-inter leading-[1.6] ${i === 0 ? "text-lg text-white/90 md:text-xl" : "text-base text-white/75"}`}>{line}</p>)}
          </div>

          {caseStudy.keyResult ? (
            <div data-work-rise className="flex flex-col gap-1 border-t border-white/20 pt-6">
              <ResultValue value={caseStudy.keyResult.value} className="font-manrope text-[64px] font-semibold leading-none md:text-[88px]" />
              <p className="font-inter text-lg text-white/80">{caseStudy.keyResult.label}</p>
            </div>
          ) : null}

          {caseStudy.services.length ? <div data-work-rise><Chips items={caseStudy.services} /></div> : null}

          <p data-work-rise className="mt-1">
            <FlyArrow>View case study</FlyArrow>
          </p>
        </div>
      </div>
      {/* The whole card is the link, above everything else, named by the title. */}
      <Link href={caseStudy.path} aria-label={`View case study: ${caseStudy.title}`} className="group absolute inset-0 z-10 rounded-[inherit] outline-offset-4 focus-visible:outline-2 focus-visible:outline-white" />
    </li>
  );
}
