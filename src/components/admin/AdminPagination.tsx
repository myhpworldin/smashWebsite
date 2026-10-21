import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./AdminPagination.module.css";

/** Which page numbers to render: first, last, and a small window around the current page, with a gap ("…") where numbers were skipped. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("gap");
    result.push(sorted[i]);
  }
  return result;
}

/**
 * The CRM's pager: a "Showing 1–25 of 126" label (with an optional rows-per-page control beside it) and numbered page links, as real
 * `?page=N` links so a page change is a soft navigation. `query` carries the other active search params onto each link, so paging
 * never silently drops the current search, filter or sort.
 */
export function AdminPagination({ page, totalPages, basePath, query, rangeLabel, extraControl }: { page: number; totalPages: number; basePath: string; query?: Record<string, string>; rangeLabel: string; extraControl?: ReactNode }) {
  const hrefFor = (p: number) => {
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Pagination" className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.status}>{rangeLabel}</span>
        {extraControl}
      </div>
      {totalPages > 1 ? (
        <div className={styles.pages}>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={styles.page} aria-label="Previous page"><ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /></Link>
          ) : (
            <span className={styles.disabled} aria-hidden="true"><ChevronLeft size={16} strokeWidth={2} /></span>
          )}
          {pageWindow(page, totalPages).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className={styles.ellipsis} aria-hidden="true">&hellip;</span>
            ) : (
              <Link key={p} href={hrefFor(p)} className={styles.page} aria-current={p === page ? "page" : undefined}>{p}</Link>
            ),
          )}
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className={styles.page} aria-label="Next page"><ChevronRight size={16} strokeWidth={2} aria-hidden="true" /></Link>
          ) : (
            <span className={styles.disabled} aria-hidden="true"><ChevronRight size={16} strokeWidth={2} /></span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
