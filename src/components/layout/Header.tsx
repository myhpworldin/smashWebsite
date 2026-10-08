import Image from "next/image";
import Link from "next/link";
import { LIVE_STATIC_ROUTES, ROUTES } from "@/lib/routes";
import { HeaderFrame } from "@/components/layout/HeaderFrame";
import { MobileNavToggle } from "@/components/layout/MobileNavToggle";
import { NavLink } from "@/components/layout/NavLink";
import { SweepLink } from "@/components/ui/SweepLink";
import { ServicesMenu } from "@/components/layout/ServicesMenu";
import { getServiceNavItems } from "@/server/seo/request-cache";
import type { NavItem } from "@/lib/nav";
import styles from "./Header.module.css";

/**
 * The design's header links, in the design's order. A page that is not built yet (available: false) is
 * never linked (phase brief §16); it appears automatically once its route is added to LIVE_STATIC_ROUTES.
 */
const LINKS: { label: string; path: string }[] = [
  { label: "Home", path: ROUTES.HOME },
  { label: "About Us", path: ROUTES.ABOUT },
  { label: "Services", path: ROUTES.SERVICES },
  { label: "Our Works", path: ROUTES.WORK },
  { label: "Contact Us", path: ROUTES.CONTACT },
];

/**
 * Home's frosted pill bar (Figma New Homepage, "Group 1261161347": 1280×70 at 40px from the top, 50px radius, white
 * 11% + 2px blur; logo 20px in, button 10px in). Applied only while HeaderFrame marks the header `data-pill`.
 */
const PILL = [
  "group-data-pill/header:mx-4 group-data-pill/header:mt-4 group-data-pill/header:w-auto group-data-pill/header:min-h-[70px] group-data-pill/header:rounded-[50px] group-data-pill/header:bg-white/11 group-data-pill/header:py-2 group-data-pill/header:pl-5 group-data-pill/header:pr-2.5 group-data-pill/header:backdrop-blur-[2px]",
  "group-data-pill/header:md:max-[1439px]:mx-10",
  "group-data-pill/header:min-[1440px]:mx-auto group-data-pill/header:xl:mt-10 group-data-pill/header:xl:max-w-[1280px] group-data-pill/header:xl:py-2 group-data-pill/header:xl:pl-5 group-data-pill/header:xl:pr-2.5",
  "group-data-pill/header:min-[1440px]:justify-between group-data-pill/header:min-[1440px]:gap-6 group-data-pill/header:min-[1440px]:!pl-5 group-data-pill/header:min-[1440px]:!pr-2.5",
].join(" ");

/** Global header: white logo, nav (Services opens a menu of the published services), "Get Started". Server-rendered except the two disclosures. */
export async function Header() {
  const services = await getServiceNavItems();
  const items: NavItem[] = LINKS.map((l) => ({ ...l, available: LIVE_STATIC_ROUTES.includes(l.path), ...(l.path === ROUTES.SERVICES && services.length ? { children: services } : {}) })).filter((i) => i.available);
  return (
    <HeaderFrame>
      <div className={`mx-auto flex min-h-[88px] w-full max-w-[1440px] items-center justify-between gap-6 px-4 py-4 md:px-10 xl:px-[60px] xl:pt-[60px] xl:pb-0 min-[1440px]:justify-start min-[1440px]:gap-[198px] min-[1440px]:!pl-[59.5px] min-[1440px]:!pr-[51px] ${PILL}`}>
        <Link href={ROUTES.HOME} aria-label="SMASH home" className="shrink-0">
          <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={151} height={54} priority className="h-[54px] w-auto" />
        </Link>
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className={`${styles.navList} font-inter group-data-pill/header:max-xl:!gap-6 group-data-pill/header:[&>li]:text-white/75 group-data-pill/header:[&>li:hover]:text-white`}>
            {items.map((item) => (
              <li key={item.path}>
                {item.children ? <ServicesMenu label={item.label} href={item.path} items={item.children} /> : <NavLink href={item.path}>{item.label}</NavLink>}
              </li>
            ))}
          </ul>
        </nav>
        <SweepLink href={ROUTES.CONTACT} tone="red" arrow className="font-manrope font-semibold max-lg:!hidden">Get Started</SweepLink>
        <MobileNavToggle items={items} />
      </div>
    </HeaderFrame>
  );
}
