import Link from "next/link";
import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import { averageDailySpend, budgetStatus, daysOfBudgetLeft } from "@/lib/client-budget";
import { BudgetBar } from "@/components/client/BudgetBar";
import { DailySpendChart } from "@/components/client/DailySpendChart";
import { AdminCard } from "./AdminCard";
import styles from "./BudgetSummary.module.css";

const CHIP = { ok: "On track", low: "Running low", full: "Budget used up", none: "No budget set" } as const;

/**
 * The money picture for one client at the top of their Campaigns tab: the total budget, what has been spent, what is left (one bar), the
 * recent daily average and how many days that leaves, and a column chart of the daily spend. With no budget it is a prompt instead,
 * because nothing can be spent until one is set.
 */
export function BudgetSummary({ accountId, currency, totalBudget, amountSpent, points }: { accountId: string; currency: ClientCurrency; totalBudget: number; amountSpent: number; points: { date: string; label: string; spend: number }[] }) {
  const status = budgetStatus(totalBudget, amountSpent);
  const avg = averageDailySpend(points, 7);
  const days = daysOfBudgetLeft(status.remaining, avg);
  return (
    <AdminCard reveal>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Budget</h2>
          <p className={styles.hint}>Each daily expense is taken from the total budget. Spending can&apos;t go past it.</p>
        </div>
        <span className={styles.chip} data-state={status.state}>{CHIP[status.state]}</span>
      </div>

      {status.state === "none" ? (
        <div className={styles.prompt}>
          <p><strong>Set a total budget to start recording daily expenses.</strong>{amountSpent > 0 ? `${formatMoney(amountSpent, currency)} is already recorded for this client without a budget.` : "Daily numbers can't be saved until the client has a budget."}</p>
          <Link href={`/admin/clients/${accountId}/campaigns?view=setup`} className={styles.promptLink}>Set total budget</Link>
        </div>
      ) : (
        <>
          <BudgetBar status={status} currency={currency} />
          <div className={styles.stats}>
            <div className={styles.stat}><span>Total budget</span><b>{formatMoney(status.total, currency)}</b></div>
            <div className={styles.stat}><span>Spent</span><b>{formatMoney(status.spent, currency)}</b><small>{status.percentUsed}% used</small></div>
            <div className={styles.stat}><span>{status.overBy > 0 ? "Over budget" : "Remaining"}</span><b>{formatMoney(status.overBy > 0 ? status.overBy : status.remaining, currency)}</b></div>
            <div className={styles.stat}><span>Daily average</span><b>{avg > 0 ? formatMoney(avg, currency) : "—"}</b><small>{days === null ? "last 7 days" : `≈ ${days} day${days === 1 ? "" : "s"} left`}</small></div>
          </div>
          <h3 className={styles.chartHead}>Daily spend · last {points.length} days</h3>
          <DailySpendChart points={points} currency={currency} />
        </>
      )}
    </AdminCard>
  );
}
