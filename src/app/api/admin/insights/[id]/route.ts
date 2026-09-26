import { adminApi } from "@/server/api/handler";
import { insightsAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(insightsAdmin.get);
export const PATCH = adminApi(insightsAdmin.update);
