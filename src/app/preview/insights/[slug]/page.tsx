import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requirePreviewAccess } from "@/server/api/preview";
import { getPublishedInsightBySlug, listPublishedInsights } from "@/server/modules/insights/insights.service";
import { getSiteContext } from "@/server/seo/request-cache";
import { insightDetailDto, toPublicSeo, type InsightDetail } from "@/server/api/serializers";
import { insightSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { ROUTES } from "@/lib/routes";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import { InsightHeader } from "@/components/sections/InsightHeader";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

/** Draft preview of `/insights/[slug]` — see `preview/services/[slug]/page.tsx` for the mechanism. */
export default async function InsightPreviewPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ slug }, { token }] = await Promise.all([params, searchParams]);
  requirePreviewAccess(token);

  const raw = await getPublishedInsightBySlug(getDb(), slug, { includeDrafts: true });
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, insightSource(raw)));
  const insight = publicizeMedia(insightDetailDto(raw, seo), ["image"]) as InsightDetail;

  const related = insight.category
    ? (await listPublishedInsights(getDb(), { category: insight.category, limit: 4 })).items
        .filter((i) => i.slug !== slug)
        .slice(0, 3)
        .map((i) => ({ title: i.title, slug: i.slug, path: ROUTES.INSIGHT(i.slug), description: i.excerpt }))
    : [];

  return (
    <>
      <PreviewBanner />
      <InsightHeader insight={insight} />
      <Section>
        <Container>
          <MarkdownContent content={insight.content} />
        </Container>
      </Section>
      <RelatedContentSection
        heading="Related Services"
        headingId="related-services-heading"
        items={insight.relatedServices.map((s) => ({ title: s.name, slug: s.slug, path: s.path }))}
        sourceType="insight"
      />
      <RelatedContentSection
        heading="Related Case Studies"
        headingId="related-case-studies-heading"
        items={insight.relatedCaseStudies.map((c) => ({ title: c.title, slug: c.slug, path: c.path }))}
        sourceType="insight"
      />
      <RelatedContentSection heading="Related Insights" headingId="related-insights-heading" items={related} sourceType="insight" />
    </>
  );
}
