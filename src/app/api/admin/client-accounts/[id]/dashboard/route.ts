import { adminSessionApi } from "@/server/api/handler";
import { getClientDashboardController, saveClientDashboardController } from "@/server/api/admin-clients.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(getClientDashboardController);
export const PUT = adminSessionApi(saveClientDashboardController);
