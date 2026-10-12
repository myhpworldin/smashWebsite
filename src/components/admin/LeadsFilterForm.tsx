"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { LEAD_SOURCE_LABEL, LEAD_SOURCES } from "@/lib/lead-options";
import { Button } from "@/components/ui/Button";
import styles from "./LeadsFilterForm.module.css";

type ServiceOption = { name: string; slug: string };
/** Deliberately no `status` here — the pill tabs (`LeadStatusTabs`) own status filtering now, not this form. */
export type LeadsFilterDefaults = { search: string; service: string; source: string; dateFrom: string; dateTo: string; sort: string; limit: number };

/**
 * Submits via `router.push()` (next/navigation) instead of a native `<form method="GET">` —
 * a real browser form submission is a hard document navigation, which reloads the whole page
 * (sidebar, header, stats) instead of just streaming in new results. Pushing the URL through
 * Next's router keeps this a soft client-side navigation: layouts stay mounted, and only the
 * leads-list Suspense boundary below re-renders. The auto-submit-on-change/debounced-search
 * behavior builds the next URL from the form's current field values and pushes it — still exactly
 * one way results are produced (a real navigation to a real URL), just via the router instead of
 * the DOM's own form submission. A hidden `status` field carries the pill tabs' current choice
 * through whenever this form is submitted, so searching/filtering never silently drops it.
 */
export function LeadsFilterForm({ services, status, defaults, hasActiveFilters }: { services: ServiceOption[]; status: string; defaults: LeadsFilterDefaults; hasActiveFilters: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  const navigate = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value) params.append(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/admin/leads?${qs}` : "/admin/leads", { scroll: false });
  };
  const navigateDebounced = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(navigate, 400);
  };

  return (
    <form
      ref={formRef}
      className={styles.form}
      role="search"
      aria-label="Search and filter leads"
      onSubmit={(e) => { e.preventDefault(); navigate(); }}
    >
      {status ? <input type="hidden" name="status" value={status} /> : null}
      {/* Rows-per-page now lives in its own standalone control next to Pagination (bottom of the
          list) — kept here as a hidden field purely so an unrelated filter change (search, service,
          a date) doesn't silently reset the admin's chosen page size back to the default. */}
      <input type="hidden" name="limit" value={defaults.limit} />

      <div className={styles.searchRow}>
        <div className={styles.searchField}>
          <label htmlFor="leads-search" className="sr-only">Search leads</label>
          <Search size={16} strokeWidth={1.75} className={styles.searchIcon} aria-hidden="true" />
          <input
            id="leads-search"
            type="search"
            name="search"
            placeholder="Search leads..."
            defaultValue={defaults.search}
            onChange={navigateDebounced}
            className={styles.search}
          />
        </div>
        <Button type="submit" variant="primary" className={styles.submit}>
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          Search
        </Button>
      </div>

      <div className={styles.filtersRow}>
        {services.length ? (
          <div className={styles.selectField}>
            <label htmlFor="leads-service" className="sr-only">Service</label>
            <select id="leads-service" name="service" defaultValue={defaults.service} onChange={navigate} className={styles.select}>
              <option value="">All services</option>
              {services.map((service) => <option key={service.slug} value={service.slug}>{service.name}</option>)}
            </select>
          </div>
        ) : null}

        <div className={styles.selectField}>
          <label htmlFor="leads-source" className="sr-only">Source</label>
          <select id="leads-source" name="source" defaultValue={defaults.source} onChange={navigate} className={styles.select}>
            <option value="">All sources</option>
            {LEAD_SOURCES.map((source) => <option key={source} value={source}>{LEAD_SOURCE_LABEL[source]}</option>)}
          </select>
        </div>

        <div className={styles.dateField}>
          <label htmlFor="leads-date-from" className={styles.dateLabel}>From</label>
          <input id="leads-date-from" type="date" name="dateFrom" defaultValue={defaults.dateFrom} onChange={navigate} className={styles.date} />
        </div>

        <div className={styles.dateField}>
          <label htmlFor="leads-date-to" className={styles.dateLabel}>To</label>
          <input id="leads-date-to" type="date" name="dateTo" defaultValue={defaults.dateTo} onChange={navigate} className={styles.date} />
        </div>

        <div className={styles.selectField}>
          <label htmlFor="leads-sort" className="sr-only">Sort by</label>
          <select id="leads-sort" name="sort" defaultValue={defaults.sort} onChange={navigate} className={styles.select}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="updated">Recently updated</option>
            <option value="name_asc">Name A&ndash;Z</option>
            <option value="name_desc">Name Z&ndash;A</option>
          </select>
        </div>

        {hasActiveFilters ? (
          <Button href="/admin/leads" variant="ghost" className={styles.clear}>
            <X size={14} strokeWidth={1.75} aria-hidden="true" style={{ marginRight: 4, verticalAlign: -2 }} />
            Clear Filters
          </Button>
        ) : null}
      </div>
    </form>
  );
}
