import { adminSessionApi } from "@/server/api/handler";
import { listLeadsAdminController } from "@/server/api/leads.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(listLeadsAdminController);
