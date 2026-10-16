import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { getEnv } from "@/server/config/env";
import { ShowcaseVideo } from "@/components/home/ShowcaseVideo";

const POSTER = "/media/home/showcase-poster.png";
/** The design's motion clip for this band. Drop the file here and it plays; until then the poster frame shows. */
const VIDEO = "/media/home/showcase.mp4";
const ALT = "Campaign showcase video: ad creatives, performance dashboards and results";

/**
 * The clip lives on Cloudinary when CLOUDINARY_SHOWCASE_VIDEO (its public ID, e.g. "smash-video_u8p4h5") is set.
 * Compression happens on delivery, not in the file: `f_auto:video` picks WebM or MP4 per browser, `q_auto` tunes
 * the bitrate and `w_1600` caps the width, so the uploaded original can stay untouched. The poster is the clip's
 * first frame. Only the cloud name is used here — the API key and secret are for uploading and never leave the server.
 */
function cloudinaryShowcase() {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_SHOWCASE_VIDEO: id } = getEnv();
  if (!cloud || !id) return null;
  const base = `https://res.cloudinary.com/${cloud}/video/upload`;
  return { src: `${base}/f_auto:video,q_auto,w_1600/${id}`, poster: `${base}/so_0,f_auto,q_auto,w_1600/${id}.jpg` };
}

/**
 * Showcase band: the clip held fixed while the page scrolls — no zoom, no fade, nothing animated but the page itself. The
 * section is a scroll runway (260svh) whose stage is `sticky`, so the clip stays put, in either scroll direction, while the
 * Services band (which overlaps the runway's last screen — see ServicesSection) slides up over it. On large screens the clip
 * fills the stage; below lg it is the full width of the screen at 16:9. Without JS or with reduced motion the CSS below IS the
 * finished state: a normal-height band with the clip full width, nothing pinned.
 * The clip is muted, looped and ambient — it carries no audio and says nothing the page doesn't say in text.
 */
export function ShowcaseSection() {
  const remote = cloudinaryShowcase();
  const local = !remote && existsSync(path.join(process.cwd(), "public", VIDEO));
  const media = remote ?? (local ? { src: VIDEO, poster: POSTER } : null);

  return (
    <section aria-label="Campaign showcase" data-home-section="showcase" className="relative h-[260svh] bg-white motion-reduce:h-auto">
      {remote ? <link rel="preconnect" href="https://res.cloudinary.com" /> : null}
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:py-16">
        <div className="relative aspect-video w-full overflow-hidden bg-[#0b1230] lg:aspect-auto lg:h-svh motion-reduce:lg:aspect-video motion-reduce:lg:h-auto">
          {media ? (
            <ShowcaseVideo src={media.src} poster={media.poster} label={ALT} />
          ) : (
            <Image src={POSTER} alt={ALT} fill sizes="100vw" className="object-cover" />
          )}
        </div>
      </div>
    </section>
  );
}
