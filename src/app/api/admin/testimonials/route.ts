import { adminApi } from "@/server/api/handler";
import { testimonialsAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(testimonialsAdmin.list);
export const POST = adminApi(testimonialsAdmin.create);
