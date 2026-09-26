import { adminApi } from "@/server/api/handler";
import { servicesAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(servicesAdmin.list);
export const POST = adminApi(servicesAdmin.create);
