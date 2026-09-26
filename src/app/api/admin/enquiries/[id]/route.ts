import { adminApi } from "@/server/api/handler";
import { enquiriesAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
// Read-only (Stage 6, Phase 3): no PATCH/DELETE — a submitted enquiry is an immutable record.
export const GET = adminApi(enquiriesAdmin.get, { requireRole: "administrator" });
