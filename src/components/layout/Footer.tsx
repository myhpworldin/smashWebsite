import Image from "next/image";
import Link from "next/link";
import { getServiceNavItems, getSiteSettings } from "@/server/seo/request-cache";
import { logger } from "@/server/lib/logger";
import { LIVE_STATIC_ROUTES, ROUTES } from "@/lib/routes";
import { whatsAppLink } from "@/lib/whatsapp";
import { HOME_WRAP } from "@/components/home/home-ui";

type FooterLink = { label: string; path: string };

/** The design's link columns. A page that is not built yet is shown as plain text, never linked (it would 404). */
const QUICK_LINKS: FooterLink[] = [
  { label: "Home", path: ROUTES.HOME },
  { label: "Insights", path: ROUTES.INSIGHTS },
  { label: "FAQ", path: "/faqs" },
];
const COMPANY_LINKS: FooterLink[] = [
  { label: "About Us", path: ROUTES.ABOUT },
  { label: "Contact Us", path: ROUTES.CONTACT },
  { label: "Careers", path: ROUTES.CAREERS },
];
/** The three Legal pages — real, built routes. */
const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms & Conditions", path: ROUTES.TERMS },
  { label: "Privacy Policy", path: ROUTES.PRIVACY_POLICY },
  { label: "Cookie Policy", path: ROUTES.COOKIE_POLICY },
];
/** Social links are shown in the design's order, named as the design names them; anything else follows, as given. */
const SOCIAL_ORDER = ["linkedin", "instagram", "facebook", "twitter", "x"];
const SOCIAL_NAMES: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", twitter: "Twitter", x: "X", youtube: "YouTube" };

/** A footer icon from public/media/footer (the Figma footer's own SVGs), served as-is. */
function Asset({ name, width, height }: { name: string; width: number; height: number }) {
  return <Image src={`/media/footer/${name}`} width={width} height={height} alt="" unoptimized className="shrink-0" />;
}

/** Footer links at the design's 60% white, full white on hover / focus. */
const LINK = "text-white no-underline opacity-60 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100";

