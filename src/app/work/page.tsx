import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedCaseStudies } from "@/server/modules/work/work.service";
import { caseStudySummaryDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { pageQuerySchema, pageMeta } from "@/server/api/query";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CardGrid } from "@/components/ui/CardGrid";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { CaseStudyCard } from "@/components/content/CaseStudyCard";
import type { CaseStudySummary } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.WORK);
}

export default async function WorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  // Malformed/out-of-range values fall back to page 1 rather than erroring a listing page (unlike the strict API, which 422s).
  const parsed = pageQuerySchema.safeParse({ page: raw.page, limit: raw.limit });
  const page = parsed.success ? parsed.data : { page: 1, limit: 12 };

  const { items, total } = await listPublishedCaseStudies(getDb(), page);
  const caseStudies = publicizeMedia(items.map(caseStudySummaryDto), []) as CaseStudySummary[];
  const meta = pageMeta(total, page.page, page.limit);

  return (
    <Section>
      <Container>
        <h1>Work</h1>
        {caseStudies.length ? (
          <>
            <CardGrid>
              {caseStudies.map((item) => <CaseStudyCard key={item.slug} caseStudy={item} />)}
            </CardGrid>
            <Pagination page={meta.page} totalPages={meta.totalPages} basePath={ROUTES.WORK} />
          </>
        ) : (
          <EmptyState message="No case studies published yet." />
        )}
      </Container>
    </Section>
  );
}
