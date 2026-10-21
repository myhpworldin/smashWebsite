"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import { generateTemporaryPassword } from "@/lib/generate-password";
import type { ClientService } from "@/lib/client-options";
import { ServicePicker } from "./ServicePicker";
import type { ServiceOptionGroup, PublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";
import styles from "./AdminClients.module.css";

type Created = { account: PublicClientAccount; invite: { requested: boolean; sent: boolean }; temporaryPassword: string };

/** Copies text and flips its label to "Copied" for a moment. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnSmall}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard blocked: the value is on screen to copy by hand.
        }
      }}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** What an administrator sees after creating (or resetting) a login: the details to pass on, and whether the invitation email went out. Shown once; the password is never retrievable afterwards. */
export function CredentialsPanel({ email, password, invite }: { email: string; password: string; invite: { requested: boolean; sent: boolean } }) {
  return (
    <div className={styles.stack}>
      {invite.requested ? (
        invite.sent ? <p className={`${styles.alert} ${styles.alertSuccess}`}>The invitation email was sent to {email}.</p>
        : <p className={`${styles.alert} ${styles.alertWarn}`}>The email could not be sent (check the email settings). Pass the details below on yourself.</p>
      ) : null}
      <div className={styles.credentials}>
        <div className={styles.credRow}><div><div className={styles.credLabel}>Email</div><div className={styles.credValue}>{email}</div></div><CopyButton text={email} label="Copy email" /></div>
        <div className={styles.credRow}><div><div className={styles.credLabel}>Temporary password</div><div className={styles.credValue}>{password}</div></div><CopyButton text={password} label="Copy password" /></div>
      </div>
      <p className={styles.help}>Save these now: the password is not stored and cannot be shown again. The client verifies their email and replaces it on first sign-in.</p>
    </div>
  );
}

/** Creates a client's portal login with a temporary password and (optionally) emails the invitation. */
export function ClientAccountForm({ serviceGroups }: { serviceGroups: ServiceOptionGroup[] }) {
  const ids = { company: useId(), contact: useId(), email: useId(), phone: useId(), password: useId() };
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [chosen, setChosen] = useState<ClientService[]>([]);
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(true);
  const [sendInvite, setSendInvite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Created | null>(null);
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const result = await apiFetch<{ account: PublicClientAccount; invite: { requested: boolean; sent: boolean } }>("/api/admin/client-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, contactName, email, phone, services: chosen, temporaryPassword: password, sendInvite }),
        signal: AbortSignal.timeout(30000),
      });
      if (isApiSuccess(result)) {
        setCreated({ ...result.data, temporaryPassword: password });
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

  if (created) {
    return (
      <div className={styles.stack}>
        <p className={`${styles.alert} ${styles.alertSuccess}`}>Client account created for {created.account.companyName}.</p>
        <CredentialsPanel email={created.account.email} password={created.temporaryPassword} invite={created.invite} />
        <div className={styles.actions}>
          <Link href={`/admin/clients/${created.account.id}`} className={`${styles.btn} ${styles.btnPrimary}`}>Add their dashboard figures</Link>
          <Link href="/admin/clients" className={styles.btn}>Back to clients</Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={styles.stack} aria-label="Create client account">
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label htmlFor={ids.company} className={styles.label}>Company name</label>
          <input id={ids.company} className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} aria-invalid={fields.companyName ? true : undefined} required />
          {fields.companyName ? <p className={styles.fieldError}>{fields.companyName}</p> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor={ids.contact} className={styles.label}>Contact person</label>
          <input id={ids.contact} className={styles.input} value={contactName} onChange={(e) => setContactName(e.target.value)} aria-invalid={fields.contactName ? true : undefined} required />
          {fields.contactName ? <p className={styles.fieldError}>{fields.contactName}</p> : null}
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={ids.email} className={styles.label}>Login email</label>
        <input id={ids.email} type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={fields.email ? true : undefined} autoComplete="off" required />
        {fields.email ? <p className={styles.fieldError}>{fields.email}</p> : <p className={styles.help}>The client verifies this address with a code on first sign-in, so it must be one they can open.</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor={ids.phone} className={styles.label}>Mobile number</label>
        <input id={ids.phone} type="tel" className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={fields.phone ? true : undefined} autoComplete="off" placeholder="+91 98765 43210" required />
        {fields.phone ? <p className={styles.fieldError}>{fields.phone}</p> : <p className={styles.help}>The client&apos;s main contact number, with country code.</p>}
      </div>
      <div className={styles.field}>
        <span className={styles.label} id={`${ids.phone}-services`}>Services chosen by the client</span>
        <ServicePicker groups={serviceGroups} value={chosen} onChange={setChosen} invalid={!!fields.services} />
        {fields.services ? <p className={styles.fieldError}>{fields.services}</p> : null}
      </div>
      <div className={styles.field}>
        <label htmlFor={ids.password} className={styles.label}>Temporary password</label>
        <div className={styles.inline}>
          <input id={ids.password} type={shown ? "text" : "password"} className={`${styles.input} ${styles.mono}`} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={fields.temporaryPassword ? true : undefined} autoComplete="new-password" required />
          <button type="button" className={`${styles.btn}`} onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"}>{shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
          <button type="button" className={styles.btn} onClick={() => { setPassword(generateTemporaryPassword()); setShown(true); }}><KeyRound size={16} aria-hidden="true" />Generate</button>
        </div>
        {fields.temporaryPassword ? <p className={styles.fieldError}>{fields.temporaryPassword}</p> : <p className={styles.help}>At least 8 characters. The client must replace it on first sign-in.</p>}
      </div>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
        <span>Email the login details to the client<small>Sends the portal link, their email and this temporary password.</small></span>
      </label>
      {error ? <p role="alert" className={`${styles.alert} ${styles.alertError}`}>{error}</p> : null}
      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Creating…" : "Create client account"}</button>
        <Link href="/admin/clients" className={styles.btn}>Cancel</Link>
      </div>
    </form>
  );
}
