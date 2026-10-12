import { adminSessionApi } from "@/server/api/handler";
import { meController } from "@/server/api/crm-auth.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(meController);
