import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/server/seo/request-cache";
import { logger } from "@/server/lib/logger";
import { LIVE_STATIC_ROUTES, ROUTES } from "@/lib/routes";
import { whatsAppLink } from "@/lib/whatsapp";
import { Asset, WRAP } from "@/components/home/shared";

type FooterLink = { label: string; path: string };

/** The design's two link columns. A page that is not built yet is shown as plain text, never linked (it would 404). */
const QUICK_LINKS: FooterLink[] = [
  { label: "Home", path: ROUTES.HOME },
  { label: "About Us", path: ROUTES.ABOUT },
  { label: "Services", path: ROUTES.SERVICES },
  { label: "FAQs", path: "/faqs" },
];
const COMPANY_LINKS: FooterLink[] = [
  { label: "Contact Us", path: ROUTES.CONTACT },
  { label: "Our Team", path: "/team" },
  { label: "Our Works", path: ROUTES.WORK },
  { label: "Careers", path: ROUTES.CAREERS },
];
/** The three Legal pages (Stage 4, Phase 7) — real, built routes; their content is pending approval, but the page itself isn't. */
const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms & Conditions", path: ROUTES.TERMS },
  { label: "Privacy Policy", path: ROUTES.PRIVACY_POLICY },
  { label: "Cookie Policy", path: ROUTES.COOKIE_POLICY },
];
const SOCIAL_ICONS: Record<string, string> = { instagram: "instagram.svg", twitter: "twitter.svg", x: "twitter.svg", linkedin: "linkedin-1.svg" };

function LinkList({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex w-[180px] flex-col gap-4">
      <p className="font-inter text-base font-semibold uppercase leading-[1.21] text-white">{title}</p>
      <ul className="flex flex-col gap-2.5 font-inter text-base leading-[1.21] text-white">
        {links.map((l) => (
          <li key={l.label}>{LIVE_STATIC_ROUTES.includes(l.path) ? <Link href={l.path} className="no-underline hover:underline">{l.label}</Link> : l.label}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Global footer, laid out as designed (navy band: logo, two link columns, contact, legal/social/copyright row).
 * Contact details and social links come from real SiteSettings — never hardcoded values (phase brief §17) — and
 * a missing group is simply omitted. A settings failure is logged and degrades to the settings-less layout,
 * never rethrown: the footer renders on every page, including the 404 and error pages themselves.
 */
export async function Footer() {
  const settings = await getSiteSettings().catch((err) => {
    logger.warn("Footer: site settings unavailable, rendering without them", { error: err instanceof Error ? err.message : String(err) });
    return null;
  });
  const contact = settings?.contact;
  const social = (settings?.socialLinks ?? []).map((link) => ({ ...link, icon: SOCIAL_ICONS[link.platform.toLowerCase()] }));

  return (
    <footer className="bg-navy text-white">
      <div className={WRAP}>
        <hr className="m-0 border-white/20" />
        <div className="pt-[59px]">
        <div className="flex flex-col gap-10 pb-10 lg:flex-row lg:justify-between lg:pb-[39px]">
          <Link href={ROUTES.HOME} aria-label="SMASH home" className="shrink-0">
            <Image src="/media/figma/smash-logo-2.png" alt="SMASH" width={171} height={64} className="h-16 w-[171px]" />
          </Link>
          <div className="flex flex-wrap gap-x-[50px] gap-y-8 lg:gap-x-20">
            <LinkList title="Quick Links" links={QUICK_LINKS} />
            <LinkList title="Company" links={COMPANY_LINKS} />
            {contact && (contact.phone || contact.email || contact.address) ? (
              <div className="flex max-w-[360px] flex-col gap-4">
                <p className="font-inter text-base font-semibold uppercase leading-[1.21]">Contact</p>
                <ul className="flex flex-col gap-2.5 font-inter text-base leading-[1.21]">
                  {contact.phone ? (
                    <li className="flex items-center gap-2.5">
                      <Asset name="call.svg" width={16} height={16} />
                      <a href={`tel:${contact.phone}`} className="no-underline hover:underline">{contact.phone}</a>
                    </li>
                  ) : null}
                  {contact.email ? (
                    <li className="flex items-center gap-2.5">
                      <Asset name="group.svg" width={16} height={12} />
                      <a href={`mailto:${contact.email}`} className="break-all no-underline hover:underline">{contact.email}</a>
                    </li>
                  ) : null}
                  {contact.address ? (
                    <li className="flex items-start gap-2.5">
                      <Asset name="group-1.svg" width={13} height={16} className="mt-0.5" />
                      <span>{contact.address}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-4 border-t border-white/20 pb-[39px] pt-10 font-inter lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex flex-wrap items-center gap-x-2 text-base leading-6">
            {LEGAL_LINKS.map((l, i) => (
              <li key={l.path} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true">.</span> : null}
                <Link href={l.path} className="no-underline hover:underline">{l.label}</Link>
              </li>
            ))}
          </ul>
          {social.length ? (
            <ul className="flex items-center gap-4">
              {social.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.platform} className="grid size-6 place-items-center no-underline">
                    {s.icon ? <Asset name={s.icon} width={24} height={24} /> : <span className="text-sm">{s.platform}</span>}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm leading-[1.21]">&copy; {new Date().getFullYear()} {settings?.siteName ?? "SMASH"}. All rights reserved.</p>
        </div>
        </div>
      </div>
      {contact?.whatsapp ? (
        <a
          href={whatsAppLink(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-6 right-4 z-50 grid size-[60px] place-items-center md:right-10 xl:right-[60px]"
        >
          <Asset name="ellipse-5.svg" width={100} height={100} className="pointer-events-none absolute -inset-5 size-[100px] max-w-none" />
          <span className="relative grid size-14 place-items-center rounded-full bg-[#25d366]">
            <Asset name="whatsapp.svg" width={30} height={30} />
          </span>
        </a>
      ) : null}
    </footer>
  );
}
