"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import portal from "./Portal.module.css";

/** Asks the server for a short-lived signed link to this invoice's file (only the owner gets one), then opens it. The private file's address is never in the page. */
export function InvoiceDownload({ id, label }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function download() {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const result = await apiFetch<{ url: string }>(`/api/client/files/invoice/${id}`, { signal: AbortSignal.timeout(20000) });
      if (isApiSuccess(result)) window.location.assign(result.data.url); else setError(true);
    } catch { setError(true); }
    setBusy(false);
  }
  return (
    <>
      <button type="button" className={`${portal.btn} ${portal.btnSm}`} onClick={download} disabled={busy} aria-label={`Download invoice ${label}`}><Download size={14} aria-hidden="true" />{busy ? "Preparing…" : "PDF"}</button>
      {error ? <span role="alert" className={portal.errorText} style={{ display: "block", marginTop: 4 }}>Couldn&apos;t get the file.</span> : null}
    </>
  );
}
