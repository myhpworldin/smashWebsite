"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SectionHead, SV_WRAP, Sheet } from "./service-ui";
import styles from "./service.module.css";

/**
 * The FAQ as an accordion that eases open and shut (GSAP height), the first question open. Each question is a real
 * button wired to its answer (`aria-expanded` / `aria-controls`); collapsed answers are hidden from assistive tech.
 * Without scripts every answer is simply shown. The FAQPage structured data is emitted by the page from the same
 * `faqs` array, so what is marked up and what is rendered never differ.
 */
export function ServiceFaq({ items, headingId }: { items: { question: string; answer: string }[]; headingId: string }) {
  const [open, setOpen] = useState<number | null>(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const mounted = useRef(false);

  // First paint of the collapsed state, no animation.
  useLayoutEffect(() => {
    panels.current.forEach((panel, i) => {
      if (panel) gsap.set(panel, i === 0 ? { height: "auto", visibility: "visible" } : { height: 0, visibility: "hidden" });
    });
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panels.current.forEach((panel, i) => {
      if (!panel) return;
      if (i === open) {
        gsap.set(panel, { visibility: "visible" });
        gsap.to(panel, { height: "auto", duration: quick ? 0 : 0.55, ease: "power3.out", overwrite: true });
      } else {
        gsap.to(panel, { height: 0, duration: quick ? 0 : 0.4, ease: "power3.inOut", overwrite: true, onComplete: () => void gsap.set(panel, { visibility: "hidden" }) });
      }
    });
  }, [open]);

  if (!items.length) return null;
  return (
    <Sheet tone="grey" labelledBy={headingId}>
      <div className={SV_WRAP}>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-[140px] lg:self-start">
            <SectionHead eyebrow="FAQ" heading="Frequently Asked Questions" headingId={headingId} />
          </div>
          <div data-sv-stagger className="border-t border-black/15">
            {items.map((faq, i) => {
              const expanded = open === i;
              return (
                <div key={faq.question} className="border-b border-black/15">
                  <h3>
                    <button
                      type="button"
                      id={`${headingId}-q${i}`}
                      aria-expanded={expanded}
                      aria-controls={`${headingId}-a${i}`}
                      onClick={() => setOpen(expanded ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left text-[19px] font-medium leading-[1.4] text-black transition-colors hover:text-bright-blue lg:py-7 lg:text-[22px]"
                    >
                      <span>{faq.question}</span>
                      <span className={`${styles.plus} relative block size-4 shrink-0 text-black transition-colors group-hover:text-bright-blue`} aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`${headingId}-a${i}`} role="region" aria-labelledby={`${headingId}-q${i}`} ref={(el) => { panels.current[i] = el; }} className="overflow-hidden">
                    <p className="max-w-[640px] pb-7 text-[16.5px] leading-[1.75] text-black/65 lg:text-[18px]">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
