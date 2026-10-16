import Link from "next/link";
import type { PublicMedia } from "@/server/media/public";
import type { ServiceOfferingDetail } from "@/server/api/serializers";
import { ServicesBackdrop } from "@/components/home/ServicesBackdrop";
import { Media } from "@/components/ui/Media";
import sheet from "@/components/layout/sheet.module.css";
import styles from "./service.module.css";
import { Sheet, SectionHead, SPOT, SV_WRAP, Words } from "./service-ui";

type Item = { order: number; title: string; description?: string | null; icon?: PublicMedia | null; /** Makes the whole card a link (the category page's deliverables that have their own page). */ href?: string | null };
type Intro = { eyebrow: string | null; heading: string | null; description: string | null; visual: PublicMedia | null };

/** The target's own canonical path prefix says what it is — never a prop every caller must remember to pass. */
const targetTypeOf = (path: string) => (path.startsWith("/services/") ? "service" : path.startsWith("/work/") ? "case_study" : path.startsWith("/insights/") ? "insight" : "other");

/**
 * A picture of an interface (the offerings' `*-dashboard` cards: white on white, text and chart to the very edge) must be
 * shown whole. Photos can be zoomed, drifted and unmasked without harm; a dashboard cropped by a zoom loses its
 * labels, so it gets the contained, un-clipped treatment (`data-sv-flat`) instead.
 */
const isInterface = (media: PublicMedia) => /-dashboard\.\w+$/.test(media.url);

const pad = (n: number) => String(n).padStart(2, "0");

/** The hairline-outlined numeral a card carries (`01`), which fills red under the pointer. */
const Numeral = ({ n }: { n: number }) => (
  <span aria-hidden="true" className="pointer-events-none absolute right-6 top-5 text-[44px] font-bold leading-none text-transparent transition-[-webkit-text-stroke-color] duration-500 [-webkit-text-stroke:1px_rgba(0,0,0,0.14)] group-hover:[-webkit-text-stroke-color:#e90101] lg:right-7 lg:top-6">
    {pad(n)}
  </span>
);

