import type { CSSProperties, ReactNode } from "react";
import { HOME_WRAP } from "@/components/home/home-ui";

/** The wrap every section of the service pages sits in: Home's 1280px column. */
export const SV_WRAP = HOME_WRAP;
/** The soft pointer light on a card (`SheetMotion` moves it; `sheet.module.css` paints it). */
export const SPOT = (rgba = "rgba(0,88,200,0.10)") => ({ "--spot": rgba }) as CSSProperties;

const TONES = {
  white: "bg-white text-black",
  grey: "bg-[#f3f3f3] text-black",
  dark: "bg-[#1a1a1a] text-white",
  ink: "bg-[#0a0a0a] text-white",
} as const;

/**
 * One full-width sheet of a service page. Only the first sheet — the one that follows the sticky hero and slides over
 * it — has the rounded top; every later sheet is square and simply follows the one before.
 */
export function Sheet({ tone, labelledBy, first, compact, className = "", children }: { tone: keyof typeof TONES; labelledBy: string; first?: boolean; compact?: boolean; className?: string; children: ReactNode }) {
  // `compact` is for sections that are a heading and a row of links (related services, tools), which would otherwise be
  // mostly empty space.
  const spacing = compact ? "pb-14 pt-10 lg:pb-[104px] lg:pt-[64px]" : "pb-20 pt-14 lg:pb-[136px] lg:pt-[96px]";
  return (
    <section
      aria-labelledby={labelledBy}
      className={`relative ${first ? "rounded-t-[28px] lg:rounded-t-[48px]" : ""} ${spacing} ${TONES[tone]} ${className}`}
    >
      {children}
    </section>
  );
}

/** A heading's words, each in its own mask, so ServiceMotion can raise them one after another. The text itself is unchanged. */
export function Words({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span className="inline-block overflow-hidden align-top pb-[0.14em] -mb-[0.14em]">
            <span data-sv-w className="inline-block">{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/**
 * Heading + description, left-aligned or centred. `eyebrow` is still accepted (callers and the CMS data carry one) but is no
 * longer shown: the red label-and-dash above each heading was removed from the service pages.
 */
export function SectionHead({ heading, description, headingId, center, dark, className = "" }: { eyebrow?: string | null; heading?: string | null; description?: string | null; headingId: string; center?: boolean; dark?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col ${center ? "items-center text-center" : ""} ${className}`}>
      {heading ? (
        <h2 id={headingId} data-sv-words className={`text-[28px] font-medium leading-[1.15] tracking-tight md:text-[36px] lg:text-[42px] ${center ? "max-w-[900px]" : "max-w-[640px]"}`}>
          <Words text={heading} />
        </h2>
      ) : null}
      {/* A blank line in the copy starts a new paragraph. */}
      {description?.split(/\n\s*\n/).map((para, i) => (
        <p key={i} data-sv-up className={`${i ? "mt-4" : "mt-6"} text-[17px] leading-[1.7] lg:text-[19px] ${center ? "max-w-[760px]" : "max-w-[600px]"} ${dark ? "text-white/70" : "text-black/60"}`}>{para.trim()}</p>
      ))}
    </div>
  );
}
