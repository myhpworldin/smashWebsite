import type { ComponentType } from "react";
import Image from "next/image";
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Users, X, type LucideProps } from "lucide-react";
import { NavLink } from "@/components/layout/NavLink";
import { Modal } from "@/components/ui/Modal";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import styles from "./AdminSidebar.module.css";

/**
 * The CRM's nav structure. "Leads" now links to `/admin/leads` (CRM Phase 5) — Phase 4 deliberately
 * left it href-less ("Coming soon") specifically until this route existed, per that phase's own
 * "do not create a broken link" rule. "Settings" remains intentionally absent: no Settings route is
 * planned in the confirmed phase roadmap, and fake placeholder pages must not be invented just to
 * fill the sidebar. The group/item shape is kept extensible (array of groups, each with icon-bearing
 * items) so a future real section slots in without restructuring this component.
 */
const NAV_GROUPS: { label: string; items: { label: string; href?: string; icon: ComponentType<LucideProps> }[] }[] = [
  { label: "Dashboard", items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  { label: "Lead Management", items: [{ label: "Leads", href: "/admin/leads", icon: Users }] },
];

function Nav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className={styles.nav} aria-label="CRM">
      {NAV_GROUPS.map((group) => (
        <div className={styles.group} key={group.label}>
          {collapsed ? null : <span className={styles.groupLabel}>{group.label}</span>}
          {group.items.map((item) => {
            const Icon = item.icon;
            const link = item.href ? (
              <NavLink key={item.label} href={item.href} onClick={onNavigate} className={styles.item}>
                <Icon size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
                <span className={styles.itemLabel}>{item.label}</span>
              </NavLink>
            ) : (
              <span key={item.label} className={styles.item} aria-disabled="true">
                <Icon size={18} strokeWidth={1.75} className={styles.icon} aria-hidden="true" />
                <span className={styles.itemLabel}>{item.label}</span>
                <span className={styles.comingSoon}>Coming soon</span>
              </span>
            );
            return collapsed ? (
              <AdminTooltip key={item.label} label={item.label}>
                {link}
              </AdminTooltip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const Brand = ({ collapsed }: { collapsed?: boolean }) => (
  <div className={styles.brand}>
    {collapsed ? (
      <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={28} height={28} className={styles.logoMark} />
    ) : (
      <Image src="/media/figma/smash-logo-1.png" alt="SMASH" width={96} height={28} className={styles.logo} />
    )}
  </div>
);

/**
 * Persistent on desktop (≥1024px, `src/lib/breakpoints.ts`'s `laptop`); below that, `open`/`onClose`
 * (owned by `AdminShell`, toggled from `AdminTopbar`'s menu button) drive an off-canvas drawer built on
 * the project's one existing modal (`ui/Modal.tsx`) — native focus trap, Escape-to-close, backdrop and
 * scroll-lock, just repositioned to the left edge via CSS, rather than a second hand-rolled disclosure.
 * `collapsed`/`onToggleCollapse` (desktop-only) shrink the rail to an icon-only strip — pure CSS width
 * transition, since `.rail` is a flex sibling of `AdminShell`'s `.column` and flexbox reflows the
 * content column automatically when `.rail`'s own width changes.
 */
export function AdminSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <>
      <aside className={styles.rail} aria-label="CRM sidebar" data-collapsed={collapsed}>
        <Brand collapsed={collapsed} />
        <Nav collapsed={collapsed} />
        <div className={styles.collapseRow}>
          <AdminTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <button type="button" className={styles.collapseButton} onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose size={18} strokeWidth={1.75} aria-hidden="true" />}
            </button>
          </AdminTooltip>
        </div>
      </aside>
      <Modal open={open} onClose={onClose} labelledBy="admin-sidebar-heading" className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <Brand />
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close menu">
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <h2 id="admin-sidebar-heading" className="sr-only">CRM navigation</h2>
        <Nav onNavigate={onClose} />
      </Modal>
    </>
  );
}
