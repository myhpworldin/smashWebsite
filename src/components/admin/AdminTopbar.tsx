import { Menu } from "lucide-react";
import { Asset } from "@/components/home/shared";
import { LogoutButton } from "@/components/admin/LogoutButton";
import type { PublicAdminUser } from "@/server/modules/admin-users/admin-users.service";
import styles from "./AdminTopbar.module.css";

/** The CRM's top bar: opens the mobile nav drawer, shows the authenticated admin's real identity (nothing fabricated — `admin` comes straight from `getCurrentAdmin()`), and carries the one Phase 2 logout control. No breadcrumb here: each page renders its own `AdminPageHeader` inline instead, so the topbar doesn't need per-page props threaded through the layout. */
export function AdminTopbar({ admin, onMenuClick }: { admin: PublicAdminUser; onMenuClick: () => void }) {
  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label="Open navigation menu">
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div className={styles.account}>
        <Asset name="avatar-user.svg" width={32} height={32} className={styles.avatar} />
        <span className={styles.identity}>
          <span className={styles.email}>{admin.email}</span>
          <span className={styles.role}>{admin.role}</span>
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
