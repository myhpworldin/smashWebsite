import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDb } from "@/server/db/client";
import { getSiteSettings } from "@/server/seo/request-cache";
import { listPublishedServices } from "@/server/modules/services/services.service";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { ContactForm } from "@/components/forms/ContactForm";
import { SheetHero, SHEET } from "@/components/layout/SheetHero";
import { SheetMotion } from "@/components/layout/SheetMotion";
import { MaskLine } from "@/components/about/AboutWords";
import { Asset, WRAP } from "@/components/home/shared";
import { whatsAppLink } from "@/lib/whatsapp";
import { ContactMotion } from "./ContactMotion";

// Cached and regenerated; see src/server/seo/public-cache.ts. The form posts to /api/leads, which is never cached.
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.CONTACT);
}

/** Google Maps searching for the stored, business-confirmed address: no coordinates are kept, so none are guessed. */
const mapsLink = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** One method of the "Direct Contacts" list (Figma "Direct Details Stack"): a bordered 16px-radius row, a grey 44px icon tile and, beside it, a small grey label over the value. */
const ROW = "group relative flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-5 no-underline transition-[border-color,transform,box-shadow] duration-300";
const LINK_ROW = `${ROW} hover:-translate-y-0.5 hover:border-bright-blue/40 hover:shadow-[0_10px_28px_rgba(0,88,200,0.08)] focus-visible:-translate-y-0.5 focus-visible:border-bright-blue/40`;

/** The design's blue icons (public/media/figma), each drawn at its own natural size in the tile. */
const ICONS = {
  mail: { src: "contact-direct-mail.svg", width: 20, height: 16 },
  call: { src: "contact-direct-call.svg", width: 18, height: 18 },
  whatsapp: { src: "contact-direct-whatsapp.svg", width: 18, height: 18 },
  location: { src: "contact-direct-location.svg", width: 14.7, height: 17.4 },
} as const;

function Method({ icon, label, value, href, external }: { icon: keyof typeof ICONS; label: string; value: ReactNode; href?: string; external?: boolean }) {
  const i = ICONS[icon];
  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-soft-grey">
        <Asset name={i.src} width={i.width} height={i.height} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2 font-inter leading-[normal]">
        <span className="text-sm text-black/70">{label}</span>
        <span className="break-words text-lg text-black">{value}</span>
      </span>
    </>
  );
  return href ? (
    <a href={href} className={LINK_ROW} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a>
  ) : (
    <div className={ROW}>{body}</div>
  );
}

/**
 * Contact, redesigned in the Home page's language (the same hero and sheets as About — SheetHero / SheetMotion — plus
 * the scroll-paced motion in ContactMotion). The words are unchanged: the hero, "Tell us about your enterprise / Submit
 * a Strategy Request", the form (ContactForm — behaviour untouched) and the Direct Contacts.
 *
 * PAGE_SPECIFICATIONS.md §13: no LocalBusiness/Organization claim without a verified address/hours, so no
 * page-level JSON-LD. Direct contacts render only the `SiteSettings.contact` fields that exist — nothing is
 * invented; WhatsApp appears once a number is configured.
 *
 * Layout: the hero is sticky and the request sheet slides over it. On large screens the heading and the Direct
 * Contacts card stay pinned at the left while the (long) form scrolls at the right; below lg it reads heading → form →
 * contacts, so the form is never pushed below the contact details.
 */
export default async function ContactPage() {
  const [settings, servicesResult] = await Promise.all([
    getSiteSettings(),
    listPublishedServices(getDb(), { page: 1, limit: 50 }),
  ]);
  const contact = settings?.contact;
  const services = servicesResult.items.map((s) => ({ name: s.name, slug: s.slug }));
  const hasDirect = !!(contact?.email || contact?.phone || contact?.whatsapp || contact?.address);

  return (
    <>
      <div data-sheet-top data-mist-host className="relative">
        <SheetHero
          id="contact-heading"
          title="Ready to Grow? Let’s Connect."
          description="Whether you’re looking to build your brand, generate more leads, or scale your business, our team is ready to hear what you’re working towards."
          descriptionWidth="max-w-[826px]"
          image="/media/contactus-banner.png"
        />

        <section aria-labelledby="request-heading" data-contact className={`relative z-10 min-h-svh bg-white pb-20 pt-20 lg:pb-[140px] lg:pt-[120px] ${SHEET}`}>
          <div className={`${WRAP} grid gap-10 lg:grid-cols-[minmax(0,480fr)_minmax(0,720fr)] lg:gap-x-16`}>
            {/* Below lg this wrapper disappears (display: contents), so its two children are ordered with the form between them. */}
            <div className="contents lg:flex lg:flex-col lg:gap-10 lg:self-start [@media(min-width:1024px)_and_(min-height:820px)]:sticky [@media(min-width:1024px)_and_(min-height:820px)]:top-[100px]">
              <div className="order-1 flex flex-col gap-3">
                <p data-contact-eyebrow className="font-inter text-sm font-semibold uppercase leading-[normal] text-eyebrow">Tell us about your enterprise</p>
                <h2 className="font-inter text-[32px] font-medium leading-[1.15] text-ink md:text-[44px]">
                  <MaskLine as="span"><span id="request-heading">Submit a Strategy Request</span></MaskLine>
                </h2>
              </div>
              {hasDirect ? (
                <aside aria-labelledby="direct-heading" data-contact-card className="order-3 flex flex-col gap-6">
                  <h2 id="direct-heading" className="font-inter text-[26px] font-medium leading-[normal] text-main-black">Direct Contacts</h2>
                  <address data-contact-rows className="flex flex-col gap-6 not-italic">
                    {contact?.email ? <Method icon="mail" label="Email Our Team" value={contact.email} href={`mailto:${contact.email}`} /> : null}
                    {contact?.phone ? <Method icon="call" label="Call Us Directly" value={contact.phone} href={`tel:${contact.phone}`} /> : null}
                    {contact?.whatsapp ? <Method icon="whatsapp" label="Message Directly" value={contact.whatsapp} href={whatsAppLink(contact.whatsapp)} external /> : null}
                    {contact?.address ? <Method icon="location" label="Location" value={contact.address} href={mapsLink(contact.address)} external /> : null}
                  </address>
                </aside>
              ) : null}
            </div>
            <div className="order-2 lg:col-start-2 lg:row-start-1">
              <ContactForm services={services} />
            </div>
          </div>
        </section>
      </div>

      <SheetMotion />
      <ContactMotion />
    </>
  );
}
