import { adminSessionApi } from "@/server/api/handler";
import { deleteRecordController, updateRecordController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const PUT = adminSessionApi(updateRecordController);
export const DELETE = adminSessionApi(deleteRecordController);
