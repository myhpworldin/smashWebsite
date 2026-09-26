import { adminApi } from "@/server/api/handler";
import { caseStudiesAdmin } from "@/server/api/admin.controller";

export const dynamic = "force-dynamic";
export const GET = adminApi(caseStudiesAdmin.list);
export const POST = adminApi(caseStudiesAdmin.create);
