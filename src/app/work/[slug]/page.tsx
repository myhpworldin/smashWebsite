import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound, requirePublishedRoute } from "@/server/seo/page-resolver";
import { caseStudyMetadata } from "@/server/seo/next-metadata";
import { getCaseStudy, getSiteContext } from "@/server/seo/request-cache";
import { caseStudySchemas } from "@/server/seo/page-jsonld";
import { caseStudyDetailDto, caseStudySummaryDto, toPublicSeo, type CaseStudyDetail, type CaseStudySummary } from "@/server/api/serializers";
import { caseStudySource } from "@/server/seo/adapters";
import { resolveMetadata } from "@/server/seo/metadata";
import { publicizeMedia } from "@/server/media/public";
import { getDb } from "@/server/db/client";
import { listPublishedCaseStudies } from "@/server/modules/work/work.service";
import { ROUTES } from "@/lib/routes";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { MaskLine } from "@/components/about/AboutWords";
import { FillImage, WRAP } from "@/components/home/shared";
import { HomeAsset, HomeButton } from "@/components/home/home-ui";
import { CaseStudyViewTracker } from "@/components/analytics/CaseStudyViewTracker";
import { WorkCaseCard } from "@/components/work/WorkCaseCard";
import { WorkMotion } from "@/components/work/WorkMotion";
import { CaseFacts, FlyArrow, ResultValue } from "@/components/work/WorkParts";
import sheet from "@/components/layout/sheet.module.css";
import { publishedSlugParams } from "@/server/seo/public-cache";

// Resolves published content by slug only. Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;
export const generateStaticParams = () => publishedSlugParams("caseStudy");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return caseStudyMetadata((await params).slug);
}

const paragraphs = (text: string | null | undefined) => (text ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);

