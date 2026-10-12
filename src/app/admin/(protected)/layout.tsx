import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/api/admin-session";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * The protected-route foundation (CRM Phase 2 brief, Step 12/16): every page under this route group
 * — `/admin` today, `/admin/leads` etc. in later phases — inherits this guard just by living inside
 * `(protected)/`. The group's parentheses keep it out of the URL, so this layout applies to `/admin`
 * without also wrapping the sibling `/admin/login` route (which must stay reachable while
 * unauthenticated, or no one could ever sign in).
 *
 * This is a convenience, not the security boundary: every protected API route re-verifies the same
 * session independently via `adminSessionApi` (`handler.ts`), which is the actual enforcement layer.
 * A visitor who somehow bypassed this redirect would still get a 401 from any real data request.
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
