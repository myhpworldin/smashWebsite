import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { orNotFound, requirePublishedRoute } from "@/server/seo/page-resolver";
import { careerMetadata } from "@/server/seo/next-metadata";
import { getCareer } from "@/server/seo/request-cache";
import { careerSchemas } from "@/server/seo/page-jsonld";
import { CAREER_WORK_MODE_LABEL } from "@/lib/career-options";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { WRAP } from "@/components/home/shared";
import { CareersCta } from "@/components/careers/CareersParts";
import { getSiteSettings } from "@/server/seo/request-cache";
import { WorkMotion } from "@/components/work/WorkMotion";
import { publishedSlugParams } from "@/server/seo/public-cache";

// Resolves published content by slug only. Cached and regenerated; see src/server/seo/public-cache.ts.
export const revalidate = 3600;
export const generateStaticParams = () => publishedSlugParams("career");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return careerMetadata((await params).slug);
}

const PILL = "inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-2 font-inter text-sm leading-[normal] text-white/90 backdrop-blur-[2px]";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, i) => (
        <li key={i} className="relative pl-7 font-inter text-xl leading-[1.6] text-black/85 before:absolute before:left-0 before:top-[0.85em] before:h-px before:w-4 before:bg-smash-red">{item}</li>
      ))}
    </ul>
  );
}

/**
 * One role, in the Careers page's language: the SheetHero with the role's facts as pills, a white sheet with the role's
 * description, responsibilities and requirements (each only if it has any), and a closing "apply" card. There is no
 * application/ATS backend (out of scope — CRM is paused, and no such model exists), so "Apply" honestly routes to the one real
 * public enquiry channel (/contact) rather than a fabricated application flow.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePublishedRoute("career", slug);
  const career = await orNotFound(() => getCareer(slug));
  const settings = await getSiteSettings().catch(() => null);
  const facts = [career.department, career.workMode ? CAREER_WORK_MODE_LABEL[career.workMode] : null, career.employmentType, career.location].filter((f): f is string => !!f);
  const sections = [
    career.description ? { id: "role-description-heading", title: "About the role", body: <p className="font-inter text-xl leading-[1.65] text-black/85">{career.description}</p> } : null,
    career.responsibilities.length ? { id: "role-responsibilities-heading", title: "Responsibilities", body: <Bullets items={career.responsibilities} /> } : null,
    career.requirements.length ? { id: "role-requirements-heading", title: "Requirements", body: <Bullets items={career.requirements} /> } : null,
  ].filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <>
      <JsonLd data={await careerSchemas(slug)} />
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero id="role-heading" title={career.title} description={career.summary} descriptionWidth="max-w-[760px]">
          {facts.length ? (
            <ul className="flex flex-wrap items-center justify-center gap-3">
              {facts.map((f) => <li key={f} className={PILL}>{f}</li>)}
            </ul>
          ) : null}
        </SheetHero>

        {sections.length ? (
          <section aria-label="About this role" className={`relative z-10 bg-white pb-16 pt-20 lg:pb-[100px] lg:pt-[130px] ${SHEET}`}>
            <div className={`${WRAP} mx-auto flex max-w-[960px] flex-col gap-16 lg:gap-[88px]`}>
              {sections.map((s) => (
                <div key={s.id} data-reveal="fade-up" className="flex flex-col gap-6">
                  <h2 id={s.id} className="font-inter text-[28px] font-medium leading-[1.2] text-ink md:text-[36px]">{s.title}</h2>
                  {s.body}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <CareersCta email={settings?.contact?.email} heading="Interested in this role?" text="Tell us about something you built and what you would do differently now." button="Apply — contact us" />

      <HomeAnimations />
      <SheetMotion />
      <WorkMotion />
    </>
  );
}
