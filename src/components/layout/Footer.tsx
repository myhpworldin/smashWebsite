import Image from "next/image";
import Link from "next/link";
import { getServiceNavItems, getSiteSettings } from "@/server/seo/request-cache";
import { logger } from "@/server/lib/logger";
import { LIVE_STATIC_ROUTES, ROUTES } from "@/lib/routes";
import { whatsAppLink } from "@/lib/whatsapp";
import { HOME_WRAP } from "@/components/home/home-ui";
import { FooterMotion } from "@/components/layout/FooterMotion";

type FooterLink = { label: string; path: string };

/** The design's link columns. A page that is not built yet is shown as plain text, never linked (it would 404). */
const QUICK_LINKS: FooterLink[] = [
  { label: "Home", path: ROUTES.HOME },
  { label: "Our Works", path: ROUTES.WORK },
  { label: "FAQ", path: ROUTES.FAQ },
];
const COMPANY_LINKS: FooterLink[] = [
  { label: "About Us", path: ROUTES.ABOUT },
  { label: "Contact Us", path: ROUTES.CONTACT },
  { label: "Careers", path: ROUTES.CAREERS },
];
/** The three Legal pages — real, built routes. */
const LEGAL_LINKS: FooterLink[] = [
  { label: "Terms & Condition", path: ROUTES.TERMS },
  { label: "Privacy Policy", path: ROUTES.PRIVACY_POLICY },
  { label: "Cookie Policy", path: ROUTES.COOKIE_POLICY },
];
/** Names for the social icons' accessible labels. */
const SOCIAL_NAMES: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", twitter: "Twitter", x: "X", youtube: "YouTube" };

/** Brand glyphs (24×24 paths) for the social icons, in the design's order. */
const SOCIAL_ICONS: Record<string, string> = {
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  twitter: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.29 19.494h2.039L6.486 3.24H4.298l13.313 17.407z",
};

/** A footer icon from public/media/footer (the Figma footer's own SVGs), served as-is. */
function Asset({ name, width, height }: { name: string; width: number; height: number }) {
  return <Image src={`/media/footer/${name}`} width={width} height={height} alt="" unoptimized className="shrink-0" />;
}

const SOCIAL_BUTTON = "grid size-10 place-items-center rounded-full border border-white/30";

function SocialIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d={SOCIAL_ICONS[name]} />
    </svg>
  );
}

/**
 * Footer links at 60% white, full white on hover / focus. The column titles above them are full white, so a title and its
 * links never share one colour: the titles are what the eye lands on, the links sit back until they are pointed at.
 */
const LINK = "text-white no-underline opacity-60 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100";

