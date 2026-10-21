import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, Briefcase, CreditCard, Image as ImageIcon, LayoutDashboard, LifeBuoy, UserRound, Users } from "lucide-react";
import { AppFrame, type FrameNavItem } from "@/components/layout/AppFrame";
import type { PortalSection } from "@/lib/client-options";
import type { PublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import { ClientLogoutButton } from "./ClientLogoutButton";

const ICON = { size: 19, strokeWidth: 1.9, "aria-hidden": true } as const;

/** Every portal page, in order. `/client` is the dashboard, so it matches only itself (`exact`); the others also match their own sub-pages. */
const NAV: (FrameNavItem & { section: PortalSection })[] = [
  { section: "overview", href: "/client", label: "Dashboard", icon: <LayoutDashboard {...ICON} />, exact: true },
  { section: "projects", href: "/client/projects", label: "Projects", icon: <Briefcase {...ICON} /> },
  { section: "campaigns", href: "/client/campaigns", label: "Campaigns", icon: <BarChart3 {...ICON} /> },
  { section: "content", href: "/client/content", label: "Content", icon: <ImageIcon {...ICON} /> },
  { section: "leads", href: "/client/leads", label: "Leads", icon: <Users {...ICON} /> },
  { section: "billing", href: "/client/billing", label: "Billing", icon: <CreditCard {...ICON} /> },
  { section: "support", href: "/client/support", label: "Support", icon: <LifeBuoy {...ICON} /> },
  { section: "account", href: "/client/account", label: "Account", icon: <UserRound {...ICON} /> },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "C";

/**
 * The signed-in portal's frame: the shared navy sidebar (logo, the pages this client has, their company and a sign-out) beside the
 * page, and a quiet footer. The portal is read-only except where a page says otherwise (approving content, support tickets, accepting terms).
 */
export function ClientShell({ client, sections, children }: { client: PublicClientAccount; sections: PortalSection[]; children: ReactNode }) {
  return (
    <AppFrame
      theme="client"
      homeHref="/client"
      homeLabel="SMASH client portal home"
      tag="Client portal"
      nav={NAV.filter((n) => sections.includes(n.section)).map(({ section, ...item }) => { void section; return item; })}
      who={client.companyName}
      avatar={initials(client.companyName)}
      subtitle={client.contactName}
      logout={<ClientLogoutButton />}
      footer={<>Figures are published by your SMASH account team. Questions? <Link href="/client/support" style={{ color: "var(--client-blue)", fontWeight: 600 }}>Contact support</Link>.</>}
    >
      {children}
    </AppFrame>
  );
}