/**
 * A case study, told the way the Our Work page promises: when they approached us → what we did → what it achieved. The
 * SheetHero in the other inner pages' language (the case study's headline as the title, the line naming the client and campaign
 * under it, then a strip of key facts) with a white sheet over it; the
 * story with the project photo pinned beside it (it opens as it scrolls in) and each step lighting as it passes the middle;
 * the results on a deep-blue sheet, each figure counting up; then the next project.
 * Every word is the case study's own (a step with no copy is simply left out), and nothing private is shown: the client's
 * name, logo, website and description are never rendered — only the project, its story and its figures.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("caseStudy", slug);
  const raw = await orNotFound(() => getCaseStudy(slug));

  // Same composition GET /api/work/:slug uses (public-content.controller.ts) — the page and the API can never disagree.
  const site = await getSiteContext();
  const seo = toPublicSeo(resolveMetadata(site, caseStudySource(raw)));
  const cs = publicizeMedia(caseStudyDetailDto(raw, seo), ["heroImage"]) as CaseStudyDetail;

  // The next project (wrapping round to the first), shown as a card under "More work".
  const { items } = await listPublishedCaseStudies(getDb(), { page: 1, limit: 12 });
  const others = publicizeMedia(items.map(caseStudySummaryDto), []) as CaseStudySummary[];
  const at = others.findIndex((o) => o.slug === slug);
  const next = others.length > 1 ? others[(at + 1) % others.length] : null;

  // The summary's first line is the case study's headline ("Turning offers into 425 customer enquiries."), the rest names the
  // client and the campaign; together they read like the other inner pages' title + intro. A one-line summary keeps the
  // project's name as the title instead.
  const summaryLines = paragraphs(cs.summary);
  const lead = summaryLines[0] ?? cs.summary;
  const heroTitle = summaryLines.length > 1 ? lead.replace(/[.\s]+$/, "") : cs.title;
  const heroIntro = summaryLines.length > 1 ? summaryLines.slice(1).join(" ") : lead;
  const headline = cs.results[0] ?? null;
  const facts = [
    { label: "Client", value: cs.title },
    { label: "Industry", value: cs.industry ?? "" },
    { label: cs.relatedServices.length > 1 ? "Services" : "Service", value: cs.relatedServices.map((s) => s.name).join(" · ") },
    // The result only when the headline does not already say it.
    { label: "Result", value: headline && !heroTitle.includes(headline.value) ? `${headline.value} ${headline.label}` : "" },
  ].filter((f) => f.value);
  const challenge = paragraphs(cs.challenge);
  const strategy = paragraphs(cs.strategy);
  const execution = paragraphs(cs.execution);
  const steps = [
    challenge.length ? { title: "When they approached us", blocks: [{ heading: null, paras: challenge }] } : null,
    strategy.length || execution.length
      ? { title: "What we did", blocks: [strategy.length ? { heading: "Strategy", paras: strategy } : null, execution.length ? { heading: "Execution", paras: execution } : null].filter((b): b is { heading: string; paras: string[] } => !!b) }
      : null,
  ].filter((s): s is NonNullable<typeof s> => !!s);
  const rest = paragraphs(cs.summary).slice(1);

  return (
    <>
      <JsonLd data={await caseStudySchemas(slug)} />
      <CaseStudyViewTracker slug={slug} title={cs.title} industry={cs.industry} />

      <div data-sheet-top data-mist-host className="relative">
        <SheetHero id="case-heading" title={heroTitle} description={heroIntro} descriptionWidth="max-w-[760px]">
          {facts.length ? <CaseFacts facts={facts} /> : null}
        </SheetHero>

        <section aria-labelledby="case-story-heading" className={`relative z-10 bg-white pb-12 pt-20 lg:pb-[80px] lg:pt-[130px] ${SHEET}`}>
          <h2 id="case-story-heading" className="sr-only">The story</h2>
          <div className={`${WRAP} grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-x-[90px]`}>
            <div className="lg:sticky lg:top-[120px] lg:self-start">
              {cs.heroImage ? (
                <div data-work-photo className="relative aspect-[640/448] overflow-hidden rounded-[28px] bg-navy lg:rounded-[40px]">
                  <div data-work-img className="absolute inset-0">
                    <FillImage media={cs.heroImage} sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
                  </div>
                </div>
              ) : null}
              <p data-reveal="fade-up" className="mt-5 max-w-[460px] font-inter text-sm leading-[1.6] text-black/55">
                Shown with care: this page shares what the project achieved, not the client&rsquo;s private data.
              </p>
            </div>

            <div className="flex flex-col gap-16 lg:gap-[100px]">
              {steps.length ? (
                <ol className="flex flex-col gap-16 lg:gap-[100px]">
                  {steps.map((step, i) => (
                    <li key={step.title} data-work-step className="group/step flex flex-col gap-5">
                      <div className="flex items-end gap-5">
                        <span aria-hidden="true" className="select-none font-manrope text-[72px] font-semibold leading-none text-transparent transition-[color] duration-500 [-webkit-text-stroke:1px_rgba(1,18,74,0.3)] group-data-[lit]/step:text-smash-red group-data-[lit]/step:[-webkit-text-stroke:1px_var(--brand-smash-red)] lg:text-[96px]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 data-reveal="fade-up" className="pb-2 font-inter text-[28px] font-medium leading-[1.2] text-ink md:text-[36px]">{step.title}</h3>
                      </div>
                      <div className="flex flex-col gap-6">
                        {step.blocks.map((block, j) => (
                          <div key={j} data-reveal="fade-up" className="flex flex-col gap-3">
                            {block.heading ? <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">{block.heading}</p> : null}
                            {block.paras.map((p, k) => <p key={k} className="font-inter text-xl leading-[1.65] text-black/85">{p}</p>)}
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div data-reveal="fade-up" className="flex flex-col gap-4">
                  <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">About this project</p>
                  {[lead, ...rest].map((p, k) => <p key={k} className="font-inter text-xl leading-[1.65] text-black/85">{p}</p>)}
                </div>
              )}
              {cs.relatedServices.length ? (
                <div data-reveal="fade-up" className="flex flex-col gap-3">
                  <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-black/55">SMASH services involved</p>
                  <ul className="flex flex-wrap gap-x-10 gap-y-3">
                    {cs.relatedServices.map((s) => (
                      <li key={s.slug}>
                        <Link href={s.path} className="no-underline"><FlyArrow tone="dark" className="text-xl">{s.name}</FlyArrow></Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {cs.results.length ? (
        <section aria-labelledby="case-results-heading" className="relative z-20 bg-white pb-8 lg:pb-[40px]">
          <div className={WRAP}>
            {/* The headline result, set as one bold card: the figure very large and counting up, its label and line beside it,
                a growth line drawing itself across the back. Any further results sit below as a quieter row. */}
            <div data-reveal="fade-up" data-work-result data-spot style={{ "--spot": "rgba(120,170,255,0.25)" } as React.CSSProperties} className={`${sheet.spot} relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(160deg,var(--brand-deep-blue)_0%,#022bb0_160%)] text-white lg:rounded-[40px]`}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[520px] -top-[560px] max-w-none opacity-80" />
                <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[40%] w-full opacity-50 lg:opacity-90">
                  <defs>
                    <linearGradient id="result-line" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor="#ffffff" stopOpacity="0.15" />
                      <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.7" />
                      <stop offset="1" stopColor="#ff4552" />
                    </linearGradient>
                  </defs>
                  <path data-work-draw d="M0 196 C60 190 90 156 140 164 S220 116 270 126 S350 76 400 86 S500 34 584 14" fill="none" stroke="url(#result-line)" strokeWidth="2.5" strokeLinecap="round" pathLength={1} />
                </svg>
                {/* The line's end point, a plain element (an SVG circle would be stretched with the line): 97.3% across, 6.4% down the line's box. */}
                <span data-work-dot className="absolute right-[2.7%] top-[62.6%] size-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-smash-red shadow-[0_0_0_8px_rgba(233,1,1,0.25)]" />
              </div>

              <div className="relative grid gap-6 p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-16 lg:p-16">
                <ResultValue value={cs.results[0].value} className="bg-gradient-to-b from-white to-white/65 bg-clip-text font-manrope text-[clamp(104px,17vw,236px)] font-semibold leading-[0.85] text-transparent" />
                <div className="flex max-w-[560px] flex-col gap-4 lg:pb-3">
                  <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-white/70">03 / What it achieved</p>
                  <h2 id="case-results-heading" className="font-inter text-[32px] font-medium leading-[1.15] md:text-[44px]">{cs.results[0].label}</h2>
                  {cs.results[0].description ? <p className="font-inter text-lg leading-[1.6] text-white/85">{cs.results[0].description}</p> : null}
                </div>
              </div>

              {cs.results.length > 1 ? (
                <ul className="relative grid border-t border-white/20 sm:grid-cols-2 lg:grid-cols-3">
                  {cs.results.slice(1).map((r) => (
                    <li key={r.label} className="flex flex-col gap-1 border-b border-white/15 p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:px-10 lg:py-8">
                      <ResultValue value={r.value} className="font-manrope text-[44px] font-semibold leading-none md:text-[56px]" />
                      <p className="font-inter text-lg text-white/85">{r.label}</p>
                      {r.description ? <p className="font-inter text-sm leading-[1.5] text-white/65">{r.description}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {cs.testimonial ? (
        <section aria-label="What the client said" className="bg-white py-16 lg:py-[100px]">
          <figure data-reveal="fade-up" className={`${WRAP} mx-auto flex max-w-[1000px] flex-col items-center gap-6 text-center`}>
            <blockquote className="font-inter text-2xl font-medium leading-[1.4] text-ink md:text-[34px]">&ldquo;{cs.testimonial.quote}&rdquo;</blockquote>
            <figcaption className="font-inter text-base text-black/65">
              {cs.testimonial.personName}
              {cs.testimonial.personRole ? `, ${cs.testimonial.personRole}` : ""}
              {cs.testimonial.companyName ? `, ${cs.testimonial.companyName}` : ""}
            </figcaption>
          </figure>
        </section>
      ) : null}

      <section aria-labelledby="case-more-heading" className={`relative z-30 bg-white pb-20 pt-20 lg:pb-[120px] lg:pt-[120px]`}>
        <div className={`${WRAP} flex flex-col gap-10`}>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <h2 id="case-more-heading" className="font-inter text-[32px] font-medium leading-[1.15] text-ink md:text-[44px] md:leading-[54px]">
              <MaskLine as="span">{next ? "More work" : "Explore our work"}</MaskLine>
            </h2>
            <div data-reveal="fade-up"><HomeButton href={ROUTES.WORK} tone="red" arrow>All our work</HomeButton></div>
          </div>
          {next ? <ul><WorkCaseCard caseStudy={next} index={0} /></ul> : null}
        </div>
      </section>

      <HomeAnimations />
      <SheetMotion />
      <WorkMotion />
    </>
  );
}
