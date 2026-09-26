import { serializeJsonLd, type JsonLd as JsonLdData } from "@/server/seo/schema";

/** Renders structured data. The serializer escapes "<" so content can never close the script tag. */
export function JsonLd({ data }: { data: JsonLdData[] }) {
  return (
    <>
      {data.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }} />
      ))}
    </>
  );
}
