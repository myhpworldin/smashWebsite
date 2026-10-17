import { getEnv } from "@/server/config/env";
import { ShowcaseVideo } from "@/components/home/ShowcaseVideo";

const ALT = "Campaign showcase video: ad creatives, performance dashboards and results";

/**
 * The Home clip's Cloudinary account and public ID. Both are public identifiers (they are in every delivery URL, and the page
 * HTML), not secrets, so they are the defaults here: the video then plays on any host without dashboard set-up, instead of
 * quietly falling back to the still poster when the two CLOUDINARY_* variables were never added to the hosting environment (as
 * happened on the first deploy). CLOUDINARY_CLOUD_NAME / CLOUDINARY_SHOWCASE_VIDEO still override them, to switch the clip.
 */
const DEFAULT_CLOUD = "dkhp61uik";
const DEFAULT_VIDEO_ID = "smash-video_u8p4h5";

/**
 * Compression happens on delivery, not in the file: `f_auto:video` picks WebM or MP4 per browser, `q_auto` tunes
 * the bitrate and `w_1600` caps the width, so the uploaded original can stay untouched. The poster is the clip's
 * first frame. Only the cloud name is used here — the API key and secret are for uploading and never leave the server.
 */
function cloudinaryShowcase() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_SHOWCASE_VIDEO } = getEnv();
  const cloud = CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD;
  const id = CLOUDINARY_SHOWCASE_VIDEO || DEFAULT_VIDEO_ID;
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
  const media = cloudinaryShowcase();

  return (
    <section aria-label="Campaign showcase" data-home-section="showcase" className="relative h-[260svh] bg-white motion-reduce:h-auto">
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden motion-reduce:static motion-reduce:h-auto motion-reduce:py-16">
        <div className="relative aspect-video w-full overflow-hidden bg-[#0b1230] lg:aspect-auto lg:h-svh motion-reduce:lg:aspect-video motion-reduce:lg:h-auto">
          <ShowcaseVideo src={media.src} poster={media.poster} label={ALT} />
        </div>
      </div>
    </section>
  );
}
