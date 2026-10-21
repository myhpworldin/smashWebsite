"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, FileSignature } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { fmtMoment } from "@/lib/client-format";
import styles from "./Dashboard.module.css";
import portal from "./Portal.module.css";

/** The terms and conditions the client agreed to (or still has to): the full text, and an "I accept" that records who, when and which version. */
export function TermsCard({ terms }: { terms: { version: number; text: string; acceptedAt: string | null; acceptedVersion: number | null } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepted = terms.acceptedVersion === terms.version;

  async function accept() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await apiFetch("/api/client/terms/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(20000) });
      if (isApiSuccess(result)) router.refresh(); else setError(result.message);
    } catch { setError("We couldn't reach the server. Please try again."); }
    setBusy(false);
  }

  return (
    <section className={`${styles.card} ${styles.reveal}`} aria-labelledby="terms-heading">
      <div className={styles.cardHead}>
        <div><h2 id="terms-heading" className={styles.cardTitle}>Terms and conditions</h2><p className={styles.cardSub}>Version {terms.version}</p></div>
      </div>
      <p className={portal.terms} tabIndex={0} aria-label="Terms and conditions text">{terms.text}</p>
      <div style={{ marginTop: 16 }}>
        {accepted ? (
          <p className={portal.accepted}><BadgeCheck size={18} aria-hidden="true" />You accepted these terms on {fmtMoment(terms.acceptedAt)}.</p>
        ) : (
          <>
            {terms.acceptedVersion ? <p className={portal.lead} style={{ margin: "0 0 12px" }}>These terms were updated since you last accepted. Please review and accept again.</p> : null}
            <button type="button" className={`${portal.btn} ${portal.btnPrimary}`} onClick={accept} disabled={busy}><FileSignature size={16} aria-hidden="true" />{busy ? "Saving…" : "I accept these terms"}</button>
          </>
        )}
        {error ? <p role="alert" className={portal.errorText} style={{ marginTop: 10 }}>{error}</p> : null}
      </div>
    </section>
  );
}
