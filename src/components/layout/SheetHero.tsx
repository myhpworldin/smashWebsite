import type { ReactNode } from "react";
import Image from "next/image";
import { HeroAtmosphere } from "@/components/home/HeroAtmosphere";
import { HomeAsset } from "@/components/home/home-ui";
import styles from "./sheet.module.css";

/** The rounded top every sheet shares: Home's About slides up over its hero with these corners. */
export const SHEET = "rounded-t-[28px] lg:rounded-t-[48px]";

/**
 * The hero of the redesigned inner pages (About, Contact), in the Home hero's language: black with the same blue
 * glows drifting like mist (HeroAtmosphere), the heading set large with its sparkle after the last word, then the
 * intro (and an optional action row) and the scroll cue. The page's banner photo (optional) sits faintly under the glows, fading in from the bottom.
 * `backdrop` is an optional decorative layer between the glows and the text
 * (the service pages' Three.js point field).
 *
 * The section is `sticky` and the next section (the first sheet, `SHEET`) slides up over it, so as the page scrolls
 * the hero stays put and is covered — the same hand-over as Home's hero → About. The page wraps the hero and that
 * first sheet in `<div data-sheet-top data-mist-host className="relative">`; SheetMotion lifts and fades the content
 * and slowly pushes the photo in while that happens. The load-in (words rising out of masks, then the intro and
 * cue) is pure CSS — it runs before hydration and nothing is hidden waiting for scripts.
 */
export function SheetHero({ id, title, description, image, backdrop, descriptionWidth = "max-w-[760px]", children }: { id: string; title: string; description?: string | null; image?: string | null; backdrop?: ReactNode; descriptionWidth?: string; children?: ReactNode }) {
  const words = title.trim().split(/\s+/);
  const lastIndex = words.length - 1;
  // A long title (several words) is set a size smaller so it still breaks over two lines.
  const long = title.length > 18;
  return (
    <section aria-labelledby={id} data-sheet-hero className="sticky top-0 isolate flex h-svh min-h-[600px] flex-col items-center justify-center overflow-hidden bg-black px-4 text-center text-white md:px-10">
      <HeroAtmosphere />
      {image ? (
        <div aria-hidden="true" data-sheet-banner className="absolute inset-0 -z-5 opacity-30 [mask-image:linear-gradient(to_bottom,transparent_5%,black_75%)]">
          <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      {backdrop}

      <div data-sheet-hero-content className="relative z-[2] flex max-w-[1100px] flex-col items-center">
        <h1 id={id} className={`capitalize leading-[1.2] [text-shadow:0_4px_66px_rgba(0,0,0,0.28)] ${long ? "text-[40px] sm:text-[56px] lg:text-[80px] lg:leading-[1.18]" : "text-[44px] sm:text-[64px] lg:text-[96px] lg:leading-[1.18]"}`}>
          {words.map((word, i) => (
            <span key={`${word}-${i}`}>
              <span className={styles.word}>
                <span className={`${styles.wordInner} ${i === lastIndex ? "whitespace-nowrap" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                  {word}
                  {i === lastIndex ? <HomeAsset name="hero-sparkle.svg" width={28} height={28} className="ml-3 inline-block size-5 align-top lg:ml-[30px] lg:mt-3 lg:size-7" /> : null}
                </span>
              </span>
              {i < lastIndex ? " " : null}
            </span>
          ))}
        </h1>
        {description ? (
          <p style={{ "--d": "1000ms" } as React.CSSProperties} className={`${styles.fadeUp} mt-6 text-lg leading-7 text-white/75 lg:mt-8 lg:text-[23px] lg:leading-9 ${descriptionWidth}`}>
            {description}
          </p>
        ) : null}
        {/* An optional action row under the intro (Services' search box), fading up after it. */}
        {children ? <div style={{ "--d": "1200ms" } as React.CSSProperties} className={`${styles.fadeUp} mt-8 flex w-full flex-col items-center lg:mt-10`}>{children}</div> : null}
      </div>

      <div aria-hidden="true" data-sheet-cue style={{ "--d": "1500ms" } as React.CSSProperties} className={`${styles.fadeUp} absolute bottom-10 left-1/2 z-[2] flex -translate-x-1/2 flex-col gap-0.5 lg:bottom-[60px]`}>
        {["scroll-chevron-faded.svg", "scroll-chevron.svg"].map((name) => (
          <span key={name} className="flex h-[9px] w-[18px] items-center justify-center">
            <HomeAsset name={name} width={9} height={18} className="max-w-none rotate-90" />
          </span>
        ))}
      </div>
    </section>
  );
}
