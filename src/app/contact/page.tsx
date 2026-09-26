import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDb } from "@/server/db/client";
import { getSiteSettings } from "@/server/seo/request-cache";
import { listPublishedServices } from "@/server/modules/services/services.service";
import { staticPageMetadata } from "@/server/seo/next-metadata";
import { ROUTES } from "@/lib/routes";
import { ContactForm } from "@/components/forms/ContactForm";
import { PageHero } from "@/components/layout/PageHero";
import { Asset, SectionHeading, WRAP } from "@/components/home/shared";
import { whatsAppLink } from "@/lib/whatsapp";
import styles from "./contact.module.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(ROUTES.CONTACT);
}

const CARD = "flex items-center gap-4 rounded-2xl border border-black/10 p-5 no-underline";
const LINK_CARD = `${CARD} transition-colors hover:bg-soft-grey focus-visible:bg-soft-grey`;

function Method({ icon, label, value, href, external }: { icon: string; label: string; value: ReactNode; href?: string; external?: boolean }) {
  const body = (
    <>
      <span className={styles.tile}><Asset name={icon} width={22} height={22} /></span>
      <span className="flex min-w-0 flex-col gap-1.5 font-inter leading-[normal]">
        <span className="text-sm leading-[normal] text-black/70">{label}</span>
        <span className="break-words text-lg font-medium leading-[normal] text-black">{value}</span>
      </span>
    </>
  );
  return href ? (
    <a href={href} className={LINK_CARD} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a>
  ) : (
    <div className={CARD}>{body}</div>
  );
}

/**
 * PAGE_SPECIFICATIONS.md §13: no LocalBusiness/Organization claim without a verified address/hours, so no
 * page-level JSON-LD. Direct contacts render only the `SiteSettings.contact` fields that exist — nothing is
 * invented; WhatsApp appears once a number is configured.
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
      <PageHero
        id="contact-heading"
        title="Ready to Grow? Let’s Connect."
        description="Whether you’re looking to build your brand, generate more leads, or scale your business, our team is ready to hear what you’re working towards."
        descriptionWidth="max-w-[826px]"
      />

      <section aria-labelledby="request-heading" className={`${WRAP} py-16 lg:py-[120px]`}>
        <SectionHeading eyebrow="Tell us about your enterprise" heading="Submit a Strategy Request" id="request-heading" className="!gap-3" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,740fr)_minmax(0,501fr)] lg:gap-20">
          <ContactForm services={services} />
          {hasDirect ? (
            <aside aria-labelledby="direct-heading" className="flex flex-col gap-6">
              <h2 id="direct-heading" className="font-inter text-[26px] font-medium leading-[normal] text-deep-blue">Direct Contacts</h2>
              <address className="flex flex-col gap-6 not-italic">
                {contact?.email ? <Method icon="contact-mail.svg" label="Email Our Team" value={contact.email} href={`mailto:${contact.email}`} /> : null}
                {contact?.phone ? <Method icon="contact-call.svg" label="Call Us Directly" value={contact.phone} href={`tel:${contact.phone}`} /> : null}
                {contact?.whatsapp ? <Method icon="contact-whatsapp.svg" label="Message Directly" value={contact.whatsapp} href={whatsAppLink(contact.whatsapp)} external /> : null}
                {contact?.address ? <Method icon="contact-location.svg" label="Location" value={contact.address} /> : null}
              </address>
            </aside>
          ) : null}
        </div>
      </section>
    </>
  );
}
