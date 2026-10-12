import { adminSessionApi } from "@/server/api/handler";
import { updateLeadController } from "@/server/api/leads.controller";

export const dynamic = "force-dynamic";
export const PATCH = adminSessionApi(updateLeadController);
