import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox, SearchX } from "lucide-react";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listLeadsQuerySchema, type ListLeadsQuery } from "@/server/modules/leads/leads.schema";
import { getLeadStatusSummary, listLeads } from "@/server/modules/leads/leads.service";
import { listPublishedServices } from "@/server/modules/services/services.service";
import { DEFAULT_LEAD_PAGE_SIZE } from "@/lib/lead-options";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminCard } from "@/components/admin/AdminCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Stack } from "@/components/ui/Stack";
import { LeadStatusTabs } from "@/components/admin/LeadStatusTabs";
import { LeadsFilterForm } from "@/components/admin/LeadsFilterForm";
import { LeadsPageSizeControl } from "@/components/admin/LeadsPageSizeControl";
import { LeadsTable, type LeadTableRow } from "@/components/admin/LeadsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import styles from "./leads.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leads — SMASH CRM", robots: { index: false, follow: false } };

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Shell (header, status pills, filter form) and the leads list are deliberately two separate async
 * components under one `<Suspense>` boundary around just the list. The shell's own data (the global
 * status summary, the services dropdown) doesn't depend on the current search/filter/sort/page, so it
 * resolves and renders immediately; only `LeadsResults` — the part that actually depends on those
 * params — suspends and shows a table-shaped skeleton while it re-fetches. This is what keeps the
 * header/pills/filter bar visibly mounted and interactive on every filter change instead of the whole
 * route's `loading.tsx` fallback (which still covers first-ever navigation into this route) replacing
 * everything.
 */
export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireCurrentAdmin();
  const raw = await searchParams;
  // Malformed/out-of-range values fall back to the defaults rather than erroring the page — same
  // rule every other listing page in this project follows (/work, /insights); the strict API
  // (`GET /api/admin/leads`) is where an invalid parameter is a real 422.
  const parsed = listLeadsQuerySchema.safeParse({
    page: first(raw.page), limit: first(raw.limit), search: first(raw.search),
    status: first(raw.status), service: first(raw.service), source: first(raw.source),
    sort: first(raw.sort), dateFrom: first(raw.dateFrom), dateTo: first(raw.dateTo),
  });
  const query = parsed.success ? parsed.data : listLeadsQuerySchema.parse({});

  const db = getDb();
  let summary: Awaited<ReturnType<typeof getLeadStatusSummary>> | null = null;
  let serviceOptions: { name: string; slug: string }[] = [];
  try {
    const [summaryRes, servicesRes] = await Promise.all([
      getLeadStatusSummary(db),
      listPublishedServices(db, { page: 1, limit: 50 }),
    ]);
    summary = summaryRes;
    serviceOptions = servicesRes.items.map((s) => ({ name: s.name, slug: s.slug }));
  } catch {
    // Never the underlying error (stack trace, database message) — AdminErrorState's own default copy.
  }

  const hasActiveFilters = !!(query.search || query.status || query.service || query.source || query.dateFrom || query.dateTo || query.sort !== "newest");

  // Every active filter EXCEPT status/page — status is the pill tabs' own concern, carried via a
  // hidden field in the filter form and via `status` directly in each tab's own link; page always
  // resets to 1 whenever any of these are present in a fresh navigation.
  const filterQueryString: Record<string, string> = {};
  if (query.search) filterQueryString.search = query.search;
  if (query.service) filterQueryString.service = query.service;
  if (query.source) filterQueryString.source = query.source;
  if (query.dateFrom) filterQueryString.dateFrom = query.dateFrom;
  if (query.dateTo) filterQueryString.dateTo = query.dateTo;
  if (query.sort !== "newest") filterQueryString.sort = query.sort;
  if (query.limit !== DEFAULT_LEAD_PAGE_SIZE) filterQueryString.limit = String(query.limit);

  return (
    <>
      <AdminPageHeader title={summary ? `Leads (${summary.total} total)` : "Leads"} description="Manage and track incoming business enquiries." />

      <AdminCard className={styles.toolbar}>
        {summary ? (
          <div className={styles.tabsRow}>
            <LeadStatusTabs summary={summary} activeStatus={query.status ?? ""} basePath="/admin/leads" baseQuery={filterQueryString} />
          </div>
        ) : null}

        <LeadsFilterForm
          services={serviceOptions}
          status={query.status ?? ""}
          defaults={{ search: query.search ?? "", service: query.service ?? "", source: query.source ?? "", dateFrom: query.dateFrom ?? "", dateTo: query.dateTo ?? "", sort: query.sort, limit: query.limit }}
          hasActiveFilters={hasActiveFilters}
        />
      </AdminCard>

      <Suspense fallback={<LeadsResultsSkeleton />}>
        <LeadsResults query={query} filterQueryString={filterQueryString} globalTotal={summary?.total ?? null} />
      </Suspense>
    </>
  );
}

function LeadsResultsSkeleton() {
  return (
    <AdminCard>
      <Stack gap={4}>
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height="3.5rem" />)}
      </Stack>
    </AdminCard>
  );
}

async function LeadsResults({ query, filterQueryString, globalTotal }: { query: ListLeadsQuery; filterQueryString: Record<string, string>; globalTotal: number | null }) {
  const db = getDb();
  const admin = await requireCurrentAdmin();
  let leadsResult: Awaited<ReturnType<typeof listLeads>> | null = null;
  let serviceNameBySlug = new Map<string, string>();
  try {
    const [leadsRes, servicesRes] = await Promise.all([
      listLeads(db, query),
      listPublishedServices(db, { page: 1, limit: 50 }),
    ]);
    leadsResult = leadsRes;
    serviceNameBySlug = new Map(servicesRes.items.map((s) => [s.slug, s.name]));
  } catch {
    // Never the underlying error (stack trace, database message) — AdminErrorState's own default copy.
  }

  if (!leadsResult) {
    return <AdminErrorState message="Unable to load leads. Please try again." retryHref="/admin/leads" />;
  }

  const rows: LeadTableRow[] = leadsResult.items.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    location: lead.location,
    companyName: lead.companyName,
    serviceName: lead.primaryService ? (serviceNameBySlug.get(lead.primaryService) ?? lead.primaryService) : null,
    additionalContext: lead.additionalContext,
    status: lead.status,
    source: lead.source,
    assignedTo: lead.assignedTo,
    createdAt: lead.createdAt,
  }));
  const total = leadsResult.total;
  const totalPages = query.limit ? Math.ceil(total / query.limit) : 1;
  const rangeStart = total === 0 ? 0 : (query.page - 1) * query.limit + 1;
  const rangeEnd = total === 0 ? 0 : rangeStart + rows.length - 1;
  // Pagination links additionally need the current status, which the tabs/form above don't carry.
  const paginationQueryString = query.status ? { ...filterQueryString, status: query.status } : filterQueryString;

  if (!rows.length) {
    if (globalTotal === 0) return <EmptyState icon={Inbox} message="No leads yet. When visitors submit the contact form, new enquiries will appear here." />;
    if (query.search) return <EmptyState icon={SearchX} message="No leads found. Try changing your search or filters." />;
    return <EmptyState icon={SearchX} message="No leads match these filters. Clear the filters to see all leads." />;
  }

  return (
    <>
      <LeadsTable leads={rows} currentAdminEmail={admin.email} />
      <Pagination
        page={query.page}
        totalPages={totalPages}
        basePath="/admin/leads"
        query={paginationQueryString}
        rangeLabel={`Showing ${rangeStart}–${rangeEnd} of ${total} lead${total === 1 ? "" : "s"}`}
        extraControl={<LeadsPageSizeControl limit={query.limit} />}
      />
    </>
  );
}
