import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { HOME_WRAP, HomeAsset } from "./home-ui";
import { isLive, type HomeSection } from "./shared";
import styles from "./ServicesSection.module.css";

/**
 * "Our Services" (Figma New Homepage, y 3367–4180): near-black band, title + "Explore our Services", then the four
 * service groups side by side. An open card is bright blue, taller, with the group's deliverables listed. On large
 * screens every card rests closed and the hovered or keyboard-focused one expands out of its closed band towards the
 * top and bottom; below lg (no hover) the first card is open, as in the design (ServicesSection.module.css — CSS
 * only, so the section stays a server component). Each card goes to its category's section of the Services page
 * (`?scrollTo=`, which ServicesCatalogue animates to), as the previous Home did.
 */
export function ServicesSection({ data }: { data: HomeSection<"services"> }) {
  const title = data.eyebrow ?? data.heading;
  const cta = data.cta;
  return (
    <section aria-labelledby="services-heading" data-home-section="services" className="bg-[#1a1a1a] pb-16 pt-20 text-white lg:pb-[85px] lg:pt-[120px]">
      <div className={HOME_WRAP}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          {title ? <h2 id="services-heading" className="text-[40px] leading-[1.2] lg:text-[62px] lg:leading-[83px]">{title}</h2> : null}
          {cta && isLive(cta.target) ? (
            <Link href={cta.target} className="inline-flex items-center gap-4 text-xl leading-normal text-white no-underline hover:underline">
              {cta.label}
              <HomeAsset name="arrow-up-right.svg" width={16} height={16} />
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
                    {service.shortDescription ? <p className="text-base leading-[1.6] text-soft-grey">{service.shortDescription}</p> : null}
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
