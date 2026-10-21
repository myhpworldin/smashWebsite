import type { CSSProperties } from "react";
import Link from "next/link";
import { getSiteSettings } from "@/server/seo/request-cache";
import { LEGAL_LINKS, type LegalBlock, type LegalContext, type LegalDoc } from "@/lib/legal-content";
import { ROUTES } from "@/lib/routes";
import { LEGAL_NAME } from "@/lib/company";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { WRAP } from "@/components/home/shared";
import { HomeAsset, HomeButton } from "@/components/home/home-ui";
import sheet from "@/components/layout/sheet.module.css";
import { LegalMotion } from "./LegalMotion";
import styles from "./legal.module.css";

const LINK = "text-bright-blue underline decoration-bright-blue/35 underline-offset-4 transition-[text-decoration-color] duration-200 hover:decoration-bright-blue focus-visible:decoration-bright-blue";

/** The values the copy quotes: the registered company name, and the contact details from Site Settings. */
async function legalContext(): Promise<LegalContext> {
  const settings = await getSiteSettings().catch(() => null);
  return {
    company: LEGAL_NAME,
    email: settings?.contact?.email ?? null,
    phone: settings?.contact?.phone ?? null,
    address: settings?.contact?.address ?? null,
  };
}

/** Renders the copy's tiny inline syntax: `**bold**` and `[label](href)`. Internal paths become client-side links. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**")) return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (!link) return part;
        const [, label, href] = link;
        if (href.startsWith("/")) return <Link key={i} href={href} className={LINK}>{label}</Link>;
        const external = /^https?:/.test(href);
        return <a key={i} href={href} className={LINK} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{label}</a>;
      })}
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case "p":
      return <p data-legal-reveal><Inline text={block.text} /></p>;
    case "h3":
      return <h3 data-legal-reveal className="mt-2 font-manrope text-xl font-semibold leading-[1.4] text-ink">{block.text}</h3>;
    case "ul":
      return (
        <ul data-legal-reveal className="flex flex-col gap-3">
          {block.items.map((item, i) => (
            <li key={i} className="relative pl-7 before:absolute before:left-0 before:top-[0.95em] before:h-px before:w-4 before:bg-smash-red">
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div data-legal-reveal className="overflow-x-auto rounded-2xl border border-black/10" tabIndex={0} role="region" aria-label={block.caption}>
          <table className="w-full min-w-[620px] border-collapse text-left text-[15px] leading-[1.55]">
            <caption className="sr-only">{block.caption}</caption>
            <thead className="bg-soft-grey text-ink">
              <tr>{block.head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-black/10 align-top">
                  {row.map((cell, i) => (i === 0 ? <th key={i} scope="row" className="px-4 py-3.5 font-semibold text-ink">{cell}</th> : <td key={i} className="px-4 py-3.5">{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function TocLinks({ doc }: { doc: LegalDoc }) {
  return (
    <ol className="flex flex-col gap-0.5">
      {doc.sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} data-legal-link={s.id} className={`${styles.tocLink} flex gap-3 rounded-lg py-1.5 pl-4 pr-2 text-[15px] leading-[1.4] no-underline`}>
            <span aria-hidden="true" className="w-5 shrink-0 tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function Toc({ doc }: { doc: LegalDoc }) {
  return (
    <>
      {/* Below lg the contents are a collapsed disclosure (works without JavaScript); at lg and up they sit pinned beside the text. */}
      <details className="group/toc mb-10 rounded-2xl border border-black/10 bg-soft-grey lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-inter text-sm font-semibold uppercase text-ink [&::-webkit-details-marker]:hidden">
          On this page
          <span aria-hidden="true" className="text-xl leading-none transition-transform duration-300 group-open/toc:rotate-45">+</span>
        </summary>
        <nav aria-label={`${doc.label} contents`} className="px-3 pb-4">
          <TocLinks doc={doc} />
        </nav>
      </details>
      <nav aria-label={`${doc.label} contents`} data-legal-toc className="relative hidden lg:block lg:self-start [@media(min-width:1024px)_and_(min-height:640px)]:sticky [@media(min-width:1024px)_and_(min-height:640px)]:top-[100px]">
        <p className="mb-4 font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">On this page</p>
        <div className="relative max-h-[calc(100svh-200px)] overflow-y-auto pr-2">
          <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-px bg-black/10" />
          <span aria-hidden="true" data-legal-progress className="absolute left-0 top-0 h-full w-px origin-top scale-y-0 bg-smash-red" />
          <TocLinks doc={doc} />
        </div>
      </nav>
    </>
  );
}

