import { Stack } from "@/components/ui/Stack";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminCard } from "@/components/admin/AdminCard";

/**
 * Phase 8 production QA fix: no admin route had a `loading.tsx`, so navigating between CRM pages (or
 * a slow database on first load) showed nothing in between — a blank gap, not a deliberate state
 * (brief Step 11/17: "avoid blank screen... avoid layout jumping"). This is the generic fallback,
 * shown for any `/admin/**` page without its own more specific one (the Dashboard today); it mirrors
 * that page's actual shape (a heading, then card-sized blocks) so nothing jumps once real content
 * arrives. Built entirely from the existing `Skeleton`/`Stack`/`AdminCard` — no new loading system.
 */
export default function AdminLoading() {
  return (
    <Stack gap={6}>
      <Skeleton width="220px" height="1.75rem" />
      <Stack direction="row" gap={4}>
        <Skeleton width="200px" height="90px" />
        <Skeleton width="200px" height="90px" />
        <Skeleton width="200px" height="90px" />
      </Stack>
      <AdminCard>
        <Stack gap={3}>
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" width="60%" />
        </Stack>
      </AdminCard>
    </Stack>
  );
}
