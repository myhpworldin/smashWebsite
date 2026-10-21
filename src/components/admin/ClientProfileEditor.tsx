"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import type { ClientService } from "@/lib/client-options";
import type { PublicClientAccount, ServiceOptionGroup } from "@/server/modules/client-accounts/client-accounts.service";
import { ServicePicker } from "./ServicePicker";
import styles from "./AdminClients.module.css";

/** Edits a client's company, contact, mobile number and chosen services (the email is the login and is not editable here). */
export function ClientProfileEditor({ account, serviceGroups }: { account: Pick<PublicClientAccount, "id" | "companyName" | "contactName" | "phone" | "services">; serviceGroups: ServiceOptionGroup[] }) {
  const router = useRouter();
  const ids = { company: useId(), contact: useId(), phone: useId() };
  const [companyName, setCompanyName] = useState(account.companyName);
  const [contactName, setContactName] = useState(account.contactName);
  const [phone, setPhone] = useState(account.phone ?? "");
  const [chosen, setChosen] = useState<ClientService[]>(account.services);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    setSaved(false);
    try {
      const result = await apiFetch(`/api/admin/client-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactName, phone, services: chosen }),
        signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) {
        setSaved(true);
        router.refresh();
      } else {
        if (result.error.fields) setFields(result.error.fields);
        setError(result.error.fields ? "Please fix the highlighted fields." : result.message);
      }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.stack} aria-label="Client details">
      <div className={styles.grid3}>
        <div className={styles.field}>
          <label htmlFor={ids.company} className={styles.label}>Company name</label>
          <input id={ids.company} className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} aria-invalid={fields.companyName ? true : undefined} />
          {fields.companyName ? <p className={styles.fieldError}>{fields.companyName}</p> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={ids.contact} className={styles.label}>Contact person</label>
          <input id={ids.contact} className={styles.input} value={contactName} onChange={(e) => setContactName(e.target.value)} aria-invalid={fields.contactName ? true : undefined} />
          {fields.contactName ? <p className={styles.fieldError}>{fields.contactName}</p> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={ids.phone} className={styles.label}>Mobile number</label>
          <input id={ids.phone} type="tel" className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={fields.phone ? true : undefined} placeholder="+91 98765 43210" />
          {fields.phone ? <p className={styles.fieldError}>{fields.phone}</p> : null}
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Services chosen by the client</span>
        <ServicePicker groups={serviceGroups} value={chosen} onChange={setChosen} invalid={!!fields.services} />
        {fields.services ? <p className={styles.fieldError}>{fields.services}</p> : null}
      </div>
      {error ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{error}</p> : null}
      {saved ? <p role="status" className={`${styles.alert} ${styles.alertSuccess}`}>Details saved.</p> : null}
      <div className={styles.actions}><button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Saving…" : "Save details"}</button></div>
    </form>
  );
}
