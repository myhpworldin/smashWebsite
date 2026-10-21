import type { ServiceDetail } from "@/server/api/serializers";
import { SheetHero } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { ServiceHeroField } from "./ServiceHeroField";
import { ServiceMotion } from "./ServiceMotion";
import { ServiceIntro, ServiceCapabilities, ServiceProcess, ServiceTools, ServiceRelated, ServiceCases } from "./ServiceSections";
import { ServiceFaq } from "./ServiceFaq";

/** The CMS marks copy that has not been written yet with "[SAMPLE]"; it is never shown. */
const real = (text: string | null | undefined) => (text && !text.trimStart().startsWith("[SAMPLE]") ? text : null);

/**
 * A service category page's body (`/services/growth`) — shared by the public page and its draft preview, so an editor
 * sees exactly what visitors will. The dark hero with the Three.js point field, then sheets sliding over one another:
 * the deliverables as cards (`href` makes one a link to its own page), its introduction (`description`), then whichever of the problem / solution /
 * process / tools / results / insights / FAQ the service actually has — a section with nothing to show is
 * skipped, never faked.
 */
export function ServiceCategoryView({ service, cards }: { service: ServiceDetail; cards: (ServiceDetail["deliverables"][number] & { href?: string | null })[] }) {
  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        {/* Every indexable page needs exactly one H1: the hero's `heading` is optional content, `name` is not. */}
        <SheetHero
          id="service-heading"
          title={service.hero?.heading ?? service.name}
          description={service.hero?.supportingText ?? real(service.shortDescription)}
          backdrop={<ServiceHeroField />}
        />
        {cards.length ? <ServiceCapabilities data={{ heading: "What We Deliver", items: cards }} headingId="deliverables-heading" first /> : null}
      </div>
      {/* The category's introduction: what it is for and what it changes for a business, in a few paragraphs. */}
      <ServiceIntro data={real(service.description) ? { eyebrow: null, heading: `Why ${service.name} Matters`, description: real(service.description), visual: null } : null} headingId="overview-heading" tone="grey" />
      <ServiceIntro data={service.problem ? { eyebrow: null, heading: "The Business Problem", description: service.problem.description ?? service.problem.title, visual: null } : null} headingId="problem-heading" tone="grey" />
      <ServiceIntro data={service.solution ? { eyebrow: null, heading: "How SMASH Solves It", description: service.solution.description ?? service.solution.title, visual: null } : null} headingId="solution-heading" />
      <ServiceProcess data={service.process.length ? { heading: "Our Process", stages: service.process } : null} headingId="process-heading" />
      <ServiceTools items={service.tools} headingId="tools-heading" />
      <ServiceCases items={service.relatedCaseStudies} headingId="results-heading" />
      <ServiceRelated heading="Related Insights" headingId="related-insights-heading" items={service.relatedInsights.map((i) => ({ title: i.title, slug: i.slug, path: i.path }))} />
      <ServiceFaq items={service.faqs} headingId="faq-heading" />
      <SheetMotion />
      <ServiceMotion />
    </>
  );
}
