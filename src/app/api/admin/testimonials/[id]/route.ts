import { adminApi } from "@/server/api/handler";
import { testimonialsAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(testimonialsAdmin.get);
export const PATCH = adminApi(testimonialsAdmin.update);
