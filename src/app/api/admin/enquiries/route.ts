import { adminApi } from "@/server/api/handler";
import { enquiriesAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
// Read-only (Stage 6, Phase 3): no POST — enquiries are visitor-submitted via /api/contact, never authored here.
// Administrator-only: no editor/publish distinction applies to an immutable submission log.
export const GET = adminApi(enquiriesAdmin.list, { requireRole: "administrator" });
