import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedCaseStudies } from "@/server/modules/work/work.service";
import { caseStudySummaryDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { pageQuerySchema, pageMeta } from "@/server/api/query";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { MaskLine } from "@/components/about/AboutWords";
import { WorkCaseCard } from "@/components/work/WorkCaseCard";
import { WorkMotion } from "@/components/work/WorkMotion";
import type { CaseStudySummary } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const raw = await searchParams;
  const parsed = pageQuerySchema.safeParse({ page: raw.page, limit: raw.limit });
  return staticPageMetadata(ROUTES.WORK, parsed.success ? parsed.data.page : undefined);
}

/**
 * Our Work, redesigned in the language of About and Contact: the SheetHero (mist, words rising out of masks) with a white
 * sheet sliding over it, an intro that sets out how each project is told, then the case studies as large deep-blue cards
 * (photo that opens as it scrolls in, the headline result counting up). Everything about a project comes from the same `listPublishedCaseStudies` source
 * as before; the page copy around it is fixed. It shows outcomes only — never a client's private data (see WorkCaseCard).
 */
export default async function WorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  // Malformed/out-of-range values fall back to page 1 rather than erroring a listing page (unlike the strict API, which 422s).
  const parsed = pageQuerySchema.safeParse({ page: raw.page, limit: raw.limit });
  const page = parsed.success ? parsed.data : { page: 1, limit: 12 };

  const { items, total } = await listPublishedCaseStudies(getDb(), page);
  const caseStudies = publicizeMedia(items.map(caseStudySummaryDto), []) as CaseStudySummary[];
  const meta = pageMeta(total, page.page, page.limit);

  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero
          id="work-heading"
          title="Our Work"
          description="Businesses come to us with a goal. These are the results we reached together, shared with care for the data behind them."
          descriptionWidth="max-w-[760px]"
          image="/media/aboutus-banner.png"
        />

        <section aria-labelledby="work-intro-heading" className={`relative z-10 bg-white pb-20 pt-20 lg:pb-[140px] lg:pt-[130px] ${SHEET}`}>
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-16 px-4 md:px-10 lg:gap-[160px] xl:px-20">
            {/* Same two columns as the cards below (the photo, then the story): the paragraph starts where the story does. */}
            <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[46.25%_1fr] lg:items-end lg:gap-0">
              <div className="flex flex-col gap-4">
                <h2 id="work-intro-heading" className="font-inter text-[32px] font-medium leading-[1.15] text-ink md:text-[44px] md:leading-[54px] lg:text-[54px] lg:leading-[1.2]">
                  <MaskLine as="span">Where they started.</MaskLine>
                  <MaskLine as="span">What we did.</MaskLine>
                  <MaskLine as="span">What it achieved.</MaskLine>
                </h2>
              </div>
              <p data-reveal="fade-up" className="max-w-[760px] font-inter text-xl leading-[1.65] text-black/80 lg:pb-3.5 lg:text-[22.5px] lg:leading-[34px]">
                Every project here is told the same way, from the problem a business brought us to the outcome it saw. We show the achievement, and keep the business&rsquo;s own data private.
              </p>
            </div>

            <div className="flex flex-col gap-10">
              <h2 className="sr-only">Selected work</h2>
              {caseStudies.length ? (
                <>
                  <ul className="flex flex-col gap-8 lg:gap-[72px]">
                    {caseStudies.map((item, i) => <WorkCaseCard key={item.slug} caseStudy={item} index={i} />)}
                  </ul>
                  <Pagination page={meta.page} totalPages={meta.totalPages} basePath={ROUTES.WORK} />
                </>
              ) : (
                <EmptyState message="Selected work is being updated — check back soon." />
              )}
            </div>
          </div>
        </section>
      </div>

      <HomeAnimations />
      <SheetMotion />
      <WorkMotion />
    </>
  );
}

