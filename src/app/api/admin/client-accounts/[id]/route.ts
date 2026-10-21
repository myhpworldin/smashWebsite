import { adminSessionApi } from "@/server/api/handler";
import { getClientAccountController, updateClientAccountController } from "@/server/api/admin-clients.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(getClientAccountController);
export const PATCH = adminSessionApi(updateClientAccountController);