function Column({ title, links, className = "" }: { title: string; links: FooterLink[]; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 leading-[1.3] ${className}`}>
      <p className="text-[22px] font-medium text-white">{title}</p>
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
 * Global footer: a bright-blue → deep-blue band with a faded "Let'sTalk" mark beside "Contact Our Team" and its line;
 * a rule; the logo (with the social icons under it) and the Quick Links / Services / Company / Get In Touch columns;
 * then the legal links and the centred copyright.
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
  // The design's four networks always appear, in its order; each is a link once its URL is set in Site Settings, an inert icon until then.
  const configured = new Map((settings?.socialLinks ?? []).map((s) => [s.platform.toLowerCase(), s.url]));
  const socialItems = ["linkedin", "instagram", "facebook", "twitter"].map((key) => ({ key, label: SOCIAL_NAMES[key], url: configured.get(key) ?? (key === "twitter" ? configured.get("x") : undefined) }));
  const serviceLinks: FooterLink[] = services.map((s) => ({ label: s.label, path: s.path }));

  return (
    <footer className="overflow-hidden bg-[linear-gradient(180deg,var(--brand-bright-blue)_5.754%,var(--brand-deep-blue)_81.576%)] text-white">
      <div className={`${HOME_WRAP} pb-[60px] pt-16 lg:pt-[90px]`}>
        {/* "Let's Talk": the faded mark (decoration) with the call to action laid over its right-hand end. */}
        <div data-footer-row className="relative flex flex-col gap-8 lg:block lg:min-h-[172px]">
          <p aria-hidden="true" data-footer-word className="w-fit origin-left select-none whitespace-nowrap text-[clamp(72px,12.9vw,186px)] font-bold lg:max-xl:text-[112px] leading-[0.6] text-white opacity-[0.14] lg:pt-5">
            Let’sTalk
          </p>
          <div className="flex flex-col gap-6 lg:absolute lg:right-0 lg:top-0 lg:w-[423px] lg:items-end lg:gap-9">
            {/* Same hover as the Home "View all services" link: the underline draws in from the left, the arrow flies out top-right as a fresh one slides in from the bottom-left. */}
            <Link href={ROUTES.CONTACT} className="group/more inline-flex w-fit items-center gap-4 text-[20px] leading-[1.15] text-white no-underline">
              <span className="relative">
                Contact Our Team
                <span className="absolute inset-x-0 -bottom-1 h-px origin-right scale-x-0 bg-white transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:origin-left group-hover/more:scale-x-100 group-focus-visible/more:origin-left group-focus-visible/more:scale-x-100 motion-reduce:transition-none" />
              </span>
              <span className="relative size-4 shrink-0 overflow-hidden">
                <Image src="/media/home/arrow-up-right.svg" alt="" width={16} height={16} unoptimized className="absolute inset-0  transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:-translate-y-full group-hover/more:translate-x-full group-focus-visible/more:-translate-y-full group-focus-visible/more:translate-x-full motion-reduce:transition-none" />
                <Image src="/media/home/arrow-up-right.svg" alt="" width={16} height={16} unoptimized className="absolute inset-0 -translate-x-full translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover/more:translate-x-0 group-hover/more:translate-y-0 group-focus-visible/more:translate-x-0 group-focus-visible/more:translate-y-0 motion-reduce:transition-none" />
              </span>
            </Link>
            <p className="text-[22px] leading-[1.3] text-white lg:text-[26px]">Let’s talk about where you are, where you want to go, and how we can help you get there.</p>
          </div>
        </div>

        <hr className="my-12 border-0 border-t border-white/30 lg:my-[60px]" />

        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex shrink-0 flex-col gap-6">
            <Link href={ROUTES.HOME} aria-label="SMASH home" className="xl:mt-1.5">
              <Image src="/media/footer/smash-logo.png" alt="SMASH" width={164} height={59} className="h-auto w-[164px]" />
            </Link>
            <ul className="flex items-center gap-3">
              {socialItems.map((s) => (
                <li key={s.key}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className={`${SOCIAL_BUTTON} ${LINK}`}>
                      <SocialIcon name={s.key} />
                    </a>
                  ) : (
                    <span className={`${SOCIAL_BUTTON} text-white opacity-60`} role="img" aria-label={s.label}>
                      <SocialIcon name={s.key} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:flex md:flex-wrap md:gap-x-12 xl:flex-nowrap xl:gap-x-[70px]">
            <Column title="Quick Links" links={QUICK_LINKS} className="md:w-[126px]" />
            {serviceLinks.length ? <Column title="Services" links={serviceLinks} /> : null}
            <Column title="Company" links={COMPANY_LINKS} className="md:w-[131px]" />
            {contact && (contact.phone || contact.email || contact.address) ? (
              <div className="col-span-2 flex flex-col gap-4 leading-[1.3] md:col-span-1">
                <p className="text-[22px] font-medium text-white">Get In Touch</p>
                <ul className="flex flex-col gap-3.5 text-[18px]">
                  {contact.phone ? (
                    <li className="flex items-center gap-3.5">
                      <Asset name="call.svg" width={16} height={16} />
                      <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className={LINK}>{contact.phone}</a>
                    </li>
                  ) : null}
                  {contact.email ? (
                    <li className="flex items-center gap-3.5">
                      <Asset name="email.svg" width={16} height={12} />
                      <a href={`mailto:${contact.email}`} className={`${LINK} break-all`}>{contact.email}</a>
                    </li>
                  ) : null}
                  {contact.address ? (
                    <li className="flex items-start gap-3.5">
                      <span className="grid size-4 shrink-0 place-items-center pt-1 opacity-80">
                        <Asset name="location.svg" width={13.2} height={15.6} />
                      </span>
                      <span className="max-w-[313px] text-white opacity-60">{contact.address}</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-[30px] text-[18px] leading-[1.3] lg:mt-[60px]">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:gap-x-[30px]">
            {LEGAL_LINKS.map((l) => (
              <li key={l.path}>
                <Link href={l.path} className={LINK}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <p className="text-center text-base text-white/80 opacity-[0.62]">&copy; {new Date().getFullYear()} {settings?.siteName ?? "SMASH Digital Media Private Limited"}. All rights reserved.</p>
        </div>
      </div>
      <FooterMotion />
      {contact?.whatsapp ? (
        <a
          href={whatsAppLink(contact.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="fixed bottom-6 right-4 z-50 grid size-[60px] place-items-center md:right-10 xl:right-[60px]"
        >
          {/* The frosted halo around the button, centred on it (the exported Figma ellipse sat 8px high, so it peeked out above the button). */}
          <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 rounded-full bg-white/40 shadow-[0_8px_20px_rgba(0,0,0,0.1)] backdrop-blur-[2px]" />
          <span className="relative grid size-14 place-items-center rounded-full bg-[#25d366]">
            <Image src="/media/figma/whatsapp.svg" alt="" width={30} height={30} unoptimized />
          </span>
        </a>
      ) : null}
    </footer>
  );
}
