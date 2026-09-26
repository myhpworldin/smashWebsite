import { adminApi } from "@/server/api/handler";
import { teamAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(teamAdmin.list);
export const POST = adminApi(teamAdmin.create);
