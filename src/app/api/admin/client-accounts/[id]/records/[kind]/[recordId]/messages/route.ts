import { adminSessionApi } from "@/server/api/handler";
import { adminMessageController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const POST = adminSessionApi(adminMessageController);
