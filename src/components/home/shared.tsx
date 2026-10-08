import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { LIVE_STATIC_ROUTES } from "@/lib/routes";
import type { HomeResponse } from "@/server/api/home.dto";
import type { PublicMedia } from "@/server/media/public";

/** One non-null section of the public Home payload (`GET /api/home`); sections with nothing to show arrive as `null` and are skipped by the page. */
export type HomeSection<K extends keyof HomeResponse> = NonNullable<HomeResponse[K]>;
/** A call to action as the API returns it. */
export type HomeCta = { label: string; target: string };

/**
 * A CMS image filling its (relatively positioned) parent. Alt text and eager/lazy loading come from the media
 * record. `reveal: true` tags it `data-reveal="image"` for `HomeAnimations`' generic scroll-reveal system (a
 * gentle fade + scale-in the first time it enters the viewport) — opt-in and omitted by default so this stays a
 * no-op everywhere outside Home, and skipped on the Hero's own background photo (priority/LCP) deliberately.
 */
export function FillImage({ media, sizes, className, reveal }: { media: PublicMedia; sizes: string; className?: string; reveal?: boolean }) {
  return (
    <Image
      src={media.url}
      alt={media.decorative ? "" : media.alt}
      fill
      sizes={sizes}
      priority={media.loading === "eager"}
      className={className}
      {...(reveal ? { "data-reveal": "image" } : {})}
    />
  );
}

/** Paragraphs from a stored text block: blank-line separated. */
export const paragraphs = (text: string | null | undefined) => (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

/** Page gutter: 60px at the 1440 design width, narrower below. */
export const WRAP = "mx-auto w-full max-w-[1440px] px-4 md:px-10 xl:px-[60px]";

/** A decorative static asset from public/media/figma (icons, arrows). SVGs are served as-is, so the optimizer is bypassed. */
export function Asset({ name, width, height, className, alt = "" }: { name: string; width: number; height: number; className?: string; alt?: string }) {
  return <Image src={`/media/figma/${name}`} width={width} height={height} alt={alt} unoptimized className={className} />;
}

/** True when the route has a page, so a link to it can never 404 (same rule as the header and footer). */
export const isLive = (href: string) => href.startsWith("http") || LIVE_STATIC_ROUTES.includes(href) || /^\/(services|work|insights|careers)\/[^/]+$/.test(href);

type Tone = "red" | "outline" | "white";
const TONES: Record<Tone, string> = {
  red: "bg-smash-red text-white font-semibold",
  outline: "border border-smash-red bg-white text-smash-red font-medium",
  white: "bg-white text-bright-blue font-medium",
};

/**
 * The design's pill button (18px, 50px tall, fully rounded), with the design's arrow where it has one.
 * A restrained, site-wide hover: a slight lift + opacity dip, with the arrow (where present) nudging forward —
 * pure CSS transitions (no GSAP/JS), so every button on every page gets the same consistent interaction language
 * for free, including outside Home. Dimensions are untouched; only transform/opacity move.
 */
export function PillLink({ href, tone, arrow, children, className = "" }: { href: string; tone: Tone; arrow?: "white" | "blue"; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex h-[50px] items-center justify-center gap-2.5 whitespace-nowrap rounded-[36px] px-5 py-3 font-manrope text-lg leading-none no-underline transition-[opacity,transform] duration-200 ease-out hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 ${TONES[tone]} ${className}`}
    >
      {children}
      {arrow ? (
        <span className="inline-flex transition-transform duration-200 ease-out group-hover:translate-x-1">
          <Asset name={arrow === "white" ? "arrow-1.svg" : "arrow-2.svg"} width={16} height={10} />
        </span>
      ) : null}
    </Link>
  );
}

/** Eyebrow + H2, left-aligned or centered. `size` picks the design's two heading sizes (42px, or 48px for the Growth Engine title). */
export function SectionHeading({ eyebrow, heading, id, align = "left", tone = "dark", className = "" }: {
  eyebrow?: string | null;
  heading?: string | null;
  id: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div data-reveal="fade-up" className={`flex flex-col gap-4 ${centered ? "items-center text-center" : "items-start"} ${className}`}>
      {eyebrow ? <p className={`font-inter text-sm font-semibold uppercase leading-[normal] ${tone === "light" ? "text-white" : "text-eyebrow"}`}>{eyebrow}</p> : null}
      {heading ? (
        <h2 id={id} className={`font-inter text-[28px] font-medium leading-[1.2] md:text-[42px] ${tone === "light" ? "text-white" : "text-ink"}`}>
          {heading}
        </h2>
      ) : null}
    </div>
  );
}

/** The 60px rounded icon tile used on cards. */
export function IconTile({ children, className = "", tone = "light" }: { children: ReactNode; className?: string; tone?: "light" | "glass" }) {
  return (
    <div className={`grid size-[60px] shrink-0 place-items-center rounded-2xl border ${tone === "glass" ? "border-black/20 bg-white/40" : "border-black/30 bg-white"} ${className}`}>{children}</div>
  );
}
