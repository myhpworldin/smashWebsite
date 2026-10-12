import { publicPost } from "@/server/api/handler";
import { submitLeadController } from "@/server/api/leads.controller";

export const dynamic = "force-dynamic";
export const POST = publicPost(submitLeadController);
