/**
 * Calendar helpers shared by the server (the overview rollup) and the browser (the admin tables), kept free of server-only code. "Today" is
 * the day in India, the team's and the clients' day, so "due today" and "overdue" mean the same in both places.
 */
export const istDay = (d: Date): string => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const addDays = (key: string, days: number): string => new Date(new Date(`${key}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

/** An unpaid invoice past its due date is overdue whatever status was typed, so nobody has to remember to flip it. */
export const effectiveInvoiceStatus = (inv: { status: string; dueDate: string }, today: string): string =>
  inv.status === "PAID" ? "PAID" : inv.dueDate < today ? "OVERDUE" : inv.status;
