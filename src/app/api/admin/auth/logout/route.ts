import { adminSessionApi } from "@/server/api/handler";
import { logoutController } from "@/server/api/crm-auth.controller";

export const dynamic = "force-dynamic";
export const POST = adminSessionApi(logoutController);
