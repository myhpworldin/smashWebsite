import { canonicalUrl, ROUTES } from "@/lib/routes";
import { absoluteUrl, type SiteSeoContext } from "@/server/seo/metadata";
import { buildBreadcrumbs, type Crumb } from "@/server/seo/breadcrumbs";
import { LEGAL_NAME } from "@/lib/company";

/**
 * schema.org JSON-LD builders. Each emits only fields backed by stored content;
 * nothing is invented (no ratings, prices, opening hours, coordinates, awards, areas served). The office address is
 * emitted only as stored in Site Settings, which the business has confirmed. Opening hours and coordinates are left
 * out until the business supplies them (final audit, 2026-10-23).
 * They return plain objects; render with serializeJsonLd().
 */
export type JsonLd = Record<string, unknown>;
const CONTEXT = "https://schema.org";

function compact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(compact).filter((v) => v !== undefined) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = compact(v);
      const empty = c === undefined || c === null || c === "" || (Array.isArray(c) && !c.length);
      if (!empty) out[k] = c;
    }
    return out as T;
  }
  return value;
}

const siteRoot = (site: SiteSeoContext) => canonicalUrl(ROUTES.HOME, site.siteUrl);
/**
 * The stored office address as a PostalAddress. Site Settings keeps it as one line, so only the parts that can be read
 * from it without guessing are split out: the 6-digit PIN code, the country (every SMASH address is in India), and the
 * city and state when the line itself names them (Kochi; Kerala, which the stored address spells "Keralam").
 */
export function postalAddress(address: string | undefined) {
  const text = address?.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  const pin = text.match(/\b\d{6}\b(?=\D*$)/)?.[0];
  const street = pin ? text.replace(new RegExp(`[,\\s]*${pin}\\s*$`), "") : text;
  const locality = /\bKochi\b/i.test(text) ? "Kochi" : undefined;
  const region = /\bKerala(m)?\b/i.test(text) ? "Kerala" : undefined;
  return { "@type": "PostalAddress", streetAddress: street, addressLocality: locality, addressRegion: region, postalCode: pin, addressCountry: "IN" };
}

/**
 * The organisation's logo for search results: the white SMASH logo set on the brand's deep blue, because Google shows
 * the logo on a white background where the site's own (white, transparent) logo files would be invisible. A logo saved
 * in Site Settings takes precedence.
 */
export const SCHEMA_LOGO = { url: "/media/smash-logo-schema.png", width: 1200, height: 1200 } as const;

/** One stable id for the business, so other nodes (a Service's provider) point at the same entity. */
export const organizationId = (site: SiteSeoContext) => `${siteRoot(site)}#organization`;

const orgRef = (site: SiteSeoContext) => ({ "@type": "ProfessionalService", "@id": organizationId(site), name: site.siteName, url: siteRoot(site) });

/**
 * The business on the Home page, as a ProfessionalService: a schema.org LocalBusiness (and so an Organization) subtype
 * that fits an agency with a staffed office clients visit. Only verified details: name, legal name, URL, logo, the
 * stored address, phone and email, and official profiles once Site Settings holds them.
 */
