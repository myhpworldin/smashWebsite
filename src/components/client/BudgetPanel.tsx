import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import { budgetStatus } from "@/lib/client-budget";
import type { DashboardInsights } from "@/server/modules/client-accounts/client-dashboard.service";
import { BudgetBar } from "./BudgetBar";
import { CountUp } from "./CountUp";
import { UpdatedChip } from "./Freshness";
import styles from "./Dashboard.module.css";

const dash = "—";

/** Budget used as an animated ring, the three money figures beside it, a spent-against-remaining bar (with a heads-up when it runs low), and the efficiency ratios worked out from them. */
export function BudgetPanel({ currency, totalBudget, amountSpent, insights, updatedAt }: { currency: ClientCurrency; totalBudget: number; amountSpent: number; insights: DashboardInsights; updatedAt: string | null }) {
  const money = (n: number | null) => (n === null ? dash : formatMoney(n, currency));
  const status = budgetStatus(totalBudget, amountSpent);
  return (
    <section className={`${styles.card} ${styles.scrollReveal}`} aria-labelledby="budget-heading">
      <div className={styles.cardHead}>
        <div>
          <h2 id="budget-heading" className={styles.cardTitle}>Budget</h2>
          <p className={styles.cardSub}>How much of your budget is spent</p>
        </div>
        <UpdatedChip updatedAt={updatedAt} />
      </div>
      <div className={styles.ringWrap}>
        <div className={styles.ring} role="img" aria-label={`${insights.budgetUsedPercent}% of the budget is spent`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="budgetGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#0058c8" />
              </linearGradient>
            </defs>
            <circle className={styles.ringTrack} cx="60" cy="60" r="50" pathLength="100" />
            <circle className={styles.ringBar} cx="60" cy="60" r="50" pathLength="100" style={{ "--pct": insights.budgetUsedPercent } as React.CSSProperties} />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.ringPercent}><CountUp value={insights.budgetUsedPercent} kind="percent" /></span>
            <span className={styles.ringCaption}>used</span>
          </div>
        </div>
        <ul className={styles.legend}>
          <li className={styles.legendRow}><span className={styles.legendLabel}><i className={styles.swatch} style={{ "--sw": "var(--client-navy)" } as React.CSSProperties} />Total budget</span><span className={styles.legendValue}>{money(totalBudget)}</span></li>
          <li className={styles.legendRow}><span className={styles.legendLabel}><i className={styles.swatch} style={{ "--sw": "var(--client-blue)" } as React.CSSProperties} />Amount spent</span><span className={styles.legendValue}>{money(amountSpent)}</span></li>
          <li className={styles.legendRow}><span className={styles.legendLabel}><i className={styles.swatch} style={{ "--sw": "var(--client-border-strong)" } as React.CSSProperties} />Remaining</span><span className={styles.legendValue}>{money(insights.remainingBudget)}</span></li>
        </ul>
      </div>
      <div style={{ marginTop: 18 }}>
        {status.state === "none" ? <p className={styles.cardSub}>Your budget hasn&apos;t been set yet. Your SMASH team will add it.</p> : <BudgetBar status={status} currency={currency} />}
      </div>
      <div className={styles.efficiency}>
        <div className={styles.eff}><span className={styles.effLabel}>Cost per lead</span><span className={styles.effValue}>{money(insights.costPerLead === null ? null : Math.round(insights.costPerLead))}</span></div>
        <div className={styles.eff}><span className={styles.effLabel}>Cost per call</span><span className={styles.effValue}>{money(insights.costPerCall === null ? null : Math.round(insights.costPerCall))}</span></div>
        <div className={styles.eff}><span className={styles.effLabel}>Click-through</span><span className={styles.effValue}>{insights.clickThroughRate === null ? dash : `${insights.clickThroughRate.toFixed(1)}%`}</span></div>
      </div>
    </section>
  );
}
