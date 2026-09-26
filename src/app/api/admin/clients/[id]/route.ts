import { adminApi } from "@/server/api/handler";
import { clientsAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(clientsAdmin.get);
export const PATCH = adminApi(clientsAdmin.update);
