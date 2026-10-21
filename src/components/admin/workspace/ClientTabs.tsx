"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, CreditCard, Image as ImageIcon, LayoutDashboard, LifeBuoy, Megaphone, UserCog, Users } from "lucide-react";
import type { PortalSection } from "@/lib/client-options";
import styles from "./Workspace.module.css";

const TABS = [
  { slug: "", label: "Overview", icon: LayoutDashboard, section: null, badge: null },
  { slug: "projects", label: "Projects", icon: Briefcase, section: "projects", badge: null },
  { slug: "campaigns", label: "Campaigns", icon: Megaphone, section: "campaigns", badge: "daily" },
  { slug: "creative", label: "Creative", icon: ImageIcon, section: "content", badge: "creatives" },
  { slug: "leads", label: "Leads", icon: Users, section: "leads", badge: null },
  { slug: "billing", label: "Billing", icon: CreditCard, section: "billing", badge: "invoices" },
  { slug: "support", label: "Support", icon: LifeBuoy, section: "support", badge: "tickets" },
  { slug: "profile", label: "Profile", icon: UserCog, section: null, badge: null },
] as const;

/**
 * The client workspace's tab bar. A red count on a tab is something the SMASH team has to deal with (content the client sent back,
 * tickets waiting for a reply, overdue invoices); "Off" marks a page that is switched off in the client's portal.
 */
export function ClientTabs({ id, attention, off }: { id: string; attention: { creatives: number; tickets: number; invoices: number; daily: number }; off: PortalSection[] }) {
  const pathname = usePathname();
  const base = `/admin/clients/${id}`;
  return (
    <nav className={styles.tabs} aria-label="Client workspace">
      {TABS.map(({ slug, label, icon: Icon, section, badge }) => {
        const href = slug ? `${base}/${slug}` : base;
        const current = slug ? pathname === href || pathname.startsWith(`${href}/`) : pathname === base;
        const count = badge ? attention[badge] : 0;
        const hidden = section ? off.includes(section) : false;
        return (
          <Link key={label} href={href} className={styles.tab} aria-current={current ? "page" : undefined}>
            <Icon size={16} strokeWidth={1.9} className={styles.tabIcon} aria-hidden="true" />
            {label}
            {count > 0 ? <span className={styles.dot} aria-label={badge === "daily" ? "Daily update overdue" : `${count} need attention`} title={badge === "daily" ? "Yesterday's numbers haven't been recorded" : undefined}>{badge === "daily" ? "!" : count}</span> : null}
            {hidden ? <span className={styles.off} title="Hidden from the client's portal">Off</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
