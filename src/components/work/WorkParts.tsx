import type { CSSProperties } from "react";
import { ROUTES } from "@/lib/routes";
import { WRAP } from "@/components/home/shared";
import { HomeAsset, HomeButton } from "@/components/home/home-ui";
import sheet from "@/components/layout/sheet.module.css";

/** The figure's leading number ("425", "1,200", "4.5"), or null for a word. */
const LEADING_NUMBER = /^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/;

/**
 * A result's value. Its leading number sits in its own `data-count` span so WorkMotion can count it up when it scrolls
 * into view; the prefix/suffix ("₹", "%", "x") stay static. The server renders the final value, so no-JS and reduced
 * motion show it as-is, and the real value is read from `sr-only` (the counting figure is hidden from screen readers).
 */
export function ResultValue({ value, className = "" }: { value: string; className?: string }) {
  const match = LEADING_NUMBER.exec(value);
  const number = match ? match[0] : null;
  return (
    <>
      <span aria-hidden="true" className={className}>
        {number ? (
          <>
            {value.slice(0, match!.index)}
            <span data-count={number}>{number}</span>
            {value.slice(number.length)}
          </>
        ) : (
          value
        )}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

/**
 * "Know more" link text with the site's hover: an underline draws in from the left, the arrow flies out as a fresh one slides in.
 * `dark` is the same link on a white sheet (the white arrow asset is inverted to black).
 */
export function FlyArrow({ children, tone = "light", className = "text-lg" }: { children: string; tone?: "light" | "dark"; className?: string }) {
  const dark = tone === "dark";
  const arrow = `absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none ${dark ? "invert" : ""}`;
  return (
    <span className={`group/more inline-flex items-center gap-4 leading-none ${dark ? "text-ink" : "text-white"} ${className}`}>
      <span className="relative pb-1.5">
        {children}
        <span className={`absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:origin-left group-hover:scale-x-100 group-focus-visible:origin-left group-focus-visible:scale-x-100 motion-reduce:transition-none ${dark ? "bg-ink" : "bg-white"}`} />
      </span>
      <span className="relative size-4 shrink-0 overflow-hidden">
        <HomeAsset name="arrow-up-right.svg" width={16} height={16} className={`${arrow} group-hover:-translate-y-full group-hover:translate-x-full group-focus-visible:-translate-y-full group-focus-visible:translate-x-full`} />
        <HomeAsset name="arrow-up-right.svg" width={16} height={16} className={`${arrow} -translate-x-full translate-y-full group-hover:translate-x-0 group-hover:translate-y-0 group-focus-visible:translate-x-0 group-focus-visible:translate-y-0`} />
      </span>
    </span>
  );
}

/**
 * A case study's key facts under its hero intro (client, industry, service …): small uppercase labels over plain values,
 * split by hairlines — one row from `sm` up, a two-column grid on phones. Replaces the glass pills, so the hero reads like
 * the other inner pages: headline, one line, then quiet detail. Facts with no value are left out by the caller.
 */
export function CaseFacts({ facts }: { facts: { label: string; value: string }[] }) {
  if (!facts.length) return null;
  return (
    <dl className="grid w-full max-w-[880px] grid-cols-2 border-t border-white/20 sm:flex sm:w-auto sm:justify-center">
      {facts.map((f, i) => (
        <div
          key={f.label}
          className={`flex flex-col gap-1.5 border-white/20 px-4 py-5 text-center odd:last:col-span-2 sm:px-8 sm:pb-0 sm:pt-6 ${i % 2 === 1 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} sm:border-l sm:first:border-l-0`}
        >
          <dt className="font-inter text-xs font-semibold uppercase leading-[normal] tracking-[0.08em] text-white/55">{f.label}</dt>
          <dd className="font-inter text-base leading-[1.4] text-white lg:text-lg">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const PRINCIPLES = [
  { title: "Outcomes, not private data", text: "We share what a project achieved. A client's customer data, budgets, accounts and internal numbers are never shown." },
  { title: "Shown with permission", text: "A business appears in our work only where it has agreed to it, and only with the figures it is happy to share." },
  { title: "Figures we can stand behind", text: "Every result on this site is checked before it is published, and none is estimated or rounded up." },
] as const;

/**
 * "Your business, your data": how the work is shown. A deep-blue sheet in Home's Values language (glass cards, the pointer
 * light, the red glow). Fixed page copy — there is no CMS model for it. `compact` is the shorter version for a case study.
 */
export function PrivacyBand({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="work-privacy-heading" data-work-privacy className={`relative z-40 isolate overflow-hidden bg-[linear-gradient(179deg,var(--brand-deep-blue)_1.5%,#022bb0_143.5%)] text-white`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[480px] -top-[520px] max-w-none opacity-70" />
      </div>
      <div className={`${WRAP} flex flex-col items-center gap-12 ${compact ? "py-16 lg:py-[100px]" : "py-20 lg:py-[130px]"}`}>
        <div data-reveal="fade-up" className="flex max-w-[760px] flex-col items-center gap-4 text-center">
          <p className="font-inter text-sm font-semibold uppercase leading-[normal] text-white/70">Our promise</p>
          <h2 id="work-privacy-heading" className="font-inter text-[32px] font-medium leading-[1.15] md:text-[42px] md:leading-[54px]">Your business, your data</h2>
          <p className="font-inter text-xl leading-[1.65] text-white/85">We are proud of the results we deliver, and careful about what we show of the businesses behind them.</p>
        </div>
        <ul data-work-rise-group className="grid w-full max-w-[1270px] gap-[30px] md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title} data-work-rise data-spot style={{ "--spot": "rgba(120,170,255,0.28)" } as CSSProperties} className={`${sheet.spot} group relative flex min-h-[240px] flex-col justify-end gap-2 overflow-hidden rounded-[18px] border border-white/20 bg-white/[0.14] p-6 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-white/45 lg:min-h-[280px]`}>
              <span aria-hidden="true" className="absolute right-6 top-4 select-none font-manrope text-[84px] font-semibold leading-none text-transparent transition-[color] duration-500 [-webkit-text-stroke:1px_rgba(255,255,255,0.55)] group-hover:text-white/20 lg:text-[96px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-manrope text-2xl font-semibold leading-[1.4]">{p.title}</h3>
              <p className="font-inter text-[15px] leading-[22px]">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The closing call to action, in the site's deep-blue card language. The wording defaults to the Our Work page's; Careers passes its own. */
export function WorkCta({ heading = "Have a business challenge?", text = "Tell us where you are and where you want to be. Let\u2019s build what comes next.", button = "Get Started" }: { heading?: string; text?: string; button?: string }) {
  return (
    <section aria-labelledby="work-cta-heading" className="bg-white pb-16 pt-16 lg:pb-[120px] lg:pt-[100px]">
      <div className={WRAP}>
        <div data-reveal="fade-up" data-spot style={{ "--spot": "rgba(120,170,255,0.25)" } as CSSProperties} className={`${sheet.spot} relative isolate overflow-hidden rounded-[28px] bg-deep-blue px-6 py-12 text-white lg:rounded-[40px] lg:px-16 lg:py-[72px]`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[480px] -top-[520px] max-w-none opacity-80" />
          </div>
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center lg:gap-16">
            <div className="flex max-w-[760px] flex-col gap-4">
              <h2 id="work-cta-heading" className="font-inter text-[32px] font-medium leading-[1.15] md:text-[44px]">{heading}</h2>
              <p className="font-inter text-xl leading-[1.65] text-white/85">{text}</p>
            </div>
            <HomeButton href={ROUTES.CONTACT} tone="red" arrow>{button}</HomeButton>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A chip row (services, industry …) in the glass style used across the redesigned pages. */
export function Chips({ items, tone = "dark" }: { items: string[]; tone?: "dark" | "light" }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map((item) => (
        <li key={item} className={`rounded-full border px-4 py-1.5 font-inter text-sm leading-[normal] ${tone === "dark" ? "border-white/25 bg-white/10 text-white/90" : "border-black/15 bg-black/[0.03] text-black/75"}`}>{item}</li>
      ))}
    </ul>
  );
}

