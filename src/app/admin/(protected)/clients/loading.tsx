import { AdminPageSkeleton } from "@/components/admin/AdminSkeleton";

export default function ClientsLoading() {
  return <AdminPageSkeleton eyebrow="Client portal" title="Clients" rows={5} rowHeight="3.5rem" />;
}
