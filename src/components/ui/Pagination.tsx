import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./Pagination.module.css";

/** Which page numbers to actually render: first, last, and a small window around the current page, with a gap ("…") where numbers were skipped — so this stays compact even with hundreds of pages, rather than printing every one. */
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
 * Server-rendered links to `?page=N`, using next/link so page changes are a soft client-side
 * navigation (no full browser reload) rather than a raw `<a>` tag's hard navigation. `query`
 * (CRM Phase 5): other active search params (e.g. a Leads workspace's filters) to carry over onto
 * each page link, so paging never silently drops the current search/filter/sort.
 *
 * `rangeLabel` (Leads redesign): an optional "Showing 1–25 of 126" string rendered on the opposite
 * side from the page controls. Omitted by every pre-existing caller (`/work`, `/insights`), which
 * keeps their current centered, label-less layout untouched; passing it switches to the CRM's
 * left-label/right-controls arrangement and also turns on numbered page links (`pageWindow`) instead
 * of just Previous/Next — a real result-management workspace benefits from jumping straight to page
 * 4, where a simple content listing doesn't need that.
 *
 * `extraControl` (Leads redesign): an optional control (the CRM's rows-per-page select) rendered
 * beside `rangeLabel`, on the opposite side from the page-number buttons — the common "N–M of T ·
 * [rows per page]" / "‹ 1 2 3 ›" data-table arrangement. Only ever passed alongside `rangeLabel`.
 */
export function Pagination({ page, totalPages, basePath, query, rangeLabel, extraControl }: { page: number; totalPages: number; basePath: string; query?: Record<string, string>; rangeLabel?: string; extraControl?: ReactNode }) {
  if (totalPages <= 1 && !rangeLabel) return null;
  const hrefFor = (p: number) => {
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  if (!rangeLabel) {
    return (
      <nav aria-label="Pagination" className={styles.nav}>
        {page > 1 ? <Button href={hrefFor(page - 1)} variant="secondary">Previous</Button> : null}
        <span className={styles.status}>Page {page} of {totalPages}</span>
        {page < totalPages ? <Button href={hrefFor(page + 1)} variant="secondary">Next</Button> : null}
      </nav>
    );
  }

  return (
    <nav aria-label="Pagination" className={styles.bar}>
      <div className={styles.leftGroup}>
        <span className={styles.status}>{rangeLabel}</span>
        {extraControl}
      </div>
      {totalPages > 1 ? (
        <div className={styles.pages}>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className={styles.pageLink} aria-label="Previous page">
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled} aria-hidden="true"><ChevronLeft size={16} strokeWidth={1.75} /></span>
          )}
          {pageWindow(page, totalPages).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className={styles.ellipsis} aria-hidden="true">&hellip;</span>
            ) : (
              <Link key={p} href={hrefFor(p)} className={styles.pageLink} aria-current={p === page ? "page" : undefined}>{p}</Link>
            ),
          )}
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className={styles.pageLink} aria-label="Next page">
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : (
            <span className={styles.pageLinkDisabled} aria-hidden="true"><ChevronRight size={16} strokeWidth={1.75} /></span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
