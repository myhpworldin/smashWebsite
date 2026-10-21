import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";

/** Shown while a single lead loads — the real hero, then card-sized blocks. */
export default function LeadDetailLoading() {
  return <AdminPageSkeleton eyebrow="Website enquiry" title="Loading enquiry…" rows={4} rowHeight="2.5rem" />;
}
