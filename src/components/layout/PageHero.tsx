import type { ReactNode } from "react";
import { Asset } from "@/components/home/shared";

/**
 * The deep-blue page banner shared by Contact, Services and Careers (Figma: 1440 × 546/568, 20px bottom radius,
 * three glow ellipses, centred H1 + intro). The glows are positioned on the design's 1440px canvas and, as in the
 * design, spill faintly past the banner's bottom edge (their layer is 700px tall and clips only at the sides). The global header floats over
 * it (`HeaderFrame`). `children` is the optional action row under the intro (search box, button).
 */
export function PageHero({ id, title, description, descriptionWidth, children }: {
  id: string;
  title: string;
  description: string;
  /** The intro's max width in the design (px, as a Tailwind class such as `max-w-[760px]`). */
  descriptionWidth: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="relative isolate rounded-b-[20px] bg-deep-blue text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[700px] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-full w-[1440px] -translate-x-1/2">
        <div className="absolute left-[369px] top-[221px] h-[376px] w-[702px]">
          <Asset name="contact-glow-center.svg" width={702} height={376} className="absolute inset-[-148.94%_-79.77%] size-auto max-w-none" />
        </div>
        <div className="absolute left-[-100px] top-[130px] h-[269px] w-[400px]">
          <Asset name="contact-glow-left.svg" width={400} height={269} className="absolute inset-[-111.52%_-75%] size-auto max-w-none" />
        </div>
        <div className="absolute left-[1161px] top-[99px] h-[325px] w-[400px]">
          <Asset name="contact-glow-right.svg" width={400} height={325} className="absolute inset-[-101.54%_-82.5%] size-auto max-w-none" />
        </div>
        </div>
      </div>
      {/* 546px tall with text only, 568px with an action row (title at y=256 / 228 in the design). */}
      <div className={`mx-auto flex w-full max-w-[1440px] flex-col items-center gap-10 px-4 pb-16 pt-32 text-center md:px-10 ${children ? "xl:pb-[100px] xl:pt-[228px]" : "xl:pb-[140px] xl:pt-[256px]"}`}>
        <div className="flex flex-col items-center gap-[18px]">
          <h1 id={id} className="font-inter text-[36px] font-bold capitalize leading-[1.2] md:text-6xl md:leading-[76px]">{title}</h1>
          <p className={`font-inter text-lg leading-7 md:text-xl ${descriptionWidth}`}>{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
