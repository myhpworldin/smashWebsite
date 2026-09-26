import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/server/db/client";
import { listPublishedCareers } from "@/server/modules/careers/careers.service";
import { careerSummaryDto } from "@/server/api/serializers";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { CAREER_WORK_MODE_LABEL } from "@/lib/career-options";
import { PageHero } from "@/components/layout/PageHero";
import { EmptyState } from "@/components/ui/EmptyState";
import { Asset, PillLink, WRAP } from "@/components/home/shared";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.CAREERS);
}

/** The reasons block is approved page copy from the Figma design (there is no CMS model for it); the roles below are CMS content. */
const REASONS = [
  { icon: "careers-trending-up.svg", title: "Hands-On Growth", text: "Grow through real ownership, mentorship, and continuous learning." },
  { icon: "careers-brush.svg", title: "Creative Freedom", text: "We value innovation and give you the space to experiment and iterate creative boundaries." },
  { icon: "careers-award.svg", title: "Impactful Work", text: "Your contributions directly drive measurable results for brands across industries, from ambitious startups to global enterprises." },
];

/** The design's thin arrow, drawn in `currentColor` so it follows the button's text colour on hover, and nudging right as it does. */
function ArrowRight() {
  return (
    <svg aria-hidden="true" width="16" height="7" viewBox="0 0 17 7.36" fill="currentColor" className="transition-transform duration-300 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1">
      <path d="M0.5 3.18C0.22 3.18 0 3.41 0 3.68S0.22 4.18 0.5 4.18H16.5V3.18H0.5ZM16.85 4.04C17.05 3.84 17.05 3.52 16.85 3.33L13.67 0.15C13.48-0.05 13.16-0.05 12.96 0.15S12.77 0.66 12.96 0.85L15.79 3.68 12.96 6.51C12.77 6.71 12.77 7.02 12.96 7.22S13.48 7.41 13.67 7.22L16.85 4.04Z" />
    </svg>
  );
}

const BODY = "font-inter text-xl leading-[30px] text-black/90";

/**
 * Careers hub (Figma "Careers"). Open roles come from `listPublishedCareers`, the same list `GET /api/careers`
 * serves; each row leads to the role's own page, whose Apply action goes to /contact (no application backend exists).
 * No page-level schema: JobPosting needs fields the Career model does not carry (PAGE_SPECIFICATIONS.md §12).
 */
