import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { CalendarClock, CreditCard, Receipt } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { listClientView } from "@/server/modules/client-accounts/client-records.service";
import { effectiveInvoiceStatus, istDay } from "@/lib/client-dates";
import { INVOICE_STATUS_LABEL, formatMoney } from "@/lib/client-options";
import { fmtDay } from "@/lib/client-format";
import { InvoiceDownload } from "@/components/client/InvoiceDownload";
import { StatusPill, type PillTone } from "@/components/client/StatusPill";
import styles from "@/components/client/Dashboard.module.css";
import portal from "@/components/client/Portal.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing — SMASH Client Portal", robots: { index: false, follow: false } };

type Invoice = { id: string; number: string; period: string | null; issueDate: string; dueDate: string; agencyFee: number; adSpend: number; total: number; amountPaid: number; status: string; paidAt: string | null; hasFile: boolean };
const TONE: Record<string, PillTone> = { PENDING: "warn", PARTIAL: "info", PAID: "ok", OVERDUE: "bad" };

/** The client's plan and fees, how their money splits between SMASH's fee and ad spend, and every invoice with its status and a private download. Read-only. */
export default async function ClientBillingPage() {
  const { client, db, workspace } = await requirePortalSection("billing");
  const invoices = (await listClientView(db, "invoices", client.id)) as unknown as Invoice[];
  const plan = workspace?.billingPlan ?? null;
  const currency = plan?.currency ?? "INR";
  const today = istDay(new Date());
  const billed = invoices.reduce((s, i) => s + i.total, 0);
  const paid = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const fees = invoices.reduce((s, i) => s + i.agencyFee, 0);
  const spend = invoices.reduce((s, i) => s + i.adSpend, 0);
  const next = plan?.nextDueDate ?? invoices.filter((i) => i.status !== "PAID").map((i) => i.dueDate).sort()[0] ?? null;
  // The split shown is the plan's per-cycle fee against its ad budget; with no plan it is what the invoices actually add up to.
  const feePart = plan ? plan.monthlyFee : fees, spendPart = plan ? plan.adSpendBudget : spend;
  const sum = feePart + spendPart;

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageHeadTitle}>Billing &amp; invoices</h1>
        <p className={styles.pageHeadSub}>Your service package, what you pay SMASH and what goes into advertising.</p>
      </div>

      {plan || invoices.length ? (
        <div className={portal.stack}>
          {plan ? (
            <section className={portal.plan} aria-labelledby="plan-heading">
              <div>
                <p className={portal.planEyebrow}>Your package</p>
                <h2 id="plan-heading" className={portal.planName}>{plan.packageName}</h2>
                <p className={portal.planFee}>{formatMoney(plan.monthlyFee, plan.currency)} <small>agency fee, {plan.cycle.toLowerCase()}</small></p>
                {next ? <span className={portal.planDue}><CalendarClock size={16} aria-hidden="true" />Next payment due {fmtDay(next)}</span> : null}
              </div>
              {sum > 0 ? (
                <div className={portal.splitBox}>
                  <p className={portal.planEyebrow} style={{ margin: 0 }}>Where your money goes</p>
                  <div className={portal.splitBar} role="img" aria-label={`Agency fee ${Math.round((feePart / sum) * 100)} percent, ad spend ${Math.round((spendPart / sum) * 100)} percent`}>
                    <span style={{ flexGrow: feePart, background: "#ff6b6b", minWidth: feePart ? 6 : 0 }} />
                    <span style={{ flexGrow: spendPart, background: "#58a6ff", minWidth: spendPart ? 6 : 0 }} />
                  </div>
                  <div className={portal.splitLegend}>
                    <span><span><i style={{ "--sw": "#ff6b6b" } as CSSProperties} />Agency fee</span><b>{formatMoney(feePart, plan.currency)}</b></span>
                    <span><span><i style={{ "--sw": "#58a6ff" } as CSSProperties} />Ad spend budget</span><b>{formatMoney(spendPart, plan.currency)}</b></span>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {invoices.length ? (
            <>
              <div className={`${styles.totals} ${styles.reveal}`} style={{ "--d": 1 } as CSSProperties}>
                <div className={styles.total}><span className={styles.totalLabel}>Total billed</span><span className={styles.totalValue}>{formatMoney(billed, currency)}</span></div>
                <div className={styles.total}><span className={styles.totalLabel}>Paid</span><span className={styles.totalValue}>{formatMoney(paid, currency)}</span></div>
                <div className={styles.total}><span className={styles.totalLabel}>Outstanding</span><span className={styles.totalValue}>{formatMoney(Math.max(0, billed - paid), currency)}</span></div>
                <div className={styles.total}><span className={styles.totalLabel}>Agency fee vs ad spend</span><span className={styles.totalValue}>{formatMoney(fees, currency)} / {formatMoney(spend, currency)}</span></div>
              </div>
              <section aria-labelledby="inv-heading">
                <div className={styles.sectionHead}><h2 id="inv-heading" className={styles.sectionTitle}>Invoice history</h2></div>
                <div className={`${styles.card} ${styles.tableCard}`}>
                  <table className={styles.table}>
                    <thead><tr><th scope="col">Invoice</th><th scope="col">Issued</th><th scope="col">Due</th><th scope="col" className={styles.num}>Agency fee</th><th scope="col" className={styles.num}>Ad spend</th><th scope="col" className={styles.num}>Total</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Download</span></th></tr></thead>
                    <tbody>
                      {invoices.map((inv, i) => {
                        const status = effectiveInvoiceStatus(inv, today);
                        return (
                          <tr key={inv.id} style={{ "--i": Math.min(i, 12) } as CSSProperties}>
                            <td data-label="Invoice"><span className={styles.campName}>{inv.number}</span><span className={styles.campPlatform}>{inv.period ?? ""}</span></td>
                            <td data-label="Issued" className={portal.nowrap}>{fmtDay(inv.issueDate)}</td>
                            <td data-label="Due" className={portal.nowrap}>{fmtDay(inv.dueDate)}</td>
                            <td data-label="Agency fee" className={styles.num}>{formatMoney(inv.agencyFee, currency)}</td>
                            <td data-label="Ad spend" className={styles.num}>{formatMoney(inv.adSpend, currency)}</td>
                            <td data-label="Total" className={styles.num}><strong>{formatMoney(inv.total, currency)}</strong></td>
                            <td data-label="Status"><StatusPill label={INVOICE_STATUS_LABEL[status as keyof typeof INVOICE_STATUS_LABEL]} tone={TONE[status]} live={status === "OVERDUE"} /></td>
                            <td data-label="Invoice file">{inv.hasFile ? <InvoiceDownload id={inv.id} label={inv.number} /> : <span className={portal.muted}>—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className={`${styles.empty} ${styles.reveal}`}>
              <span className={styles.emptyIcon}><Receipt size={30} strokeWidth={1.7} aria-hidden="true" /></span>
              <h2 className={styles.emptyTitle}>No invoices yet</h2>
              <p className={styles.emptyText}>Your invoices will be listed here, with their payment status, as they are issued.</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`${styles.empty} ${styles.reveal}`}>
          <span className={styles.emptyIcon}><CreditCard size={30} strokeWidth={1.7} aria-hidden="true" /></span>
          <h2 className={styles.emptyTitle}>Your billing details are coming</h2>
          <p className={styles.emptyText}>Your package, fees and invoices will appear here once your account team sets them up.</p>
        </div>
      )}
    </div>
  );
}
