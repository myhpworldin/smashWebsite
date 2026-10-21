import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";

/** Shown while `/admin/leads` is re-fetching — the real hero, then list rows, so nothing jumps once results arrive. */
export default function LeadsLoading() {
  return <AdminPageSkeleton eyebrow="SMASH website" title="Website enquiries" rows={6} rowHeight="3.5rem" />;
}
