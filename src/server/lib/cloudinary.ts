import "server-only";
import { createHash } from "node:crypto";
import type { StoredFile } from "@/lib/client-options";
import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/lib/errors";

/**
 * Cloudinary, without its SDK: the two things the CRM needs are signing a direct browser upload and building a short-lived private
 * download link, and both are a SHA-1 over the sorted parameters plus the API secret. The secret never leaves the server.
 */
export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

export function cloudinaryConfig(): CloudinaryConfig {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = getEnv();
  if (!cloudName || !apiKey || !apiSecret) throw new AppError("INTERNAL_ERROR", 503, "File uploads are not configured on this server yet.");
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary's signature: `k=v` pairs sorted by key and joined with `&`, then the secret appended, SHA-1, hex. Empty values are left out. */
export function signParams(params: Record<string, string | number | undefined | null>, apiSecret: string): string {
  const toSign = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export const UPLOAD_KINDS: Record<UploadKind, { type: "upload" | "authenticated"; formats: string; maxBytes: number }> = {
  /** Invoices are private: stored as `authenticated`, reachable only through a signed link the server hands out after checking ownership. */
  invoice: { type: "authenticated" as const, formats: "pdf,png,jpg,jpeg", maxBytes: 10 * 1024 * 1024 },
  /** Creatives are shown to the client as images and videos, under an unguessable generated public id. */
  creative: { type: "upload" as const, formats: "png,jpg,jpeg,webp,gif,mp4,mov,webm,pdf", maxBytes: 100 * 1024 * 1024 },
} as const;
export type { UploadKind } from "./upload-kinds";
import type { UploadKind } from "./upload-kinds";

export const clientFolder = (accountId: string, kind: UploadKind) => `clients/${accountId}/${kind}s`;

/** Everything the browser needs to POST a file straight to Cloudinary. The signed set is exactly what Cloudinary re-derives, so none of it can be changed by the client. */
export function signUpload(accountId: string, kind: UploadKind, now: Date = new Date()) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const spec = UPLOAD_KINDS[kind];
  const timestamp = Math.floor(now.getTime() / 1000);
  const params = { allowed_formats: spec.formats, folder: clientFolder(accountId, kind), timestamp, type: spec.type };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    apiKey,
    signature: signParams(params, apiSecret),
    fields: params,
    maxBytes: spec.maxBytes,
  };
}

/** A link that works for a few minutes: the private (`authenticated`) file, downloaded through Cloudinary's signed download endpoint. */
export function privateDownloadUrl(file: Pick<StoredFile, "publicId" | "resourceType" | "format" | "type">, opts: { ttlSeconds?: number; now?: Date } = {}): string {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const now = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  const params = { attachment: "true", expires_at: now + (opts.ttlSeconds ?? 300), format: file.format ?? undefined, public_id: file.publicId, timestamp: now, type: file.type };
  const query = new URLSearchParams({ api_key: apiKey, signature: signParams(params, apiSecret) });
  for (const [k, v] of Object.entries(params)) if (v !== undefined) query.set(k, String(v));
  return `https://api.cloudinary.com/v1_1/${cloudName}/${file.resourceType}/download?${query.toString()}`;
}
