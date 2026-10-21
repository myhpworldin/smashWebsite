import { adminSessionApi } from "@/server/api/handler";
import { saveDailyReportController } from "@/server/api/admin-clients.controller";

export const dynamic = "force-dynamic";
export const PUT = adminSessionApi(saveDailyReportController);