export default async function CareersPage() {
  const roles = (await listPublishedCareers(getDb())).map(careerSummaryDto);

  return (
    <>
      <PageHero
        id="careers-heading"
        title="Join the team"
        description="At SMASH, we don't just build brands - we build careers. Join a team of strategists, creators, and growth hackers shaping the future of digital marketing."
        descriptionWidth="max-w-[760px]"
      >
        <PillLink href="#open-roles" tone="red" arrow="white">Explore Open Roles</PillLink>
      </PageHero>

      <section aria-labelledby="why-heading" className="pb-16 pt-16 lg:pb-[100px] lg:pt-[120px]">
        <div className={`${WRAP} flex flex-col gap-[50px]`}>
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="flex flex-col gap-4">
              <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-smash-red">Why Smash</p>
              <h2 id="why-heading" className="max-w-[504px] font-inter text-[28px] font-medium leading-[1.25] text-black md:text-[42px] md:leading-[53px]">
                Why Build Your Career at <span className="text-deep-blue">SMASH</span>
              </h2>
            </div>
            <p className={`${BODY} lg:w-[725px]`}>
              We don&apos;t just offer jobs, we build careers. At SMASH, every team member is an owner of growth, a driver of results, and a valued contributor to something bigger than a brief. This is where ambition meets opportunity.
            </p>
          </div>
          <ul className="grid gap-[30px] md:grid-cols-3 lg:grid-cols-[354fr_380fr_526fr]">
            {REASONS.map((r) => (
              <li key={r.title} className="relative flex min-h-[254px] flex-col justify-end gap-3 rounded-[18px] border border-black/30 p-6 pb-[26px]">
                <span className="absolute right-[25px] top-[25px] grid size-[60px] place-items-center rounded-[15px] border border-black/30 bg-white">
                  <Asset name={r.icon} width={26} height={26} />
                </span>
                <h3 className="font-manrope text-[22px] font-bold leading-[30px] text-deep-blue">{r.title}</h3>
                <p className="font-inter text-[15px] leading-[22px] text-black/80">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="open-roles" aria-labelledby="roles-heading" className="scroll-mt-4 bg-soft-grey py-16 lg:py-20">
        <div className={`${WRAP} flex flex-col gap-[50px]`}>
          <div className="flex max-w-[725px] flex-col gap-5">
            <h2 id="roles-heading" className="font-inter text-[28px] font-medium leading-[normal] text-black md:text-[42px]">Open Roles</h2>
            {roles.length ? (
              <p className={BODY}>
                {roles.length} open {roles.length === 1 ? "position" : "positions"}. Apply with a note about something you built and what you would do differently now.
              </p>
            ) : null}
          </div>
          {roles.length ? (
            <ul className="flex flex-col gap-6">
              {roles.map((role) => (
                <li key={role.slug} className="relative flex flex-col justify-between gap-5 rounded-3xl border border-black/[0.08] bg-white px-5 py-6 sm:px-[29px] md:flex-row md:items-center">
                  <div className="flex max-w-[702px] flex-col gap-[18px]">
                    <div className="flex flex-wrap items-center gap-x-[30px] gap-y-3">
                      <h3 className="font-inter text-[22px] font-medium leading-[normal] text-deep-blue md:text-[26px]">{role.title}</h3>
                      {role.department || role.workMode ? (
                        <p className="flex items-center gap-3 font-inter text-xs font-medium">
                          {role.department ? <span className="flex h-7 items-center rounded-[20px] bg-bright-blue px-3 text-white">{role.department}</span> : null}
                          {role.workMode ? <span className="flex h-7 items-center rounded-[20px] bg-[#f4f5f5] px-3 text-black/[0.64]">{CAREER_WORK_MODE_LABEL[role.workMode]}</span> : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <p className="font-inter text-base leading-6 text-black/90">{role.summary}</p>
                      {role.location ? (
                        <p className="flex items-center gap-0.5 font-inter text-sm leading-[18px] text-black/90">
                          <span className="grid size-6 place-items-center"><Asset name="careers-pin.svg" width={12} height={14} /></span>
                          {role.location}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {/* Mouse-only click target for the whole row; the Apply link below is the one keyboard and screen-reader users get, and the only one that reacts to hover. */}
                  <Link href={role.path} aria-hidden="true" tabIndex={-1} className="absolute inset-0 rounded-3xl" />
                  <Link
                    href={role.path}
                    className="group relative flex h-[46px] w-fit shrink-0 items-center gap-2 rounded-[60px] border border-smash-red bg-white px-3.5 font-manrope text-lg font-medium leading-none text-smash-red no-underline transition-[background-color,color,box-shadow] duration-300 ease-out hover:bg-smash-red hover:text-white hover:shadow-[0_6px_16px_rgba(233,1,1,0.25)] focus-visible:bg-smash-red focus-visible:text-white"
                  >
                    Apply<span className="sr-only"> for {role.title}</span>
                    <ArrowRight />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="There are no open positions right now — check back soon." />
          )}
        </div>
      </section>

      <section aria-labelledby="share-heading" className={`${WRAP} py-16 lg:py-20`}>
        <div className="flex flex-col justify-between gap-8 rounded-[30px] border border-black/30 bg-white px-6 py-10 shadow-[0_4px_10px_rgba(0,0,0,0.02)] lg:flex-row lg:items-center lg:gap-[114px] lg:px-10 lg:py-[49px]">
          <div className="flex max-w-[920px] flex-col gap-[7px]">
            <h2 id="share-heading" className="font-inter text-2xl font-medium leading-[1.4] text-black md:text-[32px] md:leading-[53px]">Nothing here fits, but you think you would?</h2>
            <p className={BODY}>We hire ahead of need for people who are clearly good. Tell us what you work on and what you want to be doing in two years.</p>
          </div>
          <PillLink href={ROUTES.CONTACT} tone="red" arrow="white" className="shrink-0 self-start lg:self-center">Share Your Work</PillLink>
        </div>
      </section>
    </>
  );
}
