import { adminSessionApi } from "@/server/api/handler";
import { createClientAccountController, listClientAccountsController } from "@/server/api/admin-clients.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(listClientAccountsController);
export const POST = adminSessionApi(createClientAccountController);
