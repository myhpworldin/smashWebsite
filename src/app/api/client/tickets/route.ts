import { clientSessionApi } from "@/server/api/client-handler";
import { createTicketController } from "@/server/api/client-records.controller";

export const dynamic = "force-dynamic";
export const POST = clientSessionApi(createTicketController, { stages: ["ready"], scope: "client-portal" });
