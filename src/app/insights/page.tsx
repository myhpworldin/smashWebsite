import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedInsights } from "@/server/modules/insights/insights.service";
import { insightSummaryDto } from "@/server/api/serializers";
import { publicizeMedia } from "@/server/media/public";
import { pageQuerySchema, pageMeta } from "@/server/api/query";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { CardGrid } from "@/components/ui/CardGrid";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { InsightCard } from "@/components/content/InsightCard";
import type { InsightSummary } from "@/server/api/serializers";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.INSIGHTS);
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  // Malformed/out-of-range values fall back to page 1 rather than erroring a listing page (unlike the strict API, which 422s). Mirrors /work (Stage 3, Phase 5).
  const parsed = pageQuerySchema.safeParse({ page: raw.page, limit: raw.limit });
  const page = parsed.success ? parsed.data : { page: 1, limit: 12 };

  const { items, total } = await listPublishedInsights(getDb(), page);
  const insights = publicizeMedia(items.map(insightSummaryDto), []) as InsightSummary[];
  const meta = pageMeta(total, page.page, page.limit);

  return (
    <Section>
      <Container>
        <h1>Insights</h1>
        {insights.length ? (
          <>
            <CardGrid>
              {insights.map((item) => <InsightCard key={item.slug} insight={item} />)}
            </CardGrid>
            <Pagination page={meta.page} totalPages={meta.totalPages} basePath={ROUTES.INSIGHTS} />
          </>
        ) : (
          <EmptyState message="No insights published yet." />
        )}
      </Container>
    </Section>
  );
}
