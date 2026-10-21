import type { Metadata } from "next";
import { getDb } from "@/server/db/client";
import { requireCurrentAdmin } from "@/server/api/admin-session";
import { listServiceOptions } from "@/server/modules/client-accounts/client-accounts.service";
import { effectiveSections } from "@/server/modules/client-accounts/client-workspace.service";
import { AdminCard } from "@/components/admin/AdminCard";
import { ClientAccountActions } from "@/components/admin/ClientAccountActions";
import { ClientProfileEditor } from "@/components/admin/ClientProfileEditor";
import { WorkspaceEditor } from "@/components/admin/workspace/WorkspaceEditor";
import { SectionsToggle } from "@/components/admin/workspace/SectionsToggle";
import { fmtMoment } from "@/components/admin/workspace/format";
import clients from "@/components/admin/AdminClients.module.css";
import { loadAccount, loadWorkspace } from "../data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client profile — SMASH CRM", robots: { index: false, follow: false } };

const when = (value: Date | null) => (value ? value.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—");

/** Profile — who the client is and how they sign in (login, company details, services), plus the account manager, business profile, connected platforms, team, terms and which portal pages they see. */
export default async function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCurrentAdmin();
  const [account, workspace, serviceGroups] = await Promise.all([loadAccount(id), loadWorkspace(id), listServiceOptions(getDb())]);
  const stamps = workspace?.sectionUpdatedAt ?? {};
  const terms = workspace?.terms;
  const termsNote = terms
    ? terms.acceptedVersion === terms.version
      ? `Version ${terms.version} — accepted by ${terms.acceptedBy} on ${fmtMoment(terms.acceptedAt)}.`
      : `Version ${terms.version} — not accepted yet${terms.acceptedVersion ? ` (they accepted version ${terms.acceptedVersion})` : ""}. The client sees an “I accept” button on their Account page.`
    : "No terms set. Once saved, the client is asked to accept them on their Account page.";

  return (
    <div className={clients.stack}>
      <AdminCard reveal>
        <div className={clients.cardHeadRow}><h2 className={clients.cardTitle}>Login</h2></div>
        <dl className={clients.facts} style={{ margin: "var(--space-4) 0" }}>
          <dt>Email</dt><dd>{account.email}{account.emailVerified ? " · verified" : " · not verified yet"}</dd>
          <dt>Mobile</dt><dd>{account.phone ?? "—"}</dd>
          <dt>Services</dt><dd>{account.services.length ? account.services.map((s) => s.title).join(", ") : "—"}</dd>
          <dt>Last sign-in</dt><dd>{when(account.lastLoginAt)}</dd>
          <dt>Last viewed dashboard</dt><dd>{when(account.lastViewedAt)}</dd>
          <dt>Password</dt><dd>{account.mustResetPassword ? "Temporary — the client must choose their own on first sign-in" : `Chosen by the client on ${when(account.passwordChangedAt)}`}</dd>
          <dt>Created</dt><dd>{when(account.createdAt)}{account.createdBy ? ` by ${account.createdBy}` : ""}</dd>
        </dl>
        <ClientAccountActions id={account.id} email={account.email} isActive={account.isActive} />
      </AdminCard>

      <AdminCard reveal delay={1}>
        <h2 className={clients.cardTitle}>Company &amp; services</h2>
        <p className={clients.cardHint}>Company, contact, mobile number and the services {account.companyName} chose.</p>
        <ClientProfileEditor account={account} serviceGroups={serviceGroups} />
      </AdminCard>

      <SectionsToggle accountId={id} enabled={effectiveSections(workspace, account.services)} fromServices={!workspace?.enabledSections} />

      <WorkspaceEditor accountId={id} section="profile" title="Business profile" hint="Their website, what kind of business it is and where it is based." value={workspace?.profile ?? null} updatedAt={stamps.profile} />
      <WorkspaceEditor accountId={id} section="accountManager" title="Assigned account manager" hint="Who the client contacts at SMASH. Shown on their Support page. Clear the name to remove it." value={workspace?.accountManager ?? null} updatedAt={stamps.accountManager} />
      <WorkspaceEditor accountId={id} section="connectedPlatforms" title="Connected platforms" hint="The ad, social and analytics accounts SMASH manages or tracks for them." value={workspace?.connectedPlatforms ?? []} updatedAt={stamps.connectedPlatforms} />
      <WorkspaceEditor accountId={id} section="teamMembers" title="Team members and access" hint="The client's own people and what they should be able to do. A record for now: these people do not get separate logins." value={workspace?.teamMembers ?? []} updatedAt={stamps.teamMembers} />
      <WorkspaceEditor accountId={id} section="terms" title="Terms and conditions" hint="What the client agrees to. They accept it from their Account page; the date and version are recorded." value={workspace?.terms ?? null} updatedAt={stamps.terms} note={termsNote} />
    </div>
  );
}
