import { adminSessionApi } from "@/server/api/handler";
import { resetClientPasswordController } from "@/server/api/admin-clients.controller";

export const dynamic = "force-dynamic";
export const POST = adminSessionApi(resetClientPasswordController);
