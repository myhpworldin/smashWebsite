import { Stack } from "@/components/ui/Stack";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdminCard } from "@/components/admin/AdminCard";

/** Shown while `/admin/leads` is re-fetching — a search, filter, sort, rows-per-page, or page change. Shaped like the real page: a title, a row of status pills, the filter bar, then list rows — not a table, so nothing jumps once results arrive. */
export default function LeadsLoading() {
  return (
    <Stack gap={4}>
      <Skeleton width="200px" height="1.75rem" />
      <Stack direction="row" gap={2}>
        {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} width="90px" height="32px" />)}
      </Stack>
      <Skeleton height="56px" />
      <AdminCard>
        <Stack gap={4}>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height="3.5rem" />)}
        </Stack>
      </AdminCard>
    </Stack>
  );
}
