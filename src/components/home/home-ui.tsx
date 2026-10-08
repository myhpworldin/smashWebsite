import type { ReactNode } from "react";
import Image from "next/image";
import { SweepLink } from "@/components/ui/SweepLink";

/** Redesigned Home gutter: the Figma frame's 1280px content column (80px side margins at 1440), narrower below. */
export const HOME_WRAP = "mx-auto w-full max-w-[1440px] px-4 md:px-10 xl:px-20";

/** A decorative static asset from public/media/home (the redesign's SVGs). SVGs are served as-is, so the optimizer is bypassed. */
export function HomeAsset({ name, width, height, className, alt = "" }: { name: string; width: number; height: number; className?: string; alt?: string }) {
  return <Image src={`/media/home/${name}`} width={width} height={height} alt={alt} unoptimized className={className} />;
}

/** The hero's pill buttons (Figma "Buttons": 50px tall, 36px radius, 18px), with the colour-swap hover. */
export function HomeButton({ href, tone, arrow, children }: { href: string; tone: "red" | "white"; arrow?: boolean; children: ReactNode }) {
  return <SweepLink href={href} tone={tone} arrow={arrow}>{children}</SweepLink>;
}
