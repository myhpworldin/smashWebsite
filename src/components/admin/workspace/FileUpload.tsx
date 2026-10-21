"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileText, Film, Image as ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { apiFetch, isApiSuccess } from "@/lib/api-client";
import type { StoredFile } from "@/lib/client-options";
import type { UploadKind } from "@/server/lib/upload-kinds";
import styles from "./Workspace.module.css";

type Signed = { uploadUrl: string; apiKey: string; signature: string; fields: Record<string, string | number>; maxBytes: number };

const sizeText = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/**
 * Uploads one file straight from the browser to Cloudinary using a signature the server issues for this client's folder: the file
 * never passes through our server, and the secret never reaches the browser. Shows progress, validates size and type before sending, and
 * hands the stored reference (public id, URL, size…) to the form. Images and videos preview; private files (invoices) show an icon.
 */
export function FileUpload({ accountId, kind, value, onChange, error }: { accountId: string; kind: UploadKind; value: StoredFile | null; onChange: (file: StoredFile | null) => void; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const busy = progress !== null;

  async function upload(file: File) {
    setProblem(null);
    setProgress(0);
    try {
      const signed = await apiFetch<Signed>("/api/admin/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, kind }), signal: AbortSignal.timeout(20000) });
      if (!isApiSuccess(signed)) throw new Error(signed.message);
      const { uploadUrl, apiKey, signature, fields, maxBytes } = signed.data;
      const allowed = String(fields.allowed_formats).split(",");
      if (!allowed.includes(extension(file.name))) throw new Error(`That file type is not allowed. Use ${allowed.join(", ").toUpperCase()}.`);
      if (file.size > maxBytes) throw new Error(`That file is too large (${sizeText(maxBytes)} at most).`);

      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
      form.append("api_key", apiKey);
      form.append("signature", signature);
      form.append("file", file);

      const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = new XMLHttpRequest();
        xhr.current = req;
        req.open("POST", uploadUrl);
        req.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        req.onload = () => {
          try {
            const json = JSON.parse(req.responseText) as Record<string, unknown>;
            if (req.status >= 200 && req.status < 300) resolve(json);
            else if (req.status === 401 || req.status === 403) reject(new Error("The file service refused the upload: the Cloudinary API key on the server does not have permission to upload. Ask the developer to use a key with upload access."));
            else reject(new Error((json.error as { message?: string } | undefined)?.message ?? "The upload was refused."));
          } catch { reject(new Error("The upload failed. Please try again.")); }
        };
        req.onerror = () => reject(new Error("The upload could not reach the file server. Check your connection and try again."));
        req.onabort = () => reject(new Error("cancelled"));
        req.send(form);
      });
      onChange({
        publicId: String(result.public_id), url: String(result.secure_url), resourceType: result.resource_type as StoredFile["resourceType"],
        format: typeof result.format === "string" ? result.format : extension(file.name) || null, bytes: Number(result.bytes) || file.size,
        type: (result.type === "authenticated" ? "authenticated" : "upload"), name: file.name.slice(0, 200),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "The upload failed.";
      if (message !== "cancelled") setProblem(message);
    } finally {
      xhr.current = null;
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  const pick = (files: FileList | null) => { const f = files?.[0]; if (f && !busy) void upload(f); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); };
  const Icon = value?.resourceType === "video" ? Film : value?.resourceType === "image" && value.format !== "pdf" ? ImageIcon : FileText;
  const previewable = value && value.type === "upload" && value.resourceType === "image" && value.format !== "pdf";

  return (
    <div className={styles.upload}>
      <input ref={input} type="file" hidden onChange={(e) => pick(e.target.files)} aria-label="Choose a file" />
      {value && !busy ? (
        <div className={styles.uploaded}>
          {previewable ? (
            // eslint-disable-next-line @next/next/no-img-element -- a Cloudinary delivery URL; optimising it again would add nothing
            <img src={value.url} alt="" className={styles.thumb} />
          ) : (
            <span className={styles.fileIcon}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
          )}
          <span className={styles.fileMeta}>
            <strong>{value.name}</strong>
            <span>{sizeText(value.bytes)} · {value.type === "authenticated" ? "private" : value.resourceType}</span>
          </span>
          <button type="button" className={styles.linkBtn} onClick={() => input.current?.click()}>Replace</button>
          <button type="button" className={styles.iconBtnSm} onClick={() => onChange(null)} aria-label="Remove file"><Trash2 size={15} aria-hidden="true" /></button>
        </div>
      ) : (
        <div
          className={`${styles.drop}${over ? ` ${styles.dropOver}` : ""}${busy ? ` ${styles.dropBusy}` : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
          role="button" tabIndex={0} aria-label="Upload a file"
          onClick={() => !busy && input.current?.click()} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !busy) { e.preventDefault(); input.current?.click(); } }}
        >
          {busy ? <Loader2 size={22} className={styles.spin} aria-hidden="true" /> : <UploadCloud size={22} strokeWidth={1.7} aria-hidden="true" />}
          <span>{busy ? `Uploading… ${progress}%` : "Drop a file here, or click to choose"}</span>
          {busy ? (
            <>
              <span className={styles.progress}><span style={{ width: `${progress}%` }} /></span>
              <button type="button" className={styles.linkBtn} onClick={(e) => { e.stopPropagation(); xhr.current?.abort(); }}>Cancel</button>
            </>
          ) : <small>{kind === "invoice" ? "PDF or image, up to 10 MB · stored privately" : "Image, video or PDF, up to 100 MB"}</small>}
        </div>
      )}
      {problem || error ? <p className={styles.uploadError} role="alert">{problem ?? error}</p> : null}
    </div>
  );
}
