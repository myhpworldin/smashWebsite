"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { ALWAYS_ON_SECTIONS, PORTAL_SECTIONS, PORTAL_SECTION_LABEL, type PortalSection } from "@/lib/client-options";
import { AdminButton } from "../AdminButton";
import { AdminCard } from "../AdminCard";
import clients from "../AdminClients.module.css";
import styles from "./Workspace.module.css";

const DESCRIPTION: Record<PortalSection, string> = {
  overview: "The dashboard overview", projects: "Projects and their status", campaigns: "Campaign reports and charts", content: "Content approval and calendar",
  leads: "Lead log and follow-ups", billing: "Plan, invoices and payments", support: "Tickets, meetings, notifications", account: "Profile, platforms, team, terms",
};

/** Which pages the client sees in their portal. The ones every client needs are locked on; the rest start from the services chosen and can be switched either way. */
export function SectionsToggle({ accountId, enabled, fromServices }: { accountId: string; enabled: PortalSection[]; fromServices: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState<Set<PortalSection>>(new Set(enabled));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null); setSaved(false);
    try {
      const result = await apiFetch(`/api/admin/client-accounts/${accountId}/workspace`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "enabledSections", value: [...on] }), signal: AbortSignal.timeout(30000) });
      if (isApiSuccess(result)) { setSaved(true); router.refresh(); } else setError(result.message);
    } catch { setError("We couldn't reach the server. Please try again."); }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <AdminCard reveal>
      <h2 className={clients.cardTitle}>Portal pages</h2>
      <p className={clients.cardHint}>{fromServices ? "Chosen automatically from the services this client signed up for. " : ""}Switch a page off to hide it from their portal.</p>
      <div className={styles.toggleGrid}>
        {PORTAL_SECTIONS.map((s) => {
          const locked = ALWAYS_ON_SECTIONS.includes(s);
          return (
            <label key={s} className={styles.toggle} data-on={on.has(s)} data-locked={locked}>
              <input type="checkbox" checked={on.has(s)} disabled={locked} onChange={() => { setSaved(false); setOn((cur) => { const next = new Set(cur); if (next.has(s)) next.delete(s); else next.add(s); return next; }); }} />
              <span>{PORTAL_SECTION_LABEL[s]}<small>{DESCRIPTION[s]}</small></span>
              {locked ? <Lock size={13} aria-label="Always on" style={{ marginLeft: "auto", opacity: 0.5 }} /> : null}
            </label>
          );
        })}
      </div>
      {error ? <p role="alert" className={`${clients.alert} ${clients.alertError}`}>{error}</p> : null}
      <div className={styles.saveRow}>
        <AdminButton size="sm" loading={busy} onClick={save}>Save pages</AdminButton>
        {saved ? <span className={styles.savedNote} role="status">Saved.</span> : null}
      </div>
    </AdminCard>
  );
}
