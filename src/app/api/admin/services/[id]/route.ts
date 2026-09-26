import { adminApi } from "@/server/api/handler";
import { servicesAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(servicesAdmin.get);
export const PATCH = adminApi(servicesAdmin.update);