export function organizationJsonLd(site: SiteSeoContext): JsonLd {
  const { email, phone, address } = site.contact ?? {};
  const logo = absoluteUrl(site.logo?.url ?? SCHEMA_LOGO.url, site.siteUrl);
  return compact({
    "@context": CONTEXT,
    "@type": "ProfessionalService",
    "@id": organizationId(site),
    name: site.siteName,
    legalName: LEGAL_NAME,
    description: site.siteDescription,
    url: siteRoot(site),
    logo,
    image: logo,
    telephone: phone,
    email,
    sameAs: site.socialLinks?.map((l) => l.url).filter((u) => /^https?:\/\//.test(u)),
    contactPoint: email || phone ? { "@type": "ContactPoint", contactType: "customer service", email, telephone: phone } : undefined,
    address: postalAddress(address ?? undefined),
  });
}

export function serviceJsonLd(site: SiteSeoContext, s: { name: string; description?: string; path: string }): JsonLd | null {
  if (!s.name?.trim()) return null; // fail safe: no name, no Service
  return compact({
    "@context": CONTEXT,
    "@type": "Service",
    name: s.name,
    description: s.description,
    url: canonicalUrl(s.path, site.siteUrl),
    provider: orgRef(site),
  });
}

export function articleJsonLd(
  site: SiteSeoContext,
  a: { headline: string; description?: string; path: string; imageUrl?: string; authorName?: string; publishedAt?: Date | null; updatedAt?: Date | null },
): JsonLd | null {
  // Fail safe: an Article without a headline or publication date is not emitted; nothing is guessed.
  if (!a.headline?.trim() || !a.publishedAt) return null;
  const url = canonicalUrl(a.path, site.siteUrl);
  return compact({
    "@context": CONTEXT,
    "@type": "Article",
    headline: a.headline,
    description: a.description,
    image: a.imageUrl ? absoluteUrl(a.imageUrl, site.siteUrl) : undefined,
    author: a.authorName ? { "@type": "Person", name: a.authorName } : undefined,
    publisher: orgRef(site),
    datePublished: a.publishedAt?.toISOString(),
    dateModified: (a.updatedAt ?? a.publishedAt).toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  });
}

/** A crumb with no live page (`path: null`) omits `item` rather than link to a URL that 404s — structured data must match what's actually reachable. */
export function breadcrumbJsonLd(site: SiteSeoContext, crumbs: Crumb[]): JsonLd | null {
  if (crumbs.length < 2) return null; // a lone "Home" crumb adds nothing
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => compact({ "@type": "ListItem", position: i + 1, name: c.name, item: c.path ? canonicalUrl(c.path, site.siteUrl) : undefined })),
  };
}

/** Pass exactly the FAQs the page renders. Returns null when there are none. */
export function faqJsonLd(faqs: { question: string; answer: string }[]): JsonLd | null {
  if (!faqs.length) return null;
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

const present = (list: (JsonLd | null)[]) => list.filter((x): x is JsonLd => x !== null);

export const homeJsonLd = (site: SiteSeoContext) => [organizationJsonLd(site)];

type PageOptions = { breadcrumbs?: boolean };

export const servicePageJsonLd = (
  site: SiteSeoContext,
  s: { name: string; slug: string; shortDescription: string; faqs?: { question: string; answer: string }[] },
  { breadcrumbs = true }: PageOptions = {},
) => {
  const path = ROUTES.SERVICE(s.slug);
  return present([
    serviceJsonLd(site, { name: s.name, description: s.shortDescription, path }),
    breadcrumbs ? breadcrumbJsonLd(site, buildBreadcrumbs(path, s.name)) : null,
    faqJsonLd(s.faqs ?? []),
  ]);
};

export const caseStudyPageJsonLd = (site: SiteSeoContext, c: { title: string; slug: string }, { breadcrumbs = true }: PageOptions = {}) =>
  present([breadcrumbs ? breadcrumbJsonLd(site, buildBreadcrumbs(ROUTES.CASE_STUDY(c.slug), c.title)) : null]);

/**
 * BreadcrumbList only — no JobPosting. `Career.datePosted`/`validThrough` don't
 * exist on the model (CMS_CONTENT_MAP.md §3: "Required by Google's JobPosting
 * schema; without them the schema cannot be emitted honestly"), so it is
 * correctly withheld rather than emitted with guessed dates.
 */
export const careerPageJsonLd = (site: SiteSeoContext, c: { title: string; slug: string }, { breadcrumbs = true }: PageOptions = {}) =>
  present([breadcrumbs ? breadcrumbJsonLd(site, buildBreadcrumbs(ROUTES.CAREER(c.slug), c.title)) : null]);

export const insightPageJsonLd = (
  site: SiteSeoContext,
  i: { title: string; slug: string; excerpt: string; featuredImage?: { url: string } | null; author?: { name: string } | null; publishedAt?: Date | null; updatedAt?: Date | null },
  { breadcrumbs = true }: PageOptions = {},
) => {
  const path = ROUTES.INSIGHT(i.slug);
  return present([
    articleJsonLd(site, { headline: i.title, description: i.excerpt, path, imageUrl: i.featuredImage?.url, authorName: i.author?.name, publishedAt: i.publishedAt, updatedAt: i.updatedAt }),
    breadcrumbs ? breadcrumbJsonLd(site, buildBreadcrumbs(path, i.title)) : null,
  ]);
};

/** Safe for inline <script type="application/ld+json">: no "</script>" or "<!--" breakout, no raw line separators. */
export const serializeJsonLd = (data: JsonLd | JsonLd[]) =>
  JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
