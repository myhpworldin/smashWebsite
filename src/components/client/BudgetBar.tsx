import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import type { BudgetStatus } from "@/lib/client-budget";
import styles from "./BudgetBar.module.css";

/**
 * Spent against what is left of the total budget, as one bar: blue while healthy, amber from 80% used, red once it is used up (or, in
 * older data, passed). Pure presentation of a `budgetStatus`; the same bar is used in the admin and in the client's portal.
 */
export function BudgetBar({ status, currency, small, showNote = true }: { status: BudgetStatus; currency: ClientCurrency; small?: boolean; showNote?: boolean }) {
  if (status.state === "none") return <p className={styles.legend}>No total budget set yet.</p>;
  const width = Math.min(100, (status.spent / status.total) * 100);
  const label = status.overBy > 0 ? `${formatMoney(status.spent, currency)} spent, ${formatMoney(status.overBy, currency)} over the ${formatMoney(status.total, currency)} budget` : `${formatMoney(status.spent, currency)} spent of ${formatMoney(status.total, currency)}, ${formatMoney(status.remaining, currency)} left`;
  return (
    <div className={`${styles.wrap}${small ? ` ${styles.small}` : ""}`} data-state={status.state}>
      <span className={styles.track} role="img" aria-label={label}><span className={styles.fill} style={{ width: `${width}%` }} /></span>
      <div className={styles.legend}>
        <span><i className={styles.dot} aria-hidden="true" />Spent <b>{formatMoney(status.spent, currency)}</b></span>
        <span><i className={styles.dot} data-kind="remaining" aria-hidden="true" />{status.overBy > 0 ? "Over budget" : "Remaining"} <b>{formatMoney(status.overBy > 0 ? status.overBy : status.remaining, currency)}</b></span>
      </div>
      {showNote && status.state === "low" ? <p className={styles.note}>{status.percentUsed}% of the budget is used.</p> : null}
      {showNote && status.state === "full" ? <p className={styles.note}>{status.overBy > 0 ? "Spending is over the budget." : "The budget is fully used."}</p> : null}
    </div>
  );
}