/**
 * The shared page for Terms & Conditions, Privacy Policy and Cookie Policy, in the same language as About and Contact:
 * the SheetHero (mist, words rising out of masks), a white sheet that slides over it, then the document with a pinned
 * contents list on the left (below lg: a collapsed list above the text), numbered sections, and a closing blue card
 * with the contact details and the other two policies. The hero's load-in is CSS-only so it runs before hydration; the
 * sections then rise in as they are scrolled to (`LegalMotion`), and the contents list follows the reader.
 */
export async function LegalDocument({ build }: { build: (context: LegalContext) => LegalDoc }) {
  const context = await legalContext();
  const doc = build(context);
  const others = LEGAL_LINKS.filter((l) => l.path !== doc.path);
  const hasDirect = !!(context.email || context.phone);

  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero id="legal-heading" title={doc.title} description={doc.intro} descriptionWidth="max-w-[820px]" image="/media/aboutus-banner.png" />

        <section aria-label={doc.title} data-legal className={`relative z-10 bg-white pb-20 pt-14 lg:pb-[120px] lg:pt-[100px] ${SHEET}`}>
          <div className={`${WRAP} lg:grid lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-x-[72px] xl:grid-cols-[minmax(0,320px)_minmax(0,820px)] xl:justify-between`}>
            <Toc doc={doc} />

            <article data-legal-article className="min-w-0">
              <div className="flex flex-col gap-14 lg:gap-[72px]">
                {doc.sections.map((s, i) => (
                  <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} data-legal-section className="scroll-mt-8">
                    <div data-legal-reveal className="mb-6 flex flex-col gap-3">
                      <p aria-hidden="true" className="font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">{String(i + 1).padStart(2, "0")}</p>
                      <h2 id={`${s.id}-heading`} className="font-inter text-[28px] font-medium leading-[1.2] text-ink md:text-[36px]">{s.title}</h2>
                    </div>
                    <div className={`${styles.prose} flex flex-col gap-5 font-inter text-[17px] leading-[1.8] text-black/80 md:text-lg md:leading-[1.8]`}>
                      {s.blocks.map((b, j) => <Block key={j} block={b} />)}
                    </div>
                  </section>
                ))}
              </div>

              <aside aria-labelledby="legal-more-heading" data-legal-card data-spot style={{ "--spot": "rgba(120,170,255,0.25)" } as CSSProperties} className={`${sheet.spot} relative mt-16 overflow-hidden rounded-[28px] bg-deep-blue p-6 text-white lg:mt-[100px] lg:p-10`}>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                  <HomeAsset name="manifesto-glow-red.svg" width={1059} height={1064} className="absolute -right-[480px] -top-[520px] max-w-none opacity-80" />
                </div>
                <h2 id="legal-more-heading" className="font-inter text-[26px] font-medium leading-[1.2] md:text-[32px]">Questions? We’re happy to help.</h2>
                <p className="mt-5 max-w-[560px] font-inter text-lg leading-[1.6] text-white/80">
                  {hasDirect ? "Reach our team directly, or send us a message and we’ll get back to you." : "Send us a message and we’ll get back to you."}
                </p>
                <div className="mt-7 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  <HomeButton href={ROUTES.CONTACT} tone="red" arrow>Contact our team</HomeButton>
                  <ul className="flex flex-col gap-1.5 font-inter text-base text-white/80">
                    {context.email ? <li><a href={`mailto:${context.email}`} className="text-white no-underline hover:underline underline-offset-4">{context.email}</a></li> : null}
                    {context.phone ? <li><a href={`tel:${context.phone.replace(/\s+/g, "")}`} className="text-white no-underline hover:underline underline-offset-4">{context.phone}</a></li> : null}
                  </ul>
                </div>
                <nav aria-label="Other policies" className="mt-9 grid gap-3 border-t border-white/15 pt-7 sm:grid-cols-2">
                  {others.map((l) => (
                    <Link key={l.path} href={l.path} className="group flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-lg font-medium text-white no-underline transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/[0.12] focus-visible:-translate-y-0.5 focus-visible:border-white/40 focus-visible:bg-white/[0.12]">
                      <span className="flex flex-col gap-1">
                        <span className="text-sm font-normal text-white/60">Also read</span>
                        {l.label}
                      </span>
                      <HomeAsset name="arrow-up-right.svg" width={16} height={16} className="shrink-0 opacity-60 transition-[transform,opacity] duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:translate-x-1 group-focus-visible:opacity-100" />
                    </Link>
                  ))}
                </nav>
              </aside>
            </article>
          </div>
        </section>
      </div>

      <SheetMotion />
      <LegalMotion />
    </>
  );
}
