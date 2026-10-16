import type { CSSProperties } from "react";
import Link from "next/link";
import type { CareerSummary } from "@/server/api/serializers";
import { CAREER_WORK_MODE_LABEL } from "@/lib/career-options";
import { ROUTES } from "@/lib/routes";
import { WRAP } from "@/components/home/shared";
import { HomeAsset, HomeButton } from "@/components/home/home-ui";
import { MaskLine } from "@/components/about/AboutWords";
import { FlyArrow } from "@/components/work/WorkParts";
import sheet from "@/components/layout/sheet.module.css";

/** The deep-blue band both Careers states share (the Values / Privacy band's gradient and glow). */
const BAND = "relative isolate overflow-hidden bg-[linear-gradient(179deg,var(--brand-deep-blue)_1.5%,#022bb0_143.5%)] text-white";

function Glow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[480px] -top-[520px] max-w-none opacity-70" />
    </div>
  );
}

/** What a good introduction contains. Built from the page's approved copy (the role apply note and the "hire ahead of need" line). */
const SHARE = [
  { title: "What you work on", text: "The craft you practise today, and what you are best at." },
  { title: "Something you built", text: "One piece of work you are proud of, and what you would do differently now." },
  { title: "Where you want to be", text: "What you want to be doing in two years." },
] as const;

/**
 * The Careers page when there is no open role: said plainly, and kept short. A compact deep-blue band (the Values / Privacy
 * language): the message on the left — no open roles, but introductions are welcome — and on the right one glass panel listing
 * the three things worth sending as slim numbered rows. Fixed page copy; there is no CMS model for it.
 */
export function NoOpenRoles() {
  return (
    <section id="open-roles" aria-labelledby="roles-heading" className={`${BAND} scroll-mt-4`}>
      <Glow />
      <div className={`${WRAP} grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-[72px] lg:py-[88px]`}>
        <div className="flex max-w-[560px] flex-col gap-4">
          <p data-reveal="fade-up" className="font-inter text-sm font-semibold uppercase leading-[normal] text-white/70">Open roles</p>
          <h2 id="roles-heading" data-reveal="fade-up" className="font-inter text-[30px] font-medium leading-[1.15] md:text-[40px]">No open roles right now</h2>
          <p data-reveal="fade-up" className="font-inter text-lg leading-[1.6] text-white/85">
            We are not hiring for a specific role at the moment. We do hire ahead of need for people who are clearly good, so if you think you would fit, introduce yourself.
          </p>
        </div>

        <div data-reveal="fade-up" data-spot style={{ "--spot": "rgba(120,170,255,0.28)" } as CSSProperties} className={`${sheet.spot} overflow-hidden rounded-[22px] border border-white/20 bg-white/[0.12]`}>
          <p className="border-b border-white/15 px-6 py-4 font-inter text-sm font-semibold uppercase leading-[normal] text-white/70">What to send us</p>
          <ol data-work-rise-group>
            {SHARE.map((s, i) => (
              <li key={s.title} data-work-rise className="flex items-start gap-5 border-b border-white/15 px-6 py-5 last:border-b-0">
                <span aria-hidden="true" className="w-8 shrink-0 font-manrope text-xl font-semibold leading-[1.3] text-white/55">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-manrope text-lg font-semibold leading-[1.3]">{s.title}</h3>
                  <p className="font-inter text-[15px] leading-[1.5] text-white/80">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** The Careers page when roles are published: the same band, with each role as a glass card (the whole card is the link). */
export function OpenRoles({ roles }: { roles: CareerSummary[] }) {
  return (
    <section id="open-roles" aria-labelledby="roles-heading" className={`${BAND} scroll-mt-4`}>
      <Glow />
      <div className={`${WRAP} flex flex-col gap-12 py-20 lg:gap-[60px] lg:py-[130px]`}>
        <div className="flex max-w-[725px] flex-col gap-4">
          <p data-reveal="fade-up" className="font-inter text-sm font-semibold uppercase leading-[normal] text-white/70">Open roles</p>
          <h2 id="roles-heading" data-reveal="fade-up" className="font-inter text-[32px] font-medium leading-[1.15] md:text-[44px] md:leading-[54px]">Find your place on the team</h2>
          <p data-reveal="fade-up" className="font-inter text-xl leading-[1.65] text-white/85">
            {roles.length} open {roles.length === 1 ? "position" : "positions"}. Apply with a note about something you built and what you would do differently now.
          </p>
        </div>
        <ul data-work-rise-group className="flex flex-col gap-5">
          {roles.map((role) => (
            <li key={role.slug} data-work-rise data-spot style={{ "--spot": "rgba(120,170,255,0.28)" } as CSSProperties} className={`${sheet.spot} group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[22px] border border-white/20 bg-white/[0.12] p-6 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-white/45 md:flex-row md:items-center md:p-8`}>
              <div className="flex max-w-[760px] flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-manrope text-[26px] font-semibold leading-[1.3] md:text-[32px]">{role.title}</h3>
                  {role.department ? <span className="rounded-full bg-bright-blue px-3 py-1 font-inter text-xs font-medium">{role.department}</span> : null}
                  {role.workMode ? <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-inter text-xs font-medium text-white/85">{CAREER_WORK_MODE_LABEL[role.workMode]}</span> : null}
                </div>
                <p className="font-inter text-base leading-[1.6] text-white/85">{role.summary}</p>
                {role.location ? <p className="font-inter text-sm text-white/65">{role.location}</p> : null}
              </div>
              <span className="shrink-0"><FlyArrow>Apply</FlyArrow></span>
              <Link href={role.path} aria-label={`Apply for ${role.title}`} className="group absolute inset-0 rounded-[inherit] outline-offset-4 focus-visible:outline-2 focus-visible:outline-white" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The Careers closing call to action: a centred statement on white rather than a boxed card — a large heading rising out of its
 * mask, one line of text, the button to the contact page and, when Site Settings has one, the team's email beneath it (a link
 * that underlines on hover). `ring` is a soft outlined circle behind the heading that drifts as the page scrolls past
 * (WorkMotion's `data-work-ring`), the quiet accent of the section. No application backend exists, so this always leads to /contact.
 */
export function CareersCta({ heading, text, button, email }: { heading: string; text: string; button: string; email?: string | null }) {
  return (
    <section aria-labelledby="careers-cta-heading" data-careers-cta className="relative isolate overflow-hidden bg-white py-16 lg:py-[110px]">
      <span aria-hidden="true" data-work-ring className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.07] lg:size-[760px]" />
      <span aria-hidden="true" data-work-ring className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.07] lg:size-[500px]" />
      <div className={`${WRAP} flex flex-col items-center gap-6 text-center`}>
        <h2 id="careers-cta-heading" className="max-w-[860px] font-inter text-[36px] font-medium leading-[1.12] text-ink md:text-[56px] lg:text-[64px]">
          <MaskLine as="span">{heading}</MaskLine>
        </h2>
        <p data-reveal="fade-up" className="max-w-[560px] font-inter text-xl leading-[1.6] text-black/65">{text}</p>
        <div data-reveal="fade-up" className="mt-2 flex flex-col items-center gap-4">
          <HomeButton href={ROUTES.CONTACT} tone="red" arrow>{button}</HomeButton>
          {email ? (
            <a href={`mailto:${email}`} className="group/mail relative font-inter text-base text-black/65 no-underline">
              or write to <span className="text-ink">{email}</span>
              <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-ink transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/mail:origin-left group-hover/mail:scale-x-100 group-focus-visible/mail:origin-left group-focus-visible/mail:scale-x-100 motion-reduce:transition-none" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
