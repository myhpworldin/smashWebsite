import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound, requirePublishedRoute } from "@/server/seo/page-resolver";
import { insightMetadata } from "@/server/seo/next-metadata";
import { getInsight, getSiteContext } from "@/server/seo/request-cache";
import { insightSchemas } from "@/server/seo/page-jsonld";
import { insightDetailDto, toPublicSeo, type InsightDetail } from "@/server/api/serializers";
import { insightSource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { buildBreadcrumbs } from "@/server/seo/breadcrumbs";
import { getDb } from "@/server/db/client";
import { listPublishedInsights } from "@/server/modules/insights/insights.service";
import { ROUTES } from "@/lib/routes";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { InsightHeader } from "@/components/sections/InsightHeader";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { RelatedContentSection } from "@/components/sections/RelatedContentSection";
import { InsightViewTracker } from "@/components/analytics/InsightViewTracker";

// Resolves published content by slug only.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return insightMetadata((await params).slug);
}

/**
 * Other published insights sharing this one's `category` — the only
 * insight-to-insight relationship the content model actually has (there is no
 * `insight_insights` link table, unlike `insight_services`/`insight_case_studies`
 * in `schema.ts`). Not fabricated: `category` is a real editorial field, and
 * this mirrors how `listPublishedInsights` already supports filtering by it.
 * Renders nothing when there's no category or no other article shares it.
 */
async function relatedInsights(category: string | null, excludeSlug: string) {
  if (!category) return [];
  const { items } = await listPublishedInsights(getDb(), { category, limit: 4 });
  return items.filter((i) => i.slug !== excludeSlug).slice(0, 3).map((i) => ({ title: i.title, slug: i.slug, path: ROUTES.INSIGHT(i.slug), description: i.excerpt }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("insight", slug);
  const raw = await orNotFound(() => getInsight(slug));

  // Same composition GET /api/insights/:slug uses (public-content.controller.ts) — the page and the API can never disagree.
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, insightSource(raw)));
  const insight = publicizeMedia(insightDetailDto(raw, seo), ["image"]) as InsightDetail;

  const crumbs = buildBreadcrumbs(ROUTES.INSIGHT(slug), insight.title);
  const related = await relatedInsights(insight.category, slug);

  return (
    <>
      <JsonLd data={await insightSchemas(slug)} />
      <InsightViewTracker slug={slug} title={insight.title} category={insight.category} />
      <Container><Breadcrumbs crumbs={crumbs} /></Container>
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
      {/* Every article links back to the full listing, matching the case study page's fixed navigational CTA (PAGE_CONTENT_BLUEPRINT.md §3). */}
      <Section spacing="tight">
        <Container><Button href={ROUTES.INSIGHTS} variant="secondary">Explore More Insights</Button></Container>
      </Section>
    </>
  );
}
