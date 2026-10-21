import { clientSessionApi } from "@/server/api/client-handler";
import { replyToTicketController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(replyToTicketController, { stages: ["ready"], scope: "client-portal" });
