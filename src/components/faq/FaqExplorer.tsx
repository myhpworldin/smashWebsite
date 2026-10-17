"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { FaqCategory } from "@/lib/faq-content";
import { ROUTES } from "@/lib/routes";
import { SHEET } from "@/components/layout/SheetHero";
import { WRAP } from "@/components/home/shared";
import { HomeButton } from "@/components/home/home-ui";
import styles from "./faq.module.css";

const norm = (text: string) => text.toLowerCase();


/**
 * The FAQ sheet: a pinned topic list with a search box on the left (above the questions below lg), and the questions
 * grouped by topic on the right, each an accordion. Nothing is hidden at rest — the server renders every question and
 * answer in the HTML, the first one open — so the page reads fully without JavaScript. Typing in the search box
 * narrows the list to the matching questions (opened, so the answer is in view); the topic list marks the group being
 * read and its links are plain in-page anchors.
 */
export function FaqExplorer({ categories, email, phone }: { categories: FaqCategory[]; email: string | null; phone: string | null }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(categories[0]?.id ?? "");
  const q = norm(query.trim());

  const shown = useMemo(
    () =>
      categories
        .map((c) => ({ ...c, items: q ? c.items.filter((i) => norm(`${i.question} ${i.answer}`).includes(q)) : c.items }))
        .filter((c) => c.items.length),
    [categories, q],
  );
  const total = shown.reduce((n, c) => n + c.items.length, 0);

  // Mark the topic being read.
  useEffect(() => {
    const sections = shown.map((c) => document.getElementById(c.id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-35% 0px -60% 0px" });
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [shown]);

  const topics = (
    <ol className="flex flex-col gap-0.5">
      {shown.map((c, i) => (
        <li key={c.id}>
          <a href={`#${c.id}`} data-active={active === c.id ? "" : undefined} className={`${styles.topic} flex items-baseline justify-between gap-3 rounded-lg py-2 pl-4 pr-3 text-[15px] leading-[1.4] no-underline`}>
            <span className="flex gap-3">
              <span aria-hidden="true" className="w-5 shrink-0 tabular-nums opacity-60">{String(i + 1).padStart(2, "0")}</span>
              {c.title}
            </span>
            <span className="text-xs tabular-nums opacity-60">{c.items.length}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  // Only the details set in Site Settings are shown, each a mailto: / tel: link.
  const contactLinks = [
    email ? { key: "email", label: email, href: `mailto:${email}` } : null,
    phone ? { key: "phone", label: phone, href: `tel:${phone.replace(/\s+/g, "")}` } : null,
  ].filter((l): l is { key: string; label: string; href: string } => l !== null);

  return (
    <section aria-label="Frequently asked questions" className={`relative z-10 bg-white pb-20 pt-14 lg:pb-[120px] lg:pt-[100px] ${SHEET}`}>
      <div className={`${WRAP} lg:grid lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-x-[72px] xl:grid-cols-[minmax(0,320px)_minmax(0,820px)] xl:justify-between`}>
        <div className="mb-10 lg:mb-0 lg:self-start [@media(min-width:1024px)_and_(min-height:640px)]:sticky [@media(min-width:1024px)_and_(min-height:640px)]:top-[100px]">
          <form role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="faq-search" className="mb-3 block font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">Search the FAQ</label>
            <div className="relative">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/45">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions"
                autoComplete="off"
                className="h-12 w-full rounded-full border border-black/15 bg-soft-grey pl-11 pr-4 font-inter text-base text-ink outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-black/45 focus:border-bright-blue focus:bg-white focus:shadow-[0_0_0_4px_rgba(0,88,200,0.12)] [&::-webkit-search-cancel-button]:cursor-pointer"
              />
            </div>
            <p role="status" aria-live="polite" className="mt-3 min-h-5 font-inter text-sm text-black/60">
              {q ? (total ? `${total} ${total === 1 ? "question matches" : "questions match"}` : "No questions match your search") : ""}
            </p>
          </form>

          <nav aria-label="FAQ topics" className="mt-6 hidden lg:block">
            <p className="mb-4 font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">Browse by topic</p>
            <div className="relative">
              <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-px bg-black/10" />
              {topics}
            </div>
          </nav>
          {/* Below lg the topics are a row of pills that scrolls sideways. */}
          <nav aria-label="FAQ topics" className="-mx-4 mt-2 overflow-x-auto px-4 lg:hidden">
            <ul className="flex w-max gap-2 pb-2">
              {shown.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="block rounded-full border border-black/15 px-4 py-2 font-inter text-sm text-ink no-underline transition-colors hover:border-bright-blue hover:text-bright-blue">{c.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="min-w-0">
          {total ? (
            <div className="flex flex-col gap-16 lg:gap-[88px]">
              {shown.map((c, ci) => (
                <section key={c.id} id={c.id} aria-labelledby={`${c.id}-heading`} className="scroll-mt-8">
                  <div className="mb-6 flex flex-col gap-3 lg:mb-8">
                    <p aria-hidden="true" className="font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">{String(ci + 1).padStart(2, "0")}</p>
                    <h2 id={`${c.id}-heading`} className="font-inter text-[28px] font-medium leading-[1.2] text-ink md:text-[36px]">{c.title}</h2>
                    <p className="font-inter text-base leading-[1.6] text-black/60 md:text-lg">{c.blurb}</p>
                  </div>
                  <div className="border-t border-black/10">
                    {c.items.map((item, i) => (
                      // Keyed by the search so a new search re-opens the matches (a <details> keeps its own open state otherwise).
                      <details key={`${q}|${item.question}`} open={q ? true : ci === 0 && i === 0} className={`${styles.item} border-b border-black/10`}>
                        <summary className="flex items-center justify-between gap-6 py-6 pl-0 lg:py-7 lg:pl-5">
                          <h3 className={`${styles.question} font-inter text-[19px] font-medium leading-[1.4] text-ink transition-colors duration-300 hover:text-bright-blue lg:text-[22px]`}>{item.question}</h3>
                          <span className={`${styles.plus} text-ink`} aria-hidden="true" />
                        </summary>
                        <div className={`${styles.answer} pb-7 pr-10 lg:pb-8 lg:pl-5`}>
                          <p className="max-w-[680px] font-inter text-[16.5px] leading-[1.75] text-black/70 lg:text-[18px]">{item.answer}</p>
                          {item.link ? (
                            <Link href={item.link.href} className="group/more mt-5 inline-flex items-center gap-2 font-inter text-base font-medium text-bright-blue no-underline">
                              <span className="underline decoration-bright-blue/35 underline-offset-4 transition-[text-decoration-color] duration-200 group-hover/more:decoration-bright-blue">{item.link.label}</span>
                              <span aria-hidden="true" className="transition-transform duration-300 group-hover/more:translate-x-1">→</span>
                            </Link>
                          ) : null}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] bg-soft-grey p-8 text-center lg:p-14">
              <h2 className="font-inter text-[24px] font-medium text-ink md:text-[30px]">We couldn’t find that one.</h2>
              <p className="mx-auto mt-3 max-w-[460px] font-inter text-lg leading-[1.6] text-black/65">Try a different word, or ask our team directly.</p>
              <div className="mt-6 flex justify-center">
                <HomeButton href={ROUTES.CONTACT} tone="red" arrow>Ask our team</HomeButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside aria-labelledby="faq-more-heading" className={`${WRAP} mt-16 lg:mt-24`}>
        <div className="flex flex-col gap-6 rounded-3xl bg-soft-grey p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-10">
          <div>
            <h2 id="faq-more-heading" className="font-inter text-[26px] font-medium leading-[1.2] text-ink md:text-[32px]">Still have a question?</h2>
            <p className="mt-3 max-w-[520px] font-inter text-base leading-[1.6] text-black/65 md:text-lg">
              {contactLinks.length ? (
                <>
                  Send us a message, or reach us at{" "}
                  {contactLinks.map((l, i) => (
                    <span key={l.key}>
                      {i ? " or " : null}
                      <a href={l.href} className="text-bright-blue no-underline transition-colors duration-200 hover:text-deep-blue focus-visible:text-deep-blue">{l.label}</a>
                    </span>
                  ))}
                  .
                </>
              ) : (
                "Send us a message and we’ll get back to you."
              )}
            </p>
          </div>
          <div className="shrink-0">
            <HomeButton href={ROUTES.CONTACT} tone="red" arrow>Contact our team</HomeButton>
          </div>
        </div>
      </aside>
    </section>
  );
}
