import { adminSessionApi } from "@/server/api/handler";
import { addLeadNoteController } from "@/server/api/leads.controller";

export const dynamic = "force-dynamic";
export const POST = adminSessionApi(addLeadNoteController);
