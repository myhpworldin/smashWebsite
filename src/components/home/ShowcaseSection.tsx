import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

const POSTER = "/media/home/showcase-poster.png";
/** The design's motion clip for this band. Drop the file here and it plays; until then the poster frame shows. */
const VIDEO = "/media/home/showcase.mp4";
const ALT = "Google Ads campaign dashboard with a rising performance chart";

/**
 * Full-bleed showcase band (Figma New Homepage, 1440×787 at y 1710): the Google Ads dashboard clip. Muted, looped,
 * inline autoplay with no controls — it is ambient, carries no audio and says nothing the page doesn't say in text.
 * The video is only referenced once its file exists, so the page never requests a missing file.
 */
export function ShowcaseSection() {
  const hasVideo = existsSync(path.join(process.cwd(), "public", VIDEO));
  return (
    <section aria-label="Campaign showcase" data-home-section="showcase" className="relative aspect-video w-full overflow-hidden bg-[#e6e9ee] lg:aspect-auto lg:h-[787px]">
      {hasVideo ? (
        <video src={VIDEO} poster={POSTER} autoPlay muted loop playsInline preload="metadata" aria-label={ALT} className="absolute inset-0 size-full object-cover" />
      ) : (
        <Image src={POSTER} alt={ALT} fill sizes="100vw" className="object-cover" />
      )}
    </section>
  );
}
