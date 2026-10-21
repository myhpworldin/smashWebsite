import type { CSSProperties } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Megaphone, Wallet } from "lucide-react";
import { CLIENT_LEAD_STATUSES, CLIENT_LEAD_STATUS_LABEL, type ClientLeadStatus } from "@/lib/client-options";
import { attentionTotal, type ClientCard as ClientCardModel } from "@/server/modules/client-accounts/client-portfolio.service";
import { BudgetBar } from "@/components/client/BudgetBar";
import { AdminBadge } from "./AdminBadge";
import { accountStatus } from "./client-status";
import { fmtDay, initialsOf, money } from "@/lib/client-format";
import styles from "./ClientCard.module.css";

/** Same stage colours the CRM pipeline used, so a status reads the same wherever it appears. */
const STATUS_COLOR: Record<ClientLeadStatus, string> = { NEW: "#0058c8", CONTACTED: "#3b82f6", QUALIFIED: "#01124a", CONVERTED: "#0f9d63", LOST: "#e90101" };

/**
 * One client on the admin dashboard: only that client's own leads, campaigns, spend and open items, with a way straight into the pages
 * where they are updated. Money is shown in the client's own currency; nothing on the card is added to another client's.
 */
export function ClientCard({ card, index }: { card: ClientCardModel; index: number }) {
  const { account, data } = card;
  const base = `/admin/clients/${account.id}`;
  const status = accountStatus(account);
  const head = (
    <header className={styles.head}>
      <span className={styles.avatar} aria-hidden="true">{initialsOf(account.companyName)}</span>
      <div className={styles.who}>
        <h3 className={styles.name}><Link href={base} className={styles.nameLink}>{account.companyName}</Link></h3>
        <p className={styles.contact}>{account.contactName}</p>
      </div>
      <AdminBadge label={status.label} tone={status.tone} live={status.label === "Active"} />
    </header>
  );

  if (!data) {
    return (
      <article className={styles.card} style={{ "--i": Math.min(index, 12) } as CSSProperties}>
        {head}
        <p className={styles.error} role="alert"><AlertCircle size={16} strokeWidth={2} aria-hidden="true" />This client&apos;s figures could not be loaded. <Link href={base}>Open the workspace</Link> to check.</p>
      </article>
    );
  }

  const { overview, attention, leadsByStatus, leadLogCount, recentLeads } = data;
  const chips = [
    { n: attention.tickets, label: "ticket", plural: "tickets", tab: "support", verb: "awaiting a reply" },
    { n: attention.invoices, label: "invoice", plural: "invoices", tab: "billing", verb: "overdue" },
    { n: attention.creatives, label: "content item", plural: "content items", tab: "creative", verb: "sent back" },
    { n: attention.daily, label: "daily update", plural: "daily updates", tab: "campaigns", verb: "overdue" },
  ].filter((c) => c.n > 0);
  const budget = overview.budget;
  const budgetChip = budget.state === "none" ? "Total budget not set" : budget.state === "full" ? "Budget used up" : budget.state === "low" ? `Budget ${budget.percentUsed}% used` : null;

  return (
    <article className={styles.card} style={{ "--i": Math.min(index, 12) } as CSSProperties} data-attention={attentionTotal(attention) > 0}>
      {head}

      <section aria-label="Leads" className={styles.block}>
        <div className={styles.blockHead}>
          <h4 className={styles.blockTitle}>Leads</h4>
          <span className={styles.total}><b>{overview.totalLeads}</b> total</span>
        </div>
        {leadLogCount > 0 ? (
          <>
            <div className={styles.strip} role="img" aria-label={CLIENT_LEAD_STATUSES.map((s) => `${leadsByStatus[s]} ${CLIENT_LEAD_STATUS_LABEL[s]}`).join(", ")}>
              {CLIENT_LEAD_STATUSES.filter((s) => leadsByStatus[s] > 0).map((s) => <span key={s} className={styles.seg} style={{ flexGrow: leadsByStatus[s], background: STATUS_COLOR[s] }} />)}
            </div>
            <ul className={styles.counts}>
              {CLIENT_LEAD_STATUSES.map((s) => (
                <li key={s} style={{ "--c": STATUS_COLOR[s] } as CSSProperties}>
                  <Link href={`${base}/leads`} className={styles.count}><span className={styles.swatch} aria-hidden="true" />{CLIENT_LEAD_STATUS_LABEL[s]}<b>{leadsByStatus[s]}</b></Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.muted}>{overview.totalLeads > 0 ? `${overview.totalLeads} reported by campaigns — no individual leads logged yet.` : "No leads logged yet."}</p>
        )}
      </section>

      <dl className={styles.facts}>
        <div><dt><Megaphone size={15} strokeWidth={1.9} aria-hidden="true" />Active campaigns</dt><dd>{overview.activeCampaigns}</dd></div>
        <div><dt><Wallet size={15} strokeWidth={1.9} aria-hidden="true" />Ad spend</dt><dd>{money(overview.totalAdSpend, overview.currency)}</dd></div>
      </dl>

      <section aria-label="Budget" className={styles.block}>
        <h4 className={styles.blockTitle}>Budget</h4>
        {budget.state === "none" ? <p className={styles.muted}>No total budget set, so no spend can be recorded.</p> : <BudgetBar status={budget} currency={overview.currency} small showNote={false} />}
      </section>

      <section aria-label="Needs attention" className={styles.block}>
        <h4 className={styles.blockTitle}>Needs attention</h4>
        {chips.length || budgetChip ? (
          <ul className={styles.chips}>
            {budgetChip ? <li><Link href={`${base}/campaigns${budget.state === "none" ? "?view=setup" : ""}`} className={styles.chip}><AlertCircle size={14} strokeWidth={2} aria-hidden="true" />{budgetChip}</Link></li> : null}
            {chips.map((c) => <li key={c.tab}><Link href={`${base}/${c.tab}`} className={styles.chip}><AlertCircle size={14} strokeWidth={2} aria-hidden="true" />{c.n} {c.n === 1 ? c.label : c.plural} {c.verb}</Link></li>)}
          </ul>
        ) : (
          <p className={styles.muted}>Nothing waiting on SMASH.</p>
        )}
      </section>

      {recentLeads.length ? (
        <section aria-label="Recent leads" className={styles.block}>
          <h4 className={styles.blockTitle}>Recent leads</h4>
          <ul className={styles.recent}>
            {recentLeads.map((l) => (
              <li key={l.id}>
                <Link href={`${base}/leads`} className={styles.lead}>
                  <span className={styles.leadName}>{l.name}<small>{l.source}</small></span>
                  <AdminBadge label={CLIENT_LEAD_STATUS_LABEL[l.status]} tone={l.status === "CONVERTED" ? "success" : l.status === "LOST" ? "danger" : "accent"} />
                  <span className={styles.leadDate}>{fmtDay(l.receivedAt.slice(0, 10))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className={styles.actions}>
        <Link href={base} className={styles.primary}>Open workspace <ArrowRight size={15} strokeWidth={2} aria-hidden="true" /></Link>
        <Link href={`${base}/leads`} className={styles.secondary}>Leads</Link>
        <Link href={`${base}/campaigns`} className={styles.secondary}>Daily update</Link>
      </footer>
    </article>
  );
}
