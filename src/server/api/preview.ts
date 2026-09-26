import "server-only";
import { notFound } from "next/navigation";
import { getEnv } from "@/server/config/env";
import { constantTimeEquals } from "@/server/api/admin-auth";

/**
 * Draft preview (Stage 4, Phase 2 — phase brief §25). Gated by either admin
 * bearer token, passed as `?token=` since a preview link is opened directly
 * in a browser (no custom header). Both roles may preview (Stage 5, Phase 1):
 * previewing a draft is a "View Content" action, not a publish action, so a
 * Content Editor previewing their own unpublished work is exactly the
 * intended use — the editor-vs-administrator line is about who may publish,
 * not who may look. A wrong, missing, or (if the admin API is disabled)
 * unconfigured token calls `notFound()` — identical to an unknown page — so a
 * preview URL never reveals that preview access exists at all, let alone
 * whether a given slug does.
 */
export function requirePreviewAccess(token: string | undefined | null): void {
  const env = getEnv();
  if (!env.ADMIN_API_TOKEN || !token) notFound();
  const ok = constantTimeEquals(token, env.ADMIN_API_TOKEN) || (!!env.CMS_EDITOR_API_TOKEN && constantTimeEquals(token, env.CMS_EDITOR_API_TOKEN));
  if (!ok) notFound();
}