function Column({ title, links, className = "" }: { title: string; links: FooterLink[]; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 leading-[1.3] ${className}`}>
      <p className="text-[22px] font-medium text-white opacity-60">{title}</p>
      <ul className="flex flex-col gap-3.5 text-[18px]">
        {links.map((l) => (
          <li key={l.label}>{isLive(l.path) ? <Link href={l.path} className={LINK}>{l.label}</Link> : <span className="text-white opacity-60">{l.label}</span>}</li>
        ))}
      </ul>
    </div>
  );
}

/** Static routes must be live to be linked; service category pages come from the published catalogue, so they are. */
const isLive = (path: string) => LIVE_STATIC_ROUTES.includes(path) || path.startsWith(`${ROUTES.SERVICES}/`);

/**
 * Global footer (Figma New Homepage, frame 681:841): a bright-blue → deep-blue band with a faded "Let'sTalk" mark
 * beside "Contact Our Team" and its line; a rule; the logo and the Quick Links / Services / Company / Get In Touch
 * columns; then social and legal links and the copyright.
 *
 * Contact details and social links come from real SiteSettings and the Services column from the published service
 * catalogue — never hardcoded values (phase brief §17); a missing group is simply omitted. A settings failure is
 * logged and degrades to the settings-less layout, never rethrown: the footer renders on every page, including the
 * 404 and error pages themselves.
 */
export async function Footer() {
  const [settings, services] = await Promise.all([
    getSiteSettings().catch((err) => {
      logger.warn("Footer: site settings unavailable, rendering without them", { error: err instanceof Error ? err.message : String(err) });
      return null;
    }),
    getServiceNavItems(),
  ]);
  const contact = settings?.contact;
  const social = [...(settings?.socialLinks ?? [])]
    .map((s) => ({ ...s, key: s.platform.toLowerCase() }))
    .sort((a, b) => rank(a.key) - rank(b.key));
  const serviceLinks: FooterLink[] = services.map((s) => ({ label: s.label, path: s.path }));

  return (
    <footer className="bg-[linear-gradient(180deg,var(--brand-bright-blue)_5.754%,var(--brand-deep-blue)_81.576%)] text-white">
      <div className={`${HOME_WRAP} pb-[60px] pt-16 lg:pt-[90px]`}>
        {/* "Let's Talk": the faded mark (decoration) with the call to action laid over its right-hand end. */}
        <div className="relative flex flex-col gap-8 lg:block lg:min-h-[172px]">
          <p aria-hidden="true" className="select-none whitespace-nowrap text-[clamp(72px,12.9vw,186px)] font-bold lg:max-xl:text-[112px] leading-[0.6] text-white opacity-[0.14] lg:pt-5">
            Let’sTalk
          </p>
          <div className="flex flex-col gap-6 lg:absolute lg:right-0 lg:top-0 lg:w-[423px] lg:items-end lg:gap-9">
            <Link href={ROUTES.CONTACT} className="group inline-flex w-fit items-center gap-4 text-[20px] leading-[1.15] text-white no-underline">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">Contact Our Team</span>
              <Image src="/media/home/arrow-up-right.svg" alt="" width={17.28} height={17.28} unoptimized className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <p className="text-[22px] leading-[1.3] text-white lg:text-[26px]">Let’s talk about where you are, where you want to go, and how we can help you get there.</p>
          </div>
        </div>

        <hr className="my-12 border-0 border-t border-white/30 lg:my-[60px]" />

        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
          <Link href={ROUTES.HOME} aria-label="SMASH home" className="shrink-0">
            <Image src="/media/footer/smash-logo.png" alt="SMASH" width={171} height={64} className="h-16 w-[171px] object-contain object-bottom" />
          </Link>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:flex md:flex-wrap md:gap-x-12 xl:flex-nowrap xl:gap-x-[70px]">
            <Column title="Quick Links" links={QUICK_LINKS} className="md:w-[126px]" />
            {serviceLinks.length ? <Column title="Services" links={serviceLinks} /> : null}
            <Column title="Company" links={COMPANY_LINKS} className="md:w-[131px]" />
            {contact && (contact.phone || contact.email || contact.address) ? (
              <div className="col-span-2 flex flex-col gap-4 leading-[1.3] md:col-span-1">
                <p className="text-[22px] font-medium text-white/80 opacity-60">Get In Touch</p>
                <ul className="flex flex-col gap-3.5 text-[18px] text-white/80">
                  {contact.phone ? (
                    <li className="flex items-center gap-3.5">
                      <Asset name="call.svg" width={16} height={16} />
                      <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className={`${LINK} text-white/80`}>{contact.phone}</a>
                    </li>
                  ) : null}
                  {contact.email ? (
                    <li className="flex items-center gap-3.5">
                      <Asset name="email.svg" width={16} height={12} />
                      <a href={`mailto:${contact.email}`} className={`${LINK} break-all text-white/80`}>{contact.email}</a>
                    </li>
                  ) : null}
                  {contact.address ? (
                    <li className="flex items-start gap-3.5">
                      <span className="grid size-4 shrink-0 place-items-center pt-1 opacity-80">
                        <Asset name="location.svg" width={13.2} height={15.6} />
                      </span>
                      <span className="max-w-[313px] opacity-60">{contact.address}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-[30px] text-[18px] leading-[1.3] lg:mt-[60px] lg:items-end">
          <div className="flex w-full flex-col gap-6 md:flex-row md:flex-wrap md:items-center md:justify-between">
            {social.length ? (
              <ul className="flex flex-wrap items-center gap-x-[30px] gap-y-3">
                {social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className={LINK}>{SOCIAL_NAMES[s.key] ?? s.platform}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <span aria-hidden="true" />
            )}
            <ul className="flex flex-wrap items-center gap-x-[30px] gap-y-3">
              {LEGAL_LINKS.map((l) => (
                <li key={l.path}>
                  <Link href={l.path} className={LINK}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-base text-white/80 opacity-[0.62] lg:text-right">&copy; {new Date().getFullYear()} {settings?.siteName ?? "SMASH International"}. All rights reserved.</p>
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
          <Image src="/media/figma/ellipse-5.svg" alt="" width={100} height={100} unoptimized className="pointer-events-none absolute -inset-5 size-[100px] max-w-none" />
          <span className="relative grid size-14 place-items-center rounded-full bg-[#25d366]">
            <Image src="/media/figma/whatsapp.svg" alt="" width={30} height={30} unoptimized />
          </span>
        </a>
      ) : null}
    </footer>
  );
}

const rank = (key: string) => {
  const i = SOCIAL_ORDER.indexOf(key);
  return i === -1 ? SOCIAL_ORDER.length : i;
};
