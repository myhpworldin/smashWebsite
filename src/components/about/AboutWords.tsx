import type { ElementType } from "react";

/**
 * Text split into word spans, with spaces kept between them so it wraps and reads exactly like the plain sentence.
 * `data-story-word` (and `data-rest`, the opacity the word settles at) is what AboutMotion scrubs as the page scrolls;
 * with no JavaScript, or reduced motion, every word simply stays at its resting opacity.
 */
export function StoryWords({ text, className = "", rest = 1 }: { text: string; className?: string; rest?: number }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          <span data-story-word data-rest={rest} className={className} style={rest < 1 ? { opacity: rest } : undefined}>
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/** A line that rises out of its own mask when AboutMotion reveals it (`data-mask-line`). */
export function MaskLine({ children, as: Tag = "span", className = "" }: { children: React.ReactNode; as?: ElementType; className?: string }) {
  return (
    <Tag className={`block overflow-hidden pb-[0.12em] -mb-[0.12em] ${className}`}>
      <span data-mask-line className="block">{children}</span>
    </Tag>
  );
}
