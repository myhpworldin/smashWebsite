import type { Metadata } from "next";
import type { ResolvedMetadata } from "@/server/seo/metadata";

/** Map the framework-neutral result onto Next.js's Metadata object. */
export function toNextMetadata(m: ResolvedMetadata): Metadata {
  const img = (i?: { url: string; alt: string; width?: number; height?: number }) => (i ? [i] : undefined);
  return {
    title: { absolute: m.title }, // already formatted; avoids a second template
    description: m.description,
    alternates: { canonical: m.canonical },
    robots: m.robots,
    openGraph: {
      title: m.openGraph.title,
      description: m.openGraph.description,
      url: m.openGraph.url,
      siteName: m.openGraph.siteName,
      type: m.openGraph.type,
      images: img(m.openGraph.image),
      ...(m.publishedTime ? { publishedTime: m.publishedTime } : {}),
      ...(m.modifiedTime ? { modifiedTime: m.modifiedTime } : {}),
    },
    twitter: { card: m.twitter.card, title: m.twitter.title, description: m.twitter.description, images: img(m.twitter.image) },
  };
}
