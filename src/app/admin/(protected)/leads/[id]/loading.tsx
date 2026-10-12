import { Stack } from "@/components/ui/Stack";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminCard } from "@/components/admin/AdminCard";

/** Shown while a single lead loads (Phase 8 QA fix; see `(protected)/loading.tsx` for why this was missing). Shaped like the real page: a title, badge row, then card-sized blocks. */
export default function LeadDetailLoading() {
  return (
    <Stack gap={5}>
      <Skeleton width="240px" height="1.75rem" />
      <Stack direction="row" gap={3}>
        <Skeleton width="90px" height="28px" />
        <Skeleton width="90px" height="28px" />
      </Stack>
      {Array.from({ length: 3 }, (_, i) => (
        <AdminCard key={i}>
          <Stack gap={3}>
            <Skeleton height="1rem" />
            <Skeleton height="1rem" />
            <Skeleton height="1rem" width="60%" />
          </Stack>
        </AdminCard>
      ))}
    </Stack>
  );
}
