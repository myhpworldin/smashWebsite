import { closeDb, getDb } from "@/server/db/client";
import { budgetMoney, budgetStatus } from "@/lib/client-budget";
import { listClientAccounts } from "@/server/modules/client-accounts/client-accounts.service";
import { loadReporting } from "@/server/modules/client-accounts/client-daily.service";

/**
 * Read-only. Lists every client that has no total budget set, or whose spend is past it. Writes are refused for these clients until an
 * administrator sets a proper budget in Campaign setup (nothing is changed here: a budget can't be guessed). Exits 1 when any is found.
 */
async function main() {
  const db = getDb();
  const accounts = await listClientAccounts(db);
  let problems = 0;
  for (const a of accounts) {
    const { dashboard } = await loadReporting(db, a.id);
    if (!dashboard) { console.log(`– ${a.companyName} (${a.email}): nothing published yet`); continue; }
    const s = budgetStatus(dashboard.totalBudget, dashboard.amountSpent);
    const issue = s.state === "none" ? `no total budget set${s.spent > 0 ? `, ${budgetMoney(s.spent, dashboard.currency)} already spent` : ""}` : s.overBy > 0 ? `spend is ${budgetMoney(s.overBy, dashboard.currency)} over the ${budgetMoney(s.total, dashboard.currency)} budget` : null;
    console.log(`${issue ? "✗" : "✓"} ${a.companyName} (${a.email})${issue ? `: ${issue}` : `: ${budgetMoney(s.remaining, dashboard.currency)} left of ${budgetMoney(s.total, dashboard.currency)}`}`);
    if (issue) problems += 1;
  }
  console.log(`\n${accounts.length} client${accounts.length === 1 ? "" : "s"}, ${problems} to fix in Campaign setup`);
  if (problems) process.exitCode = 1;
}

main().then(() => closeDb(), (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
