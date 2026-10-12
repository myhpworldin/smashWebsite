import Image from "next/image";
import Link from "next/link";
import { HomeAsset } from "./home-ui";
import { isLive, type HomeSection } from "./shared";
import styles from "./OurStory.module.css";

/** The design's photograph (Figma component "Rectangle 34625622": the same image in both variants, framed differently). */
const PHOTO = "/media/home/our-story-team.jpg";

/**
 * "Our Story" (Figma New Homepage, group 671:660): on large screens the photo first fills the band edge to edge and,
 * as the page scrolls, shrinks into its window at the left to uncover the story beside it — heading, lead line, the
 * story, and "More About Us" (OurStory.module.css for the geometry, HomeAnimations for the scrubbed motion). Below lg
 * it is a plain stack: the photo in its window's proportions — zoomed to the design's closer crop, which also keeps the
 * source photo's corner watermark out of frame, as every Figma crop does — then the text. Words and the link come
 * from the CMS.
 */
export function OurStory({ data }: { data: HomeSection<"ourStory"> }) {
  const cta = data.cta;
  return (
    <section aria-labelledby="our-story-heading" data-home-section="our-story" data-story className={`${styles.section} max-lg:py-16`}>
      <div data-story-stage className={`${styles.stage} max-lg:mx-auto max-lg:flex max-lg:max-w-[760px] max-lg:flex-col max-lg:gap-10 max-lg:px-4 md:max-lg:px-10`}>
        <div data-story-frame className={`${styles.frame} max-lg:relative max-lg:aspect-[702/680] max-lg:overflow-hidden`}>
          <Image
            data-story-photo
            src={PHOTO}
            alt=""
            width={736}
            height={736}
            sizes="100vw"
            className={`${styles.photo} max-lg:absolute max-lg:inset-0 max-lg:size-full max-lg:origin-[52%_94%] max-lg:scale-[1.18] max-lg:object-cover`}
          />
        </div>
        <div data-story-text className={`${styles.text} flex flex-col gap-[30px]`}>
          <div className="flex flex-col gap-[26px]">
            {data.heading ? <h2 id="our-story-heading" className="text-[32px] font-medium leading-[1.2] text-black lg:text-[42px]">{data.heading}</h2> : null}
            <div className="flex flex-col gap-2.5 leading-[1.7]">
              {data.lead ? <p className="text-lg font-medium text-black/60 lg:text-xl">{data.lead}</p> : null}
              {data.description ? <p className="whitespace-pre-line text-base text-black lg:text-lg">{data.description}</p> : null}
            </div>
          </div>
          {cta && isLive(cta.target) ? (
            <Link href={cta.target} className="group inline-flex w-fit items-center gap-4 text-xl text-smash-red no-underline">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">{cta.label}</span>
              <HomeAsset name="arrow-up-right-red.svg" width={17.28} height={17.28} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
