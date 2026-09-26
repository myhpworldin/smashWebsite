import { adminApi } from "@/server/api/handler";
import { caseStudiesAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(caseStudiesAdmin.get);
export const PATCH = adminApi(caseStudiesAdmin.update);
