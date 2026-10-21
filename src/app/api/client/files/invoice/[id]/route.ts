import { clientSessionApi } from "@/server/api/client-handler";
import { invoiceDownloadController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const GET = clientSessionApi(invoiceDownloadController, { stages: ["ready"], scope: "client-portal" });
