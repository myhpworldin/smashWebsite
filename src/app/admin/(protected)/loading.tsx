import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";

/** Shown for any `/admin/**` page without a more specific `loading.tsx` — the real hero (so nothing flashes) over stat tiles and a card of rows. */
export default function AdminLoading() {
  return <AdminPageSkeleton eyebrow="Dashboard" title="Loading…" tiles={4} rows={4} />;
}
