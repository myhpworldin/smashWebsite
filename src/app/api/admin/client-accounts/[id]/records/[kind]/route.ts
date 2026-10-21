import { adminSessionApi } from "@/server/api/handler";
import { createRecordController, listRecordsController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const GET = adminSessionApi(listRecordsController);
export const POST = adminSessionApi(createRecordController);
