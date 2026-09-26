import { adminApi } from "@/server/api/handler";
import { careersAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(careersAdmin.list);
export const POST = adminApi(careersAdmin.create);
