import { AdminCard } from "@/components/admin/AdminCard";
import styles from "./AdminStatCard.module.css";

/**
 * A single summary metric. `value` is deliberately a string, not a number: there is no Leads-count
 * API yet (Phase 5/7), so every current caller passes `"—"` rather than a fabricated figure (Phase 4
 * brief, Step 11/12 — "do not display fake metrics"). Once that API exists, a caller passes the real
 * count and nothing about this component needs to change.
 */
export function AdminStatCard({ label, value }: { label: string; value: string }) {
  return (
    <AdminCard className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-empty={value === "—" || undefined}>{value}</span>
    </AdminCard>
  );
}
