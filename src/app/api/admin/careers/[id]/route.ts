import { adminApi } from "@/server/api/handler";
import { careersAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(careersAdmin.get);
export const PATCH = adminApi(careersAdmin.update);
