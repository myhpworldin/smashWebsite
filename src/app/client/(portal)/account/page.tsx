import type { Metadata } from "next";
import { BadgeCheck, Eye, ExternalLink } from "lucide-react";
import { requirePortalSection } from "@/server/api/client-portal";
import { ResetPasswordForm } from "@/components/client/ResetPasswordForm";
import { TermsCard } from "@/components/client/TermsCard";
import styles from "@/components/client/Dashboard.module.css";
import portal from "@/components/client/Portal.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account — SMASH Client Portal", robots: { index: false, follow: false } };

const when = (date: Date | null) => (date ? `${date.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })} IST` : "—");

/** Your company profile, connected platforms, team and terms (which you accept here), plus the one thing a client can change about their login: the password. Everything else is managed by SMASH. */
export default async function ClientAccountPage() {
  const { client, workspace } = await requirePortalSection("account");
  const profile = workspace?.profile ?? null;
  const platforms = workspace?.connectedPlatforms ?? [];
  const team = workspace?.teamMembers ?? [];
  const terms = workspace?.terms ?? null;

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageHeadTitle}>Account</h1>
        <p className={styles.pageHeadSub}>Your company profile, access and security.</p>
      </div>
      <div className={portal.stack}>
        <div className={styles.accountGrid}>
          <section className={`${styles.card} ${styles.reveal}`} aria-labelledby="profile-heading">
            <div className={styles.cardHead}><h2 id="profile-heading" className={styles.cardTitle}>Company profile</h2></div>
            <dl className={styles.facts}>
              <div className={styles.fact}><dt>Company</dt><dd>{client.companyName}</dd></div>
              <div className={styles.fact}><dt>Contact person</dt><dd>{client.contactName}</dd></div>
              <div className={styles.fact}><dt>Email</dt><dd>{client.email}</dd></div>
              {client.phone ? <div className={styles.fact}><dt>Mobile</dt><dd>{client.phone}</dd></div> : null}
              {profile?.website ? <div className={styles.fact}><dt>Website</dt><dd><a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--client-blue)", textDecoration: "none" }}>{profile.website.replace(/^https?:\/\//, "")} <ExternalLink size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /></a></dd></div> : null}
              {profile?.businessType ? <div className={styles.fact}><dt>Business type</dt><dd>{profile.businessType}</dd></div> : null}
              {profile?.address ? <div className={styles.fact}><dt>Address</dt><dd style={{ whiteSpace: "pre-line" }}>{profile.address}</dd></div> : null}
              <div className={styles.fact}><dt>Email status</dt><dd><span className={styles.verified}><BadgeCheck size={16} strokeWidth={2} aria-hidden="true" />Verified</span></dd></div>
              <div className={styles.fact}><dt>Last sign-in</dt><dd>{when(client.lastLoginAt)}</dd></div>
              <div className={styles.fact}><dt>Password changed</dt><dd>{when(client.passwordChangedAt)}</dd></div>
            </dl>
            {client.services.length ? (
              <div className={styles.servicesBlock}>
                <h3 className={styles.servicesTitle}>Your services</h3>
                <ul className={styles.serviceList}>{client.services.map((s) => <li key={`${s.categorySlug}::${s.title}`} className={styles.serviceTag}>{s.title}</li>)}</ul>
              </div>
            ) : null}
            {platforms.length ? (
              <div className={styles.servicesBlock}>
                <h3 className={styles.servicesTitle}>Connected platforms</h3>
                <ul className={styles.serviceList}>{platforms.map((p, i) => <li key={`${p.platform}-${i}`} className={styles.serviceTag} title={p.handle ?? undefined}>{p.platform}{p.handle ? ` · ${p.handle}` : ""}</li>)}</ul>
              </div>
            ) : null}
            <p className={styles.viewOnly}><Eye size={16} strokeWidth={1.9} aria-hidden="true" />Your profile is managed by SMASH. To change any detail, contact your account manager.</p>
          </section>

          <section className={`${styles.card} ${styles.reveal}`} style={{ "--d": 1 } as React.CSSProperties} aria-labelledby="password-heading">
            <div className={styles.cardHead}>
              <div>
                <h2 id="password-heading" className={styles.cardTitle}>Change password</h2>
                <p className={styles.cardSub}>Other devices will be signed out.</p>
              </div>
            </div>
            <ResetPasswordForm mode="change" />
          </section>
        </div>

        {team.length ? (
          <section aria-labelledby="team-heading">
            <div className={styles.sectionHead}><h2 id="team-heading" className={styles.sectionTitle}>Team members &amp; access</h2></div>
            <div className={`${styles.card} ${styles.tableCard}`}>
              <table className={styles.table}>
                <thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Contact</th><th scope="col">Access</th></tr></thead>
                <tbody>
                  {team.map((m, i) => (
                    <tr key={m.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                      <td data-label="Name"><span className={styles.campName}>{m.name}</span></td>
                      <td data-label="Role">{m.role ?? "—"}</td>
                      <td data-label="Contact">{[m.email, m.phone].filter(Boolean).join(" · ") || "—"}</td>
                      <td data-label="Access"><span className={portal.followChip}>{m.access}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {terms ? <TermsCard terms={{ version: terms.version, text: terms.text, acceptedAt: terms.acceptedAt, acceptedVersion: terms.acceptedVersion }} /> : null}
      </div>
    </div>
  );
}
