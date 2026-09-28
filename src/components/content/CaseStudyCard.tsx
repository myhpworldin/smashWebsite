import Link from "next/link";
import type { CaseStudySummary } from "@/server/api/serializers";
import { Asset, FillImage } from "@/components/home/shared";

/**
 * Work listing card (Figma-matched, same dark-image-card language as Home's "Case Studies" section:
 * aspect-[640/448], bg-navy, bottom gradient scrim, glass arrow). Extended with the fields a listing card
 * needs that Home's compact card doesn't show — industry and linked services — both rendered only when the
 * case study actually has them (never invented; see `caseStudySummaryDto`).
 */
export function CaseStudyCard({ caseStudy }: { caseStudy: CaseStudySummary }) {
  return (
    <Link
      href={caseStudy.path}
      aria-label={`View case study: ${caseStudy.title}`}
      className="group relative isolate flex aspect-[640/448] flex-col justify-end overflow-hidden rounded-[18px] bg-navy text-white no-underline outline-offset-4 transition-shadow duration-300 hover:shadow-[0_20px_48px_rgba(1,18,74,0.28)] focus-visible:outline-2 focus-visible:outline-bright-blue"
    >
      {caseStudy.image ? (
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <div className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.06]">
            <FillImage media={caseStudy.image} sizes="(min-width: 1440px) 640px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      ) : null}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[72%] bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.9)_82.143%)]" />

      {/* Glass arrow, same artwork/positioning as Home's Case Studies cards. */}
      <span aria-hidden="true" className="absolute right-[22px] top-[22px] size-[60px]">
        <Asset name="arrow-card.svg" width={500} height={500} className="pointer-events-none absolute left-[-220px] top-[-216px] max-w-none" />
      </span>

      <div className="relative flex max-w-[502px] flex-col gap-3 p-[22px]">
        {caseStudy.industry ? <p className="font-inter text-xs font-semibold uppercase tracking-wide text-white/70">{caseStudy.industry}</p> : null}
        <h3 className="font-manrope text-[22px] font-semibold leading-[1.4] md:text-[26px]">{caseStudy.title}</h3>
        <p className="font-inter text-[15px] leading-[22px] text-white/90">{caseStudy.summary}</p>
        {caseStudy.services.length ? <p className="font-inter text-xs font-medium uppercase tracking-wide text-white/70">{caseStudy.services.join(" • ")}</p> : null}
        <span className="mt-1 inline-flex items-center gap-2 font-manrope text-sm font-semibold">
          View Case Study
          <Asset name="arrow-1.svg" width={16} height={10} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
