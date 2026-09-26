import { adminApi } from "@/server/api/handler";
import { siteSettingsAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
// Site-wide settings have no draft/publish state to gate per-request, so the whole route is
// Administrator-only (Stage 5, Phase 1 — "Manage Settings" is its own permission, §21 of the brief).
export const GET = adminApi(siteSettingsAdmin.get, { requireRole: "administrator" });
export const PATCH = adminApi(siteSettingsAdmin.save, { requireRole: "administrator" });
