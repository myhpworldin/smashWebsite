import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { listPublishedCareers } from "@/server/modules/careers/careers.service";
import { careerSummaryDto } from "@/server/api/serializers";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { HomeAnimations } from "@/components/home/HomeAnimations";
import { AboutMotion } from "@/components/about/AboutMotion";
import { MaskLine } from "@/components/about/AboutWords";
import { Culture } from "@/components/about/Culture";
import { Asset, WRAP } from "@/components/home/shared";
import { HomeButton } from "@/components/home/home-ui";
import { NoOpenRoles, OpenRoles } from "@/components/careers/CareersParts";
import { WorkMotion } from "@/components/work/WorkMotion";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.CAREERS);
}

/** The reasons block is approved page copy from the Figma design (there is no CMS model for it); the roles are CMS content. */
const REASONS = [
  { icon: "careers-trending-up.svg", title: "Hands-On Growth", text: "Grow through real ownership, mentorship, and continuous learning." },
  { icon: "careers-brush.svg", title: "Creative Freedom", text: "We value innovation and give you the space to experiment and iterate creative boundaries." },
  { icon: "careers-award.svg", title: "Impactful Work", text: "Your contributions directly drive measurable results for brands across industries, from ambitious startups to global enterprises." },
] as const;

/**
 * Careers, redesigned in the language of About and Contact: the SheetHero (mist, words rising out of masks) with one button (to the
 * roles when some are open, otherwise to introduce yourself) and a white sheet sliding over it with "Why SMASH"; the team's culture
 * (About's section); then the roles band, which has two states: a clear "No open roles right now" with what to send us when
 * nothing is published, or each published role as a card. Roles come from
 * `listPublishedCareers`, the same list `GET /api/careers` serves; Apply goes to /contact (no application backend exists).
 * No page-level schema: JobPosting needs fields the Career model does not carry (PAGE_SPECIFICATIONS.md §12).
 */
export default async function CareersPage() {
  const roles = (await listPublishedCareers(getDb())).map(careerSummaryDto);
  const open = roles.length > 0;

  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero
          id="careers-heading"
          title="Join the team"
          description="At SMASH, we don't just build brands - we build careers. Join a team of strategists, creators, and growth hackers shaping the future of digital marketing."
          descriptionWidth="max-w-[760px]"
          image="/media/about-team-collaboration.jpg"
        >
          <HomeButton href={open ? "#open-roles" : ROUTES.CONTACT} tone="red" arrow>{open ? "Explore open roles" : "Introduce yourself"}</HomeButton>
        </SheetHero>

        <section aria-labelledby="why-heading" className={`relative z-10 bg-white pb-20 pt-20 lg:pb-[100px] lg:pt-[130px] ${SHEET}`}>
          <div className={`${WRAP} flex flex-col gap-14 lg:gap-[72px]`}>
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end lg:gap-16">
              <div className="flex max-w-[560px] flex-col gap-4">
                <h2 id="why-heading" className="font-inter text-[32px] font-medium leading-[1.15] text-ink md:text-[44px] md:leading-[54px]">
                  <MaskLine as="span">Why Build Your Career</MaskLine>
                  <MaskLine as="span">at <span className="text-deep-blue">SMASH</span></MaskLine>
                </h2>
              </div>
              <p data-reveal="fade-up" className="max-w-[640px] font-inter text-xl leading-[1.65] text-black/80">
                We don&apos;t just offer jobs, we build careers. At SMASH, every team member is an owner of growth, a driver of results, and a valued contributor to something bigger than a brief. This is where ambition meets opportunity.
              </p>
            </div>
            <ul data-work-rise-group className="grid gap-[30px] md:grid-cols-3">
              {REASONS.map((r) => (
                <li key={r.title} data-work-rise className="relative flex min-h-[260px] flex-col justify-end gap-3 overflow-hidden rounded-[18px] border border-black/10 bg-soft-grey p-6 pb-7 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-black/30">
                  <span className="absolute right-6 top-6 grid size-[60px] place-items-center rounded-[15px] border border-black/15 bg-white">
                    <Asset name={r.icon} width={26} height={26} />
                  </span>
                  <h3 className="font-manrope text-[24px] font-bold leading-[1.3] text-deep-blue">{r.title}</h3>
                  <p className="font-inter text-[15px] leading-[22px] text-black/75">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <Culture className="pb-16 lg:pb-[120px]" showEyebrow={false} />

      {open ? <OpenRoles roles={roles} /> : <NoOpenRoles />}

      <HomeAnimations />
      <SheetMotion />
      <AboutMotion />
      <WorkMotion />
    </>
  );
}
