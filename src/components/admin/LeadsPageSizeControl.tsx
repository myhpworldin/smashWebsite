"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LEAD_PAGE_SIZES } from "@/lib/lead-options";
import styles from "./LeadsPageSizeControl.module.css";

/**
 * Rows-per-page, standalone from `LeadsFilterForm` and placed next to `Pagination` instead (the
 * "rows per page beside the pager, not buried in the filter toolbar" convention most data-table
 * UIs follow). Merges `limit` into the *current* URL's search params rather than rebuilding the
 * query from scratch, so every other active filter survives; `page` is dropped so a new page size
 * doesn't leave the admin stranded past the new last page.
 */
export function LeadsPageSizeControl({ limit }: { limit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", next);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className={styles.control}>
      <label htmlFor="leads-page-size" className={styles.label}>Rows per page</label>
      <select id="leads-page-size" className={styles.select} value={String(limit)} onChange={(e) => onChange(e.target.value)}>
        {LEAD_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
      </select>
    </div>
  );
}