const IconTile = ({ icon }: { icon?: PublicMedia | null }) =>
  icon ? (
    <span data-sv-icon className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-[#f3f3f3] ring-1 ring-black/5 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
      <Media media={icon} sizes="28px" />
    </span>
  ) : null;

/** The line that draws along a card's foot on hover. */
const FootLine = () => <span aria-hidden="true" className="absolute inset-x-7 bottom-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-bright-blue to-smash-red transition-transform duration-500 group-hover:scale-x-100 lg:inset-x-8" />;

/** Text beside a picture: the offering's introduction, and (mirrored, with numbered takeaways) its importance. */
export function ServiceIntro({ data, headingId, first, reverse, tone = "white", takeaways }: { data: Intro | null; headingId: string; first?: boolean; reverse?: boolean; tone?: "white" | "grey"; takeaways?: Item[] }) {
  if (!data) return null;
  return (
    <Sheet tone={tone} labelledBy={headingId} first={first}>
      <div className={SV_WRAP}>
        <div className={`grid items-center gap-12 lg:gap-20 ${data.visual ? "lg:grid-cols-2" : ""}`}>
          <div className={reverse ? "lg:order-2" : ""}>
            <SectionHead eyebrow={data.eyebrow} heading={data.heading} description={data.description} headingId={headingId} />
            {takeaways?.length ? (
              <ol data-sv-stagger className="mt-10 flex max-w-[600px] flex-col">
                {takeaways.map((t) => (
                  <li key={t.order} className="relative flex gap-5 py-5">
                    <span aria-hidden="true" data-sv-line className="absolute inset-x-0 top-0 h-px origin-left bg-black/15" />
                    <span aria-hidden="true" className="w-9 shrink-0 pt-0.5 text-[15px] font-bold tabular-nums text-smash-red">{pad(t.order)}</span>
                    <p className="text-[17px] leading-[1.6] text-black/75">{t.description || t.title}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
          {data.visual ? (
            <div className={`relative ${reverse ? "lg:order-1" : ""}`}>
              <span aria-hidden="true" data-sv-frame className={`absolute -inset-3 rounded-[34px] border border-smash-red/40 lg:-inset-4 ${reverse ? "-translate-x-2 translate-y-2" : "translate-x-2 translate-y-2"}`} />
              {isInterface(data.visual) ? (
                <div data-sv-media data-sv-flat className="relative aspect-[545/478] [&_img]:size-full [&_img]:object-contain">
                  <Media media={data.visual} sizes="(min-width: 1024px) 50vw, 100vw" />
                </div>
              ) : (
                <div data-sv-media className="relative aspect-[545/478] overflow-hidden rounded-[28px] bg-black/5 shadow-[0_40px_80px_-40px_rgba(0,30,100,0.5)]">
                  <div data-sv-img className="absolute inset-0 [&_img]:size-full [&_img]:object-cover">
                    <Media media={data.visual} sizes="(min-width: 1024px) 50vw, 100vw" />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

/** "What business change the service supports": a grid of cards with a pointer light, hairline numerals and a drawing foot line. */
export function ServiceCapabilities({ data, headingId, tone = "white", first }: { data: { eyebrow?: string | null; heading?: string | null; description?: string | null; items: Item[] } | null; headingId: string; tone?: "white" | "grey"; first?: boolean }) {
  if (!data?.items?.length) return null;
  return (
    <Sheet tone={tone} labelledBy={headingId} first={first}>
      <div className={SV_WRAP}>
        <SectionHead eyebrow={data.eyebrow} heading={data.heading} description={data.description} headingId={headingId} center />
        <ul data-sv-stagger className="mt-14 grid gap-5 md:grid-cols-2 lg:mt-[72px] lg:grid-cols-3 lg:gap-6">
          {data.items.map((item) => (
            <li key={item.order} data-spot style={SPOT()} className={`${sheet.spot} group relative flex flex-col overflow-hidden rounded-[24px] border border-black/[0.08] bg-white p-7 transition-[transform,translate,scale,rotate,box-shadow,border-color] duration-500 hover:-translate-y-1.5 hover:border-black/15 hover:shadow-[0_30px_60px_-30px_rgba(0,40,120,0.4)] lg:p-8`}>
              <Numeral n={item.order} />
              <IconTile icon={item.icon} />
              <h3 className={`text-[22px] font-semibold leading-[1.25] ${item.icon ? "" : "mt-6 pr-12"}`}>
                {item.href ? <Link href={item.href} className="text-inherit no-underline after:absolute after:inset-0 after:content-['']">{item.title}</Link> : item.title}
              </h3>
              {item.description ? <p className="mt-3 text-[15.5px] leading-[1.7] text-black/60">{item.description}</p> : null}
              {item.href ? <span aria-hidden="true" className="mt-auto pt-6 text-[14px] font-semibold text-bright-blue transition-transform duration-500 group-hover:translate-x-1.5">Explore →</span> : null}
              <FootLine />
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/**
 * "What you receive": the stages down a rail on the right with the section's heading held on the left. The rail fills
 * as the page scrolls and the stage in the middle of the screen lights up (ServiceMotion); the drifting chart behind
 * is the Home Services band's.
 */
export function ServiceProcess({ data, headingId }: { data: { eyebrow?: string | null; heading?: string | null; description?: string | null; stages: Item[] } | null; headingId: string }) {
  if (!data?.stages?.length) return null;
  return (
    <Sheet tone="dark" labelledBy={headingId} className="isolate">
      <ServicesBackdrop />
      <div className={`${SV_WRAP} relative`}>
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-[140px] lg:self-start">
            <SectionHead eyebrow={data.eyebrow} heading={data.heading} description={data.description} headingId={headingId} dark />
          </div>
          <ol data-pr-list className={`${styles.stages} relative pl-14 lg:pl-[72px]`}>
            <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-px bg-white/15 lg:left-[23px]" />
            <span aria-hidden="true" data-pr-rail className="absolute bottom-6 left-[19px] top-6 w-px origin-top bg-gradient-to-b from-bright-blue via-bright-blue to-smash-red lg:left-[23px]" />
            {data.stages.map((stage) => (
              <li key={stage.order} data-pr-stage className={`${styles.stage} relative py-8 lg:py-11`}>
                <span className={`${styles.node} absolute -left-14 top-9 grid size-10 place-items-center rounded-full border border-white/30 bg-[#1a1a1a] text-[12px] font-semibold tabular-nums lg:-left-[72px] lg:top-12 lg:size-12 lg:text-[13px]`}>{pad(stage.order)}</span>
                <h3 className="text-[28px] font-semibold leading-[1.15] tracking-tight lg:text-[38px]">{stage.title}</h3>
                {stage.description ? <p className="mt-4 max-w-[560px] text-[16.5px] leading-[1.75] text-white/70 lg:text-[18px]">{stage.description}</p> : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Sheet>
  );
}

/** The closing "built for better decisions" section: intro and a highlighted principle on the left, compact cards on the right. */
export function ServiceOutcome({ data, headingId }: { data: ServiceOfferingDetail["outcome"]; headingId: string }) {
  if (!data) return null;
  return (
    <Sheet tone="white" labelledBy={headingId}>
      <div className={SV_WRAP}>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <SectionHead eyebrow={data.eyebrow} heading={data.heading} description={data.description} headingId={headingId} />
            {data.highlight ? (
              <div data-sv-up className="relative mt-9 max-w-[560px] overflow-hidden rounded-2xl bg-[#0a0a0a] py-6 pl-9 pr-7 text-white">
                <span aria-hidden="true" data-sv-bar className="absolute inset-y-0 left-0 w-1 origin-top bg-gradient-to-b from-bright-blue to-smash-red" />
                <p className="text-[16px] leading-[1.7] text-white/85">{data.highlight}</p>
              </div>
            ) : null}
          </div>
          {data.items?.length ? (
            <ul data-sv-stagger className="grid gap-5 sm:grid-cols-2">
              {data.items.map((item) => (
                <li key={item.order} data-spot style={SPOT("rgba(233,1,1,0.07)")} className={`${sheet.spot} group relative flex flex-col overflow-hidden rounded-[22px] border border-black/[0.08] bg-[#fafafa] p-7 pb-8 transition-[transform,translate,scale,rotate,box-shadow,background-color] duration-500 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_30px_60px_-30px_rgba(0,40,120,0.35)]`}>
                  <IconTile icon={item.icon} />
                  <h3 className="text-[20px] font-semibold leading-[1.3]">{item.title}</h3>
                  {item.description ? <p className="mt-3 text-[15px] leading-[1.7] text-black/60">{item.description}</p> : null}
                  <FootLine />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

/** Links to other services, as pills whose arrow turns and whose fill sweeps in on hover. */
export function ServiceRelated({ heading, headingId, items }: { heading: string; headingId: string; items: { title: string; slug: string; path: string }[] }) {
  if (!items.length) return null;
  return (
    <Sheet tone="grey" labelledBy={headingId} compact>
      <div className={SV_WRAP}>
        <h2 id={headingId} data-sv-words className="text-[30px] font-medium leading-[1.15] tracking-tight md:text-[40px] lg:text-[48px]"><Words text={heading} /></h2>
        <ul data-sv-stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={item.path}
                data-track-event="related_content_click"
                data-track-params={JSON.stringify({ source_type: "service", target_type: targetTypeOf(item.path), target_slug: item.slug })}
                className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-black/10 bg-white px-6 py-5 text-[18px] font-medium text-black no-underline transition-[color,border-color,transform] duration-500 hover:-translate-y-1 hover:border-bright-blue hover:text-white"
              >
                <span aria-hidden="true" className="absolute inset-0 -z-0 origin-left scale-x-0 bg-bright-blue transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:scale-x-100" />
                <span className="relative z-10">{item.title}</span>
                <span aria-hidden="true" className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full bg-[#f3f3f3] text-[15px] text-black transition-[transform,translate,scale,rotate,background-color] duration-500 group-hover:-rotate-45 group-hover:bg-white">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/** Case studies related to a service, as picture cards. */
export function ServiceCases({ items, headingId }: { items: { title: string; slug: string; path: string; summary: string; image: PublicMedia | null }[]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Sheet tone="white" labelledBy={headingId}>
      <div className={SV_WRAP}>
        <h2 id={headingId} data-sv-words className="text-[30px] font-medium leading-[1.15] tracking-tight md:text-[40px] lg:text-[48px]"><Words text="Results" /></h2>
        <ul data-sv-stagger className="mt-10 grid gap-6 md:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug}>
              <Link href={item.path} className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-black/10 bg-white no-underline transition-[transform,translate,scale,rotate,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_rgba(0,40,120,0.4)]">
                {item.image ? (
                  <span className="relative block aspect-[16/10] overflow-hidden bg-black/5 [&_img]:size-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-700 group-hover:[&_img]:scale-105">
                    <Media media={item.image} />
                  </span>
                ) : null}
                <span className="flex flex-1 flex-col gap-2 p-6">
                  <span className="text-[20px] font-semibold leading-[1.3] text-black">{item.title}</span>
                  <span className="text-[15px] leading-[1.65] text-black/60">{item.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/** Tools and platforms the service really uses, as logo pills. */
export function ServiceTools({ items, headingId }: { items: { name: string; logo?: PublicMedia | null; url?: string | null }[]; headingId: string }) {
  if (!items.length) return null;
  return (
    <Sheet tone="white" labelledBy={headingId} compact>
      <div className={SV_WRAP}>
        <h2 id={headingId} data-sv-words className="text-[30px] font-medium leading-[1.15] tracking-tight md:text-[40px] lg:text-[48px]"><Words text="Tools & Platforms" /></h2>
        <ul data-sv-stagger className="mt-8 flex flex-wrap gap-4 lg:mt-10">
          {items.map((tool) => {
            const inner = (
              <>
                {tool.logo ? <span className="relative block size-8 [&_img]:size-full [&_img]:object-contain"><Media media={tool.logo} sizes="32px" /></span> : null}
                <span className="text-[16px] font-medium text-black">{tool.name}</span>
              </>
            );
            const cls = "flex items-center gap-3 rounded-full border border-black/10 bg-white px-5 py-3 no-underline transition-[border-color,transform,translate] duration-500 hover:-translate-y-1 hover:border-bright-blue";
            return <li key={tool.name}>{tool.url ? <a href={tool.url} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <span className={cls}>{inner}</span>}</li>;
          })}
        </ul>
      </div>
    </Sheet>
  );
}
