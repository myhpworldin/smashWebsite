import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { HOME_WRAP, HomeAsset } from "./home-ui";
import { isLive, type HomeSection } from "./shared";
import { ServicesBackdrop } from "./ServicesBackdrop";
import styles from "./ServicesSection.module.css";

/**
 * The project's marker for copy the design does not provide (see server/db/home-design-content.ts): the CMS requires a
 * service description, so the Home import fills it with "[SAMPLE] … short description." until an editor writes the real
 * one. The cards never show it — a card shows its description only once it is real copy.
 */
const isPlaceholder = (text: string) => text.trimStart().startsWith("[SAMPLE]");

/**
 * The Figma "Our Services" cards' summary line (the design repeats one sentence on all four). A card shows it, closed
 * or open, until an editor writes the service's own short description in the CMS — a placeholder or empty description
 * falls back to this, a real one always wins.
 */
const DESIGN_SUMMARY = "Put your brand in front of the right people and turn attention into measurable growth.";
const summaryOf = (description: string | null | undefined) => (description && !isPlaceholder(description) ? description : DESIGN_SUMMARY);

/**
 * "Our Services" (Figma New Homepage, y 3367–4180): near-black band, title + "Explore our Services", then the four
 * service groups side by side. An open card is bright blue, taller, with the group's deliverables listed. On large
 * screens every card rests closed and the hovered or keyboard-focused one expands out of its closed band towards the
 * top and bottom; below lg (no hover) the first card is open, as in the design (ServicesSection.module.css — CSS
 * only, so the section stays a server component). Each card goes to its category's section of the Services page
 * (`?scrollTo=`, which ServicesCatalogue animates to), as the previous Home did. Every card shows its summary, closed
 * or open, as in the design.
 */
export function ServicesSection({ data }: { data: HomeSection<"services"> }) {
  const title = data.eyebrow ?? data.heading;
  const cta = data.cta;
  return (
    <section aria-labelledby="services-heading" data-home-section="services" className="relative z-10 isolate -mt-[100svh] min-h-svh overflow-hidden bg-[#1a1a1a] pb-16 motion-reduce:mt-0 pt-20 text-white lg:pb-[85px] lg:pt-[120px]">
      <ServicesBackdrop />
      <div className={`${HOME_WRAP} relative`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          {title ? <h2 id="services-heading" className="text-[40px] leading-[1.2] lg:text-[62px] lg:leading-[83px]">{title}</h2> : null}
          {cta && isLive(cta.target) ? (
            // Same hover as the case-study cards' "Know More": a white underline draws in from the left (and retracts
            // to the right), and the arrow flies out to the top-right as a fresh one slides in from the bottom-left.
            <Link href={cta.target} className="group/more inline-flex items-center gap-4 text-xl leading-normal text-white no-underline">
              <span className="relative">
                {cta.label}
                <span className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-white transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:origin-left group-hover/more:scale-x-100 group-focus-visible/more:origin-left group-focus-visible/more:scale-x-100 motion-reduce:transition-none" />
              </span>
              <span className="relative size-4 shrink-0 overflow-hidden">
                <HomeAsset name="arrow-up-right.svg" width={16} height={16} className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:-translate-y-full group-hover/more:translate-x-full group-focus-visible/more:-translate-y-full group-focus-visible/more:translate-x-full motion-reduce:transition-none" />
                <HomeAsset name="arrow-up-right.svg" width={16} height={16} className="absolute inset-0 -translate-x-full translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:translate-x-0 group-hover/more:translate-y-0 group-focus-visible/more:translate-x-0 group-focus-visible/more:translate-y-0 motion-reduce:transition-none" />
              </span>
            </Link>
          ) : null}
        </div>

        <ul className={`${styles.list} mt-12 grid sm:grid-cols-2 lg:mt-[60px] lg:grid-cols-4`}>
          {data.items.map((service, i) => (
            <li key={service.path} data-default-open={i === 0 ? "" : undefined} className={styles.card}>
              <span aria-hidden="true" className={styles.panel} />
              <div className={styles.body}>
                <div className="flex flex-col gap-[30px]">
                  <div className="flex h-8 items-center justify-between">
                    <HomeAsset name="service-network.svg" width={32} height={32} />
                    <span className="font-inter text-xs text-soft-grey/70">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[26px] leading-normal">
                      <Link href={`${ROUTES.SERVICES}?scrollTo=${service.slug}-heading`} className="text-white no-underline after:absolute after:inset-0 after:content-['']">
                        {service.name}
                      </Link>
                    </h3>
                    <p className="text-base leading-[1.6] text-soft-grey">{summaryOf(service.shortDescription)}</p>
                  </div>
                </div>
                {service.highlights.length ? (
                  <ul className={`${styles.highlights} text-sm leading-[29px] text-soft-grey`}>
                    {service.highlights.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
              </div>
              <HomeAsset name="arrow-up-right-large.svg" width={21} height={21} className={`${styles.arrow} absolute bottom-[30px] right-[30px]`} />
              <span aria-hidden="true" className={`${styles.notch} absolute bottom-0 left-7 h-[27px] w-8 bg-[#1a1a1a]`} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
