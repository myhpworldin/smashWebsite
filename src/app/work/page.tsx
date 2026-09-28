import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedCaseStudies } from "@/server/modules/work/work.service";
import { caseStudySummaryDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { pageQuerySchema, pageMeta } from "@/server/api/query";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { PageHero } from "@/components/layout/PageHero";
import { PillLink, WRAP } from "@/components/home/shared";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { CaseStudyCard } from "@/components/content/CaseStudyCard";
import type { CaseStudySummary } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.WORK);
}

/**
 * Our Works listing (Phase 2): the same PageHero/WRAP/PillLink language every other page uses, no new
 * visual system. Copy in the hero/intro/CTA is fixed page copy (like Careers' "Why Smash" reasons) — there's
 * no CMS model for it — everything below the intro (title, summary, services, image) comes from the same
 * `listPublishedCaseStudies` source the old page used; nothing here duplicates or forks that data.
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
      <PageHero
        id="work-heading"
        title="Real Work. Real Businesses. Real Growth."
        description="A selection of SMASH projects across growth, performance marketing, social &amp; creative, technology and customer engagement — real work for real businesses."
        descriptionWidth="max-w-[760px]"
      >
        <PillLink href={ROUTES.CONTACT} tone="red" arrow="white">Let&rsquo;s Work Together</PillLink>
      </PageHero>

      <section aria-label="About our work" className={`${WRAP} py-16 lg:py-[100px]`}>
        <p className="mx-auto max-w-[820px] text-center font-inter text-xl leading-[1.65] text-black/90">
          From strategy and creative to performance, technology and customer engagement, our work is built around
          solving real business challenges — the same growth engine that runs across every SMASH service.
        </p>
      </section>

      <section aria-labelledby="work-grid-heading" className={`${WRAP} pb-16 lg:pb-[120px]`}>
        <h2 id="work-grid-heading" className="sr-only">Selected work</h2>
        {caseStudies.length ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
              {caseStudies.map((item) => <CaseStudyCard key={item.slug} caseStudy={item} />)}
            </div>
            <div className="mt-10">
              <Pagination page={meta.page} totalPages={meta.totalPages} basePath={ROUTES.WORK} />
            </div>
          </>
        ) : (
          <EmptyState message="Selected work is being updated — check back soon." />
        )}
      </section>

      <section aria-labelledby="work-cta-heading" className={`${WRAP} pb-16 lg:pb-20`}>
        <div className="flex flex-col justify-between gap-8 rounded-[30px] border border-black/30 bg-white px-6 py-10 shadow-[0_4px_10px_rgba(0,0,0,0.02)] lg:flex-row lg:items-center lg:gap-[114px] lg:px-10 lg:py-[49px]">
          <div className="flex max-w-[920px] flex-col gap-[7px]">
            <h2 id="work-cta-heading" className="font-inter text-2xl font-medium leading-[1.4] text-black md:text-[32px] md:leading-[53px]">Have a business challenge?</h2>
            <p className="font-inter text-xl leading-[30px] text-black/90">Let&rsquo;s build what comes next.</p>
          </div>
          <PillLink href={ROUTES.CONTACT} tone="red" arrow="white" className="shrink-0 self-start lg:self-center">Get Started</PillLink>
        </div>
      </section>
    </>
  );
}
