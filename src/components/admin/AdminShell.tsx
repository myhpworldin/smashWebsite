import type { ReactNode } from "react";
import { Building2, LayoutDashboard, Users } from "lucide-react";
import { AppFrame, type FrameNavItem } from "@/components/layout/AppFrame";
import type { PublicAdminUser } from "@/server/modules/admin-users/admin-users.service";
import { LogoutButton } from "./LogoutButton";

const ICON = { size: 19, strokeWidth: 1.9, "aria-hidden": true } as const;

/** `/admin` is the dashboard, so it matches only itself (`exact`); the others also match their own sub-pages. */
const NAV: FrameNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard {...ICON} />, exact: true },
  { href: "/admin/leads", label: "Website enquiries", icon: <Users {...ICON} /> },
  { href: "/admin/clients", label: "Clients", icon: <Building2 {...ICON} /> },
];

const initials = (email: string) => email.split("@")[0].split(/[^a-z0-9]+/i).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "A";

/**
 * The CRM's persistent frame — the shared sidebar frame (`AppFrame`) with the CRM's pages, the signed-in admin and a sign-out. Every
 * `/admin/(protected)/**` page renders inside it through the one layout, so moving between pages re-renders only `children`. A server
 * component: the sidebar's own state (collapse, drawer, active link) lives in `AppFrame`.
 */
export function AdminShell({ admin, children }: { admin: PublicAdminUser; children: ReactNode }) {
  return (
    <AppFrame
      theme="admin"
      homeHref="/admin"
      homeLabel="SMASH CRM home"
      tag="CRM"
      nav={NAV}
      who={admin.email}
      avatar={initials(admin.email)}
      subtitle={admin.role}
      logout={<LogoutButton />}
      footer="SMASH CRM · Private to the SMASH team"
    >
      {children}
    </AppFrame>
  );
}
